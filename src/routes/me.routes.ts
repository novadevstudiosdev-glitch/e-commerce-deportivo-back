import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  return res.json(req.user);
});

export default router;
