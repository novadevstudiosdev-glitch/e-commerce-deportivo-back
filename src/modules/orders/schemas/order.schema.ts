import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid productId' }),
  quantity: z.number().int().min(1, { message: 'Quantity must be > 0' }),
});

export const shippingAddressSchema = z.object({
  street: z.string().trim().min(2, { message: 'Street is required' }),
  number: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().min(2, { message: 'Province is required' }),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, { message: 'Postal code must be 4 digits' }),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, { message: 'Items cannot be empty' }),
  notes: z.string().optional(),
  coupon_code: z.string().trim().min(3).optional(),
  shipping_address: shippingAddressSchema.optional(),
});
