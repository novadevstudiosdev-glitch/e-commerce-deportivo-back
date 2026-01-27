import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { Payment } from '../../../database/entities/Payment';
import { orderShippingSchema } from '../../shipping/schemas/shipping.schema';

let dataSourceInit: Promise<void> | null = null;

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function assignOrderShipping(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { orderId } = req.params;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const parsed = orderShippingSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: orderId, userId },
    relations: { payment: true },
  });

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status !== 'pendiente_pago') {
    return res.status(409).json({ error: 'Order is not pending payment' });
  }

  const shippingPrice = roundMoney(parsed.data.price);
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discountTotal ?? 0);

  if (Number.isNaN(subtotal) || Number.isNaN(discount)) {
    return res.status(400).json({ error: 'Invalid order totals' });
  }

  const newTotal = roundMoney(subtotal - discount + shippingPrice);

  order.shippingProvider = parsed.data.provider ?? 'correo_argentino';
  order.shippingType = parsed.data.type;
  order.shippingPrice = formatMoney(shippingPrice);
  order.shippingMeta = parsed.data.meta ?? null;
  order.shippingTotal = formatMoney(shippingPrice);
  order.total = formatMoney(newTotal);

  await AppDataSource.manager.transaction(async (manager) => {
    const orderRepoTx = manager.getRepository(Order);
    const paymentRepoTx = manager.getRepository(Payment);

    await orderRepoTx.save(order);

    if (order.payment && order.payment.status === 'pendiente') {
      order.payment.amount = order.total;
      await paymentRepoTx.save(order.payment);
    }
  });

  return res.json({
    orderId: order.id,
    total: order.total,
    shipping: {
      provider: order.shippingProvider,
      type: order.shippingType,
      price: order.shippingPrice,
      meta: order.shippingMeta,
    },
  });
}
