import { z } from 'zod';
import {
  isValidDNI,
  isValidPhone,
  normalizeDNI,
  normalizeEmail,
  normalizePhone,
} from '../utils/normalize';

export const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeEmail(value) : value),
  z.string().email({ message: 'Invalid email format' }),
);

export const phoneSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizePhone(value) : value),
  z.string().refine(isValidPhone, { message: 'Invalid phone format' }),
);

export const dniSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeDNI(value) : value),
  z.string().refine(isValidDNI, { message: 'Invalid DNI format' }),
);

const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Name must be at least 2 characters' });

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date format',
  });

export const updateMeSchema = z.object({
  email: emailSchema.optional(),
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  dni: dniSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  date_of_birth: dateStringSchema.optional().nullable(),
  avatar_url: z.string().url({ message: 'Invalid URL' }).optional().nullable(),
});

export const addressCreateSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  street_address: z.string().min(1, { message: 'Street is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  postal_code: z.string().min(1, { message: 'Postal code is required' }),
  country: z.string().min(1, { message: 'Country is required' }),
  is_default: z.boolean().optional(),
});

export const addressUpdateSchema = addressCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
