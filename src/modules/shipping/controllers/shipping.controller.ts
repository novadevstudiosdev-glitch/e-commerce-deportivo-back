import type { Request, Response } from 'express';
import { correoArgentinoQuoteSchema } from '../schemas/shipping.schema';
import { CorreoArgentinoService } from '../services/correo-argentino.service';

const correoService = new CorreoArgentinoService();

export async function quoteCorreoArgentino(req: Request, res: Response) {
  const parsed = correoArgentinoQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  try {
    const response = await correoService.quoteShipment(parsed.data);
    return res.json(response);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Correo Argentino request failed';
    const status =
      (error as { status?: number } | null | undefined)?.status ?? 500;
    const data =
      (error as { data?: unknown } | null | undefined)?.data ?? undefined;

    return res.status(502).json({
      error: 'Failed to quote Correo Argentino shipping',
      details,
      ...(process.env.NODE_ENV === 'development' ? { ca: data } : {}),
      status,
    });
  }
}
