import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import { createOrder, createOrderFromCart } from '../controllers/order.controller';
import { assignOrderShipping } from '../controllers/order.shipping.controller';

const router = Router();

router.post('/orders', requireAuth, createOrder);
router.post('/orders/from-cart', requireAuth, createOrderFromCart);
router.post('/orders/:orderId/shipping', requireAuth, assignOrderShipping);

export default router;
