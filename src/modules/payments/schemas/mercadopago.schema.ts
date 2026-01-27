import { z } from 'zod';

export const createPreferenceSchema = z.object({
  orderId: z.string().uuid({ message: 'Invalid orderId' }),
});

const stringish = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  },
  z.string().min(1),
);

export const createPaymentSchema = z.object({
  orderId: z.string().uuid({ message: 'Invalid orderId' }),
  token: z.string().min(1),
  payment_method_id: z.string().min(1),
  installments: z.coerce.number().int().min(1),
  issuer_id: stringish.optional(),
  payer: z.object({
    email: z.string().email(),
  }),
});
