import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid productId' }),
  quantity: z.number().int().min(1, { message: 'Quantity must be > 0' }),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, { message: 'Items cannot be empty' }),
  notes: z.string().optional(),
});
