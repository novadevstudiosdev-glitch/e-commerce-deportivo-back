import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid productId' }),
  quantity: z.number().int().min(1, { message: 'Quantity must be > 0' }),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().min(1, { message: 'Quantity must be > 0' }),
});

export const cartProductIdParamSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid productId' }),
});
