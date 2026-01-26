import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares/auth.middleware';
import {
  updateOrderStatus,
  updatePaymentStatus,
} from '../controllers/admin.order.controller';

const router = Router();

router.patch('/:orderId/payment', requireAuth, requireRole('admin'), updatePaymentStatus);
router.patch('/:orderId/status', requireAuth, requireRole('admin'), updateOrderStatus);

export default router;
