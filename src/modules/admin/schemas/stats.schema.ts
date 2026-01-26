import { z } from 'zod';

const dateFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  return value;
};

const numberFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

export const statsQuerySchema = z.object({
  from: z.preprocess(dateFromString, z.date()).optional(),
  to: z.preprocess(dateFromString, z.date()).optional(),
  limit: z.preprocess(numberFromString, z.number().int().min(1).max(50)).default(5),
});
