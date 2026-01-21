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

export const verifyEmailSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  token: z.string().min(1, { message: 'Token is required' }),
});

export const resendVerificationSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  token: z.string().min(1, { message: 'Token is required' }),
  newPassword: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
