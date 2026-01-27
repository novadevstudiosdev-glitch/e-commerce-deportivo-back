import type { Request, Response } from 'express';

const STAFF_ROLES = new Set(['admin', 'vendedor']);

export function ensureStaff(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (!STAFF_ROLES.has(req.user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
}
