import { z } from 'zod';

const numberFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

export const stockAlertQuerySchema = z.object({
  threshold: z
    .preprocess(numberFromString, z.number().int().min(0))
    .optional(),
});
