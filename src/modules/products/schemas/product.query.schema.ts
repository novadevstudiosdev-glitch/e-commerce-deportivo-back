import { z } from 'zod';

const numberFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

const booleanFromString = (value: unknown) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
};

export const productQuerySchema = z.object({
  page: z.preprocess(numberFromString, z.number().int().min(1)).default(1),
  limit: z
    .preprocess(numberFromString, z.number().int().min(1).max(50))
    .default(12),
  q: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  minPrice: z.preprocess(numberFromString, z.number().min(0)).optional(),
  maxPrice: z.preprocess(numberFromString, z.number().min(0)).optional(),
  inStock: z.preprocess(booleanFromString, z.boolean()).optional(),
  sort: z
    .enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'])
    .default('newest'),
});
