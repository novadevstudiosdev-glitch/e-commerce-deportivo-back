import { z } from 'zod';

const priceSchema = z
  .string()
  .refine((value) => Number(value) > 0, { message: 'Price must be > 0' });

const currencySchema = z
  .string()
  .length(3, { message: 'Currency must be 3 letters' })
  .default('ARS');

const stockSchema = z.number().int().min(0, { message: 'Stock must be >= 0' });
const lowStockThresholdSchema = z
  .number()
  .int()
  .min(0, { message: 'Low stock threshold must be >= 0' });
const discountPercentSchema = z
  .number()
  .int()
  .min(0, { message: 'Discount percent must be >= 0' })
  .max(100, { message: 'Discount percent must be <= 100' });

const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Name must be at least 2 characters' });

const categorySchema = z
  .string()
  .trim()
  .min(2, { message: 'Category must be at least 2 characters' });

const descriptionSchema = z
  .string()
  .min(10, { message: 'Description must be at least 10 characters' });

const imagesSchema = z
  .array(z.string().url({ message: 'Invalid image URL' }))
  .optional();

const isActiveSchema = z.boolean().optional();
const isFeaturedSchema = z.boolean().optional();

export const productCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  currency: currencySchema.optional(),
  stock: stockSchema.optional(),
  discount_percent: discountPercentSchema.optional(),
  category: categorySchema,
  images: imagesSchema,
  is_active: isActiveSchema,
  is_featured: isFeaturedSchema,
  low_stock_threshold: lowStockThresholdSchema.optional(),
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
