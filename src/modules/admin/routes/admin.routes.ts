import { Router } from 'express';
import { requireAdmin, requireRole } from '../../auth/middlewares/auth.middleware';
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

router.get('/admin/ping', requireRole('admin', 'vendedor'), (_req, res) => {
  return res.json({ ok: true });
});

router.get('/admin/stats/summary', requireRole('admin', 'vendedor'), getSalesSummary);

router.get('/admin/stats/top-products', requireRole('admin', 'vendedor'), getTopProducts);

router.get('/admin/payments', requireAdmin, listPayments);

router.get('/admin/payments/pending', requireAdmin, listPendingPayments);

router.get('/admin/stock-alerts', requireAdmin, listLowStock);

router.post('/admin/coupons', requireAdmin, createCoupon);

router.get('/admin/coupons', requireAdmin, listCoupons);

router.put('/admin/coupons/:id', requireAdmin, updateCoupon);

router.delete('/admin/coupons/:id', requireAdmin, deleteCoupon);

export default router;
