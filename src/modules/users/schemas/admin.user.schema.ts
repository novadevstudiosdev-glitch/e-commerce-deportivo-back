import { z } from 'zod';
import { dniSchema, emailSchema, phoneSchema } from './user.schema';

const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Name must be at least 2 characters' });

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date format',
  });

export const roleSchema = z.enum(['admin', 'usuario', 'vendedor']);

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

export const adminUserQuerySchema = z.object({
  page: z.preprocess(numberFromString, z.number().int().min(1)).default(1),
  limit: z
    .preprocess(numberFromString, z.number().int().min(1).max(100))
    .default(20),
  q: z.string().min(1).optional(),
  role: roleSchema.optional(),
  is_active: z.preprocess(booleanFromString, z.boolean()).optional(),
});

export const adminUserUpdateSchema = z
  .object({
    email: emailSchema.optional(),
    role: roleSchema.optional(),
    is_active: z.boolean().optional(),
    email_verified: z.boolean().optional(),
    first_name: nameSchema.optional(),
    last_name: nameSchema.optional(),
    dni: dniSchema.optional().nullable(),
    phone: phoneSchema.optional().nullable(),
    date_of_birth: dateStringSchema.optional().nullable(),
    avatar_url: z.string().url({ message: 'Invalid URL' }).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
