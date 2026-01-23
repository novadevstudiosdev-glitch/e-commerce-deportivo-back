import { z } from 'zod';

export const paymentStatusSchema = z.object({
  status: z.enum(['aprobado', 'rechazado', 'reembolsado']),
});
