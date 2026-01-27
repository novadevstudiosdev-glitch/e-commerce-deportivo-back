import { Router } from 'express';
import { requireAdmin } from '../../auth/middlewares/auth.middleware';
import {
  listAdminOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from '../controllers/admin.order.controller';

const router = Router();

router.use(requireAdmin);

router.get('/', listAdminOrders);
router.patch('/:orderId/payment', updatePaymentStatus);
router.patch('/:orderId/status', updateOrderStatus);

export default router;
