import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import { getUserOrderById, listUserOrders } from '../controllers/user.orders.controller';

const router = Router();

router.get('/users/me/orders', requireAuth, listUserOrders);
router.get('/users/me/orders/:id', requireAuth, getUserOrderById);

export default router;
