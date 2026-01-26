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

const codeSchema = z.string().trim().min(3).max(50);
const valueSchema = z.preprocess(numberFromString, z.number().min(0.01));
const minOrderTotalSchema = z
  .preprocess(numberFromString, z.number().min(0))
  .optional();

const couponBaseSchema = z.object({
  code: codeSchema,
  type: z.enum(['percent', 'fixed']),
  value: valueSchema,
  active: z.boolean().optional(),
  starts_at: z.preprocess(dateFromString, z.date()).optional(),
  ends_at: z.preprocess(dateFromString, z.date()).optional(),
  min_order_total: minOrderTotalSchema,
});

export const couponCreateSchema = couponBaseSchema.refine(
  (data) => data.type !== 'percent' || (data.value >= 0 && data.value <= 100),
  { message: 'Percent discount must be between 0 and 100', path: ['value'] },
);

export const couponUpdateSchema = couponBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (data) =>
      data.type !== 'percent' ||
      data.value === undefined ||
      (data.value >= 0 && data.value <= 100),
    { message: 'Percent discount must be between 0 and 100', path: ['value'] },
  );

export const couponQuerySchema = z.object({
  active: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
      }
      return value;
    }, z.boolean())
    .optional(),
});
