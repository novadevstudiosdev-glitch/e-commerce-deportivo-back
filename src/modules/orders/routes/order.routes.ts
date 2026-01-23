import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import { createOrder, createOrderFromCart } from '../controllers/order.controller';

const router = Router();

router.post('/orders', requireAuth, createOrder);
router.post('/orders/from-cart', requireAuth, createOrderFromCart);

export default router;
