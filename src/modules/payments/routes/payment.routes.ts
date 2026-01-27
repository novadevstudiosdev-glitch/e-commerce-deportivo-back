import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  createMercadoPagoPayment,
  createMercadoPagoPreference,
  getMercadoPagoPaymentStatus,
  getOrderPayment,
  mercadoPagoWebhook,
} from '../controllers/mercadopago.controller';

const router = Router();

router.post(
  '/payments/mercadopago/preference',
  requireAuth,
  createMercadoPagoPreference,
);
router.post('/payments/mercadopago', requireAuth, createMercadoPagoPayment);
router.get(
  '/payments/mercadopago/:paymentId',
  requireAuth,
  getMercadoPagoPaymentStatus,
);
router.get('/orders/:orderId/payment', requireAuth, getOrderPayment);
router.post('/payments/mercadopago/webhook', mercadoPagoWebhook);

export default router;
