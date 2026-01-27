type QuoteInput = {
  postalCode: string;
  province: string;
  weight: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
};

export type ShippingOption = {
  type: 'domicilio' | 'sucursal';
  price: number;
  estimated_days: number | null;
  meta?: Record<string, unknown>;
};

type QuoteResponse = {
  provider: 'correo_argentino';
  options: ShippingOption[];
};

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeType(rawType?: unknown): 'domicilio' | 'sucursal' {
  const text = String(rawType ?? '').toLowerCase();
  if (text.includes('sucursal') || text.includes('retiro')) {
    return 'sucursal';
  }
  return 'domicilio';
}

function normalizeOptions(raw: unknown): ShippingOption[] {
  const data = raw as Record<string, unknown> | null | undefined;
  if (!data) {
    return [];
  }

  const listCandidates = [
    data.options,
    data.tarifas,
    data.servicios,
    data.services,
    data.rates,
  ];

  const list = listCandidates.find(Array.isArray) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!list) {
    return [];
  }

  return list
    .map((item) => {
      const price =
        parseNumber(item.price) ??
        parseNumber(item.amount) ??
        parseNumber(item.valor) ??
        parseNumber(item.costo) ??
        parseNumber(item.tarifa);
      const estimated =
        parseNumber(item.estimated_days) ??
        parseNumber(item.days) ??
        parseNumber(item.plazo) ??
        parseNumber(item.delivery_days);

      if (price === null) {
        return null;
      }

      return {
        type: normalizeType(
          item.type ?? item.modalidad ?? item.tipo ?? item.service ?? item.producto,
        ),
        price,
        estimated_days: estimated ?? null,
        meta: item,
      } satisfies ShippingOption;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export class CorreoArgentinoService {
  private getBaseUrl() {
    const baseUrl = process.env.CA_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('CA_API_BASE_URL is not configured');
    }
    return baseUrl;
  }

  private buildAuthHeaders() {
    const headers: Record<string, string> = {};

    const apiKey = process.env.CA_API_KEY;
    const agreement = process.env.CA_AGREEMENT;
    const user = process.env.CA_API_USER;
    const password = process.env.CA_API_PASSWORD;

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    if (agreement) {
      headers['x-agreement'] = agreement;
    }

    if (user && password) {
      const token = Buffer.from(`${user}:${password}`).toString('base64');
      headers.Authorization = `Basic ${token}`;
    }

    return headers;
  }

  private async caRequest<T>(path: string, options: RequestInit): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = new URL(path, baseUrl).toString();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.buildAuthHeaders(),
        ...(options.headers ?? {}),
      },
    });

    const text = await response.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch (_error) {
      data = {} as T;
    }

    if (!response.ok) {
      const message =
        (data as { message?: string; error?: string })?.message ??
        (data as { message?: string; error?: string })?.error ??
        'Correo Argentino request failed';
      const error = new Error(message) as Error & {
        status?: number;
        data?: unknown;
      };
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async quoteShipment(input: QuoteInput): Promise<QuoteResponse> {
    const payload = {
      postalCode: input.postalCode,
      province: input.province,
      weight: input.weight,
      dimensions: input.dimensions,
    };

    const raw = await this.caRequest<Record<string, unknown>>('/cotizar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const options = normalizeOptions(raw);
    if (options.length === 0) {
      return {
        provider: 'correo_argentino',
        options: [],
      };
    }

    return {
      provider: 'correo_argentino',
      options,
    };
  }
}
