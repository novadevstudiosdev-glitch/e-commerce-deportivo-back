import { QuoteOptionDto } from '../dtos/quote-option.dto';
import { DeliveryType } from '../shipping.types';
import { EnvioPackQuoteItem } from '../types/envio-pack.types';

const SERVICE_LABELS: Record<string, string> = {
  N: 'Estandar',
  P: 'Prioritario',
  X: 'Express',
  R: 'Devoluciones',
};

type NormalizerOptions = {
  debug?: boolean;
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

function normalizeDeliveryType(value: unknown): DeliveryType.HOME | DeliveryType.PICKUP {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'S' || text === 'SUCURSAL' || text === 'RETIRO') {
    return DeliveryType.PICKUP;
  }
  return DeliveryType.HOME;
}

function buildServiceName(code: unknown): string {
  if (typeof code !== 'string' || code.trim() === '') {
    return 'Servicio';
  }
  const normalized = code.trim().toUpperCase();
  return SERVICE_LABELS[normalized] ?? `Servicio ${normalized}`;
}

function formatEtaText(days?: number, estimatedDate?: string): string {
  if (typeof days === 'number') {
    return days === 1 ? '1 dia habil' : `${days} dias habiles`;
  }
  if (estimatedDate) {
    return `Entrega estimada: ${estimatedDate}`;
  }
  return 'Sin estimacion';
}

export function normalizeEnvioPackQuoteOptions(
  raw: unknown,
  options: NormalizerOptions = {},
): QuoteOptionDto[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return (raw as EnvioPackQuoteItem[])
    .map((item) => {
      const price = parseNumber(item.valor);
      if (price === null) {
        return null;
      }

      const provider =
        item.correo?.nombre ?? item.correo?.id ?? 'EnvioPack';
      const serviceName = buildServiceName(item.servicio);
      const deliveryType = normalizeDeliveryType(item.modalidad ?? item.despacho);

      const hours = parseNumber(item.horas_entrega);
      const etaDays =
        typeof hours === 'number' ? Math.max(1, Math.ceil(hours / 24)) : undefined;

      const estimatedDate =
        typeof item.fecha_estimada === 'string' && item.fecha_estimada.trim() !== ''
          ? item.fecha_estimada
          : undefined;

      const etaText = formatEtaText(etaDays, estimatedDate);

      const option: QuoteOptionDto = {
        provider,
        serviceName,
        deliveryType,
        price,
        currency: 'ARS',
        etaText,
        ...(etaDays ? { etaDays } : {}),
        ...(estimatedDate ? { estimatedDate } : {}),
        ...(options.debug ? { raw: item } : {}),
      };

      return option;
    })
    .filter((item): item is QuoteOptionDto => item !== null);
}
