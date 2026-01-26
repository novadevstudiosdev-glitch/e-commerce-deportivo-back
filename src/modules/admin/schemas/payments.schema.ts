import { z } from 'zod';
import { PAYMENT_STATUSES } from '../../../database/entities/Payment';

const numberFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

const dateFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  return value;
};

export const paymentsQuerySchema = z.object({
  page: z.preprocess(numberFromString, z.number().int().min(1)).default(1),
  limit: z
    .preprocess(numberFromString, z.number().int().min(1).max(50))
    .default(10),
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.string().min(1).optional(),
  from: z.preprocess(dateFromString, z.date()).optional(),
  to: z.preprocess(dateFromString, z.date()).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
