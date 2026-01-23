import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares/auth.middleware';

const router = Router();

router.get('/admin/ping', requireAuth, requireRole('admin'), (_req, res) => {
  return res.json({ ok: true });
});

export default router;
