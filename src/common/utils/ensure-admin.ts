import type { Request, Response } from 'express';

export function ensureAdmin(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
}
