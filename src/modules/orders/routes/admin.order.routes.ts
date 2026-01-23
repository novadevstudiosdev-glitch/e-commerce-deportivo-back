import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares/auth.middleware';
import { updatePaymentStatus } from '../controllers/admin.order.controller';

const router = Router();

router.patch('/:orderId/payment', requireAuth, requireRole('admin'), updatePaymentStatus);

export default router;
