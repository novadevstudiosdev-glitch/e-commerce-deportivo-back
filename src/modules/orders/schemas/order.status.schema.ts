import { z } from 'zod';

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['en_preparacion', 'enviado', 'entregado']),
});
