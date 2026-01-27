const MP_API_BASE = process.env.MP_API_BASE ?? 'https://api.mercadopago.com';

function getAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN is not configured');
  }
  return token;
}

async function mpRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    data = {} as T;
  }

  if (!response.ok) {
    const message =
      (data as { message?: string; error?: string })?.message ??
      (data as { message?: string; error?: string })?.error ??
      'Mercado Pago request failed';
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

export type MercadoPagoPreferencePayload = {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  metadata?: Record<string, unknown>;
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>;
    excluded_payment_methods?: Array<{ id: string }>;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved';
  external_reference?: string;
  notification_url?: string;
  payer?: {
    email?: string;
  };
};

export type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export type MercadoPagoPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  metadata?: Record<string, unknown>;
  point_of_interaction?: Record<string, unknown>;
  three_ds_info?: Record<string, unknown>;
};

export function createPreference(payload: MercadoPagoPreferencePayload) {
  return mpRequest<MercadoPagoPreferenceResponse>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type MercadoPagoPaymentPayload = {
  transaction_amount: number;
  token: string;
  description?: string;
  installments: number;
  payment_method_id: string;
  issuer_id?: string | number;
  payer: {
    email: string;
  };
  external_reference?: string;
  metadata?: Record<string, unknown>;
  notification_url?: string;
};

export function createPayment(payload: MercadoPagoPaymentPayload) {
  return mpRequest<MercadoPagoPayment>('/v1/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPayment(paymentId: string) {
  return mpRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`, {
    method: 'GET',
  });
}
