import { z } from 'zod';

export const correoArgentinoQuoteSchema = z.object({
  postalCode: z.string().min(3),
  province: z.string().min(2),
  weight: z.coerce.number().positive(),
  dimensions: z.object({
    height: z.coerce.number().positive(),
    width: z.coerce.number().positive(),
    length: z.coerce.number().positive(),
  }),
});

export const orderShippingSchema = z.object({
  provider: z.string().optional().default('correo_argentino'),
  type: z.enum(['domicilio', 'sucursal']),
  price: z.coerce.number().min(0),
  meta: z.record(z.string(), z.unknown()).optional(),
});
