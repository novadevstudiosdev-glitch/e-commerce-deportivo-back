import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import { createOrder } from '../controllers/order.controller';

const router = Router();

router.post('/orders', requireAuth, createOrder);

export default router;
