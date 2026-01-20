import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
  firstName: z
    .string()
    .trim()
    .min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z
    .string()
    .trim()
    .min(2, { message: 'Last name must be at least 2 characters' }),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
