import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuoteRequestDto } from '../dtos/quote-request.dto';
import { QuoteOptionDto } from '../dtos/quote-option.dto';
import { normalizeEnvioPackQuoteOptions } from '../normalizers/envio-pack.normalizer';
import { DeliveryType } from '../shipping.types';
import { EnvioPackProvince, EnvioPackQuoteItem } from '../types/envio-pack.types';

type TokenCache = {
  token: string;
  expiresAt: number;
};

type CachedProvince = {
  id: string;
  expiresAt: number;
};

@Injectable()
export class EnvioPackService {
  private tokenCache?: TokenCache;
  private tokenPromise?: Promise<string>;
  private provincesCache?: { data: EnvioPackProvince[]; expiresAt: number };
  private postalCodeCache = new Map<string, CachedProvince>();

  constructor(private readonly configService: ConfigService) {}

  async quoteShipment(input: QuoteRequestDto): Promise<QuoteOptionDto[]> {
    this.assertConfig();

    const provinceId = await this.resolveProvinceId(
      input.destinationPostalCode,
    );
    const deliveryType = input.deliveryType ?? DeliveryType.ANY;
    const paquetes = `${input.dimensionsCm.height}x${input.dimensionsCm.width}x${input.dimensionsCm.length}`;

    const params: Record<string, string | number> = {
      provincia: provinceId,
      codigo_postal: input.destinationPostalCode,
      peso: input.weightKg,
      paquetes,
    };

    if (typeof input.declaredValue === 'number') {
      params.valor_declarado = input.declaredValue;
    }

    const raw = await this.envioPackRequest<EnvioPackQuoteItem[]>(
      '/cotizar/costo',
      params,
    );

    const includeRaw = this.isDebug();
    let options = normalizeEnvioPackQuoteOptions(raw, { debug: includeRaw });

    if (deliveryType !== DeliveryType.ANY) {
      options = options.filter(
        (option) => option.deliveryType === deliveryType,
      );
    }

    return options;
  }

  async checkHealth(): Promise<{ ok: boolean; auth: boolean }> {
    this.assertConfig();
    try {
      await this.getAccessToken(true);
      return { ok: true, auth: true };
    } catch (_error) {
      return { ok: false, auth: false };
    }
  }

  private getBaseUrl(): string {
    return this.readString('ENVIOPACK_BASE_URL') ?? 'https://api.enviopack.com';
  }

  private isDebug(): boolean {
    return this.readString('SHIPPING_DEBUG') === 'true';
  }

  private readString(key: string): string | undefined {
    const value = this.configService.get<string | Uint8Array>(key);
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString();
    }
    return undefined;
  }

  private assertConfig() {
    const required = [
      'ENVIOPACK_API_KEY',
      'ENVIOPACK_SECRET_KEY',
      'ENVIOPACK_ORIGIN_POSTAL_CODE',
    ];
    const missing = required.filter((key) => !this.readString(key));

    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Missing EnvioPack env vars: ${missing.join(', ')}`,
      );
    }
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.tokenCache) {
      const stillValid = this.tokenCache.expiresAt - Date.now() > 30_000;
      if (stillValid) {
        return this.tokenCache.token;
      }
    }

    if (!forceRefresh && this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.authenticate().finally(() => {
      this.tokenPromise = undefined;
    });

    return this.tokenPromise;
  }

  private async authenticate(): Promise<string> {
    const apiKey = this.readString('ENVIOPACK_API_KEY');
    const secretKey = this.readString('ENVIOPACK_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new ServiceUnavailableException('EnvioPack credentials missing');
    }

    const url = new URL('/auth', this.getBaseUrl()).toString();
    const body = new URLSearchParams({
      'api-key': apiKey,
      'secret-key': secretKey,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `EnvioPack auth request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const data = await this.parseJson(response);
    if (!response.ok) {
      const message =
        (data as { error?: string; message?: string })?.error ??
        (data as { error?: string; message?: string })?.message ??
        'EnvioPack auth failed';
      throw new BadGatewayException(message);
    }

    const token =
      (data as { access_token?: string })?.access_token ??
      (data as { token?: string })?.token;

    if (!token) {
      throw new ServiceUnavailableException('EnvioPack token missing in response');
    }

    const expiresAt = this.resolveTokenExpiry(token, data);
    this.tokenCache = { token, expiresAt };

    return token;
  }

  private resolveTokenExpiry(token: string, data: unknown): number {
    const expiresIn =
      typeof (data as { expires_in?: number }).expires_in === 'number'
        ? (data as { expires_in?: number }).expires_in
        : undefined;

    if (expiresIn) {
      return Date.now() + expiresIn * 1000;
    }

    const jwtExp = this.decodeJwtExpiry(token);
    if (jwtExp) {
      return jwtExp;
    }

    return Date.now() + 15 * 60 * 1000;
  }

  private decodeJwtExpiry(token: string): number | undefined {
    const parts = token.split('.');
    if (parts.length < 2) {
      return undefined;
    }
    try {
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      const json = JSON.parse(payload) as { exp?: number };
      if (typeof json.exp === 'number') {
        return json.exp * 1000;
      }
    } catch (_error) {
      return undefined;
    }
    return undefined;
  }

  private async envioPackRequest<T>(
    path: string,
    params: Record<string, string | number>,
    retryAuth = true,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(path, this.getBaseUrl());
    url.searchParams.set('access_token', token);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), { method: 'GET' });
    } catch (error) {
      throw new ServiceUnavailableException(
        `EnvioPack request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const data = await this.parseJson(response);

    if ((response.status === 401 || response.status === 403) && retryAuth) {
      this.tokenCache = undefined;
      await this.getAccessToken(true);
      return this.envioPackRequest(path, params, false);
    }

    if (!response.ok) {
      const message =
        (data as { error?: string; message?: string })?.error ??
        (data as { error?: string; message?: string })?.message ??
        `EnvioPack request failed with status ${response.status}`;

      if (response.status === 400 || response.status === 422) {
        throw new BadRequestException(message);
      }

      if (response.status === 429) {
        throw new ServiceUnavailableException(message);
      }

      throw new BadGatewayException(message);
    }

    return data as T;
  }

  private async parseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { raw: text };
    }
  }

  private async getProvinces(): Promise<EnvioPackProvince[]> {
    const now = Date.now();
    if (this.provincesCache && this.provincesCache.expiresAt > now) {
      return this.provincesCache.data;
    }

    const data = await this.envioPackRequest<unknown>('/provincias', {});

    const provinces = Array.isArray(data)
      ? data
      : (data as { provincias?: EnvioPackProvince[]; data?: EnvioPackProvince[] })
          ?.provincias ??
        (data as { provincias?: EnvioPackProvince[]; data?: EnvioPackProvince[] })
          ?.data;

    if (!Array.isArray(provinces)) {
      throw new ServiceUnavailableException(
        'EnvioPack provinces response invalid',
      );
    }

    this.provincesCache = {
      data: provinces,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };

    return provinces;
  }

  private async validatePostalCode(
    provinceId: string,
    postalCode: string,
  ): Promise<boolean> {
    const data = await this.envioPackRequest<{ valido?: boolean }>(
      `/provincias/${provinceId}/validar-codigo-postal`,
      { codigo_postal: postalCode },
    );

    return Boolean((data as { valido?: boolean }).valido);
  }

  private async resolveProvinceId(postalCode: string): Promise<string> {
    const cached = this.postalCodeCache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.id;
    }

    const provinces = await this.getProvinces();

    for (const province of provinces) {
      if (!province?.id) {
        continue;
      }
      const isValid = await this.validatePostalCode(province.id, postalCode);
      if (isValid) {
        const entry = {
          id: province.id,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        this.postalCodeCache.set(postalCode, entry);
        return province.id;
      }
    }

    throw new BadRequestException(
      `Postal code ${postalCode} is not valid for any province`,
    );
  }
}
