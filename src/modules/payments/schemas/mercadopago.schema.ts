import { z } from 'zod';

export const createPreferenceSchema = z.object({
  orderId: z.string().uuid({ message: 'Invalid orderId' }),
});
