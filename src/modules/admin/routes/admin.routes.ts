import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares/auth.middleware';
import {
  getSalesSummary,
  getTopProducts,
} from '../controllers/admin.stats.controller';
import {
  listPayments,
  listPendingPayments,
} from '../controllers/admin.payments.controller';
import { listLowStock } from '../controllers/admin.stock.controller';
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from '../controllers/admin.coupon.controller';

const router = Router();

router.get('/admin/ping', requireAuth, requireRole('admin'), (_req, res) => {
  return res.json({ ok: true });
});

router.get(
  '/admin/stats/summary',
  requireAuth,
  requireRole('admin'),
  getSalesSummary,
);

router.get(
  '/admin/stats/top-products',
  requireAuth,
  requireRole('admin'),
  getTopProducts,
);

router.get(
  '/admin/payments',
  requireAuth,
  requireRole('admin'),
  listPayments,
);

router.get(
  '/admin/payments/pending',
  requireAuth,
  requireRole('admin'),
  listPendingPayments,
);

router.get(
  '/admin/stock-alerts',
  requireAuth,
  requireRole('admin'),
  listLowStock,
);

router.post(
  '/admin/coupons',
  requireAuth,
  requireRole('admin'),
  createCoupon,
);

router.get(
  '/admin/coupons',
  requireAuth,
  requireRole('admin'),
  listCoupons,
);

router.put(
  '/admin/coupons/:id',
  requireAuth,
  requireRole('admin'),
  updateCoupon,
);

router.delete(
  '/admin/coupons/:id',
  requireAuth,
  requireRole('admin'),
  deleteCoupon,
);

export default router;
