import { normalizeEnvioPackQuoteOptions } from './envio-pack.normalizer';
import { DeliveryType } from '../shipping.types';

describe('normalizeEnvioPackQuoteOptions', () => {
  it('normalizes EnvioPack quote items', () => {
    const raw = [
      {
        correo: { id: 'oca', nombre: 'OCA' },
        modalidad: 'S',
        servicio: 'N',
        valor: '44.85',
        horas_entrega: 72,
      },
      {
        correo: { id: 'urbano', nombre: 'Urbano' },
        modalidad: 'D',
        servicio: 'P',
        valor: 47.39,
        horas_entrega: '24',
        fecha_estimada: '2026-01-30',
      },
    ];

    const options = normalizeEnvioPackQuoteOptions(raw, { debug: false });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      provider: 'OCA',
      serviceName: 'Estandar',
      deliveryType: DeliveryType.PICKUP,
      price: 44.85,
      currency: 'ARS',
      etaDays: 3,
    });
    expect(options[1]).toMatchObject({
      provider: 'Urbano',
      serviceName: 'Prioritario',
      deliveryType: DeliveryType.HOME,
      price: 47.39,
      currency: 'ARS',
      etaDays: 1,
      estimatedDate: '2026-01-30',
    });
  });
});
