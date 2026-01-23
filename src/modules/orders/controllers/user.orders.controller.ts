import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { orderQuerySchema } from '../schemas/order.query.schema';

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

function getSortDirection(sort: 'newest' | 'oldest') {
  return sort === 'oldest' ? 'ASC' : 'DESC';
}

export async function listUserOrders(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = orderQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { page, limit, orderStatus, paymentStatus, from, to, sort } = parsed.data;

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const baseQb = orderRepo
    .createQueryBuilder('order')
    .leftJoin('order.payment', 'payment')
    .where('order.userId = :userId', { userId });

  if (orderStatus) {
    baseQb.andWhere('order.status = :orderStatus', { orderStatus });
  }

  if (paymentStatus) {
    baseQb.andWhere('payment.status = :paymentStatus', { paymentStatus });
  }

  if (from) {
    baseQb.andWhere('order.createdAt >= :from', { from });
  }

  if (to) {
    baseQb.andWhere('order.createdAt <= :to', { to });
  }

  const total = await baseQb.clone().getCount();

  const orderIdsRaw = await baseQb
    .clone()
    .select('order.id', 'id')
    .orderBy('order.createdAt', getSortDirection(sort))
    .skip((page - 1) * limit)
    .take(limit)
    .getRawMany<{ id: string }>();

  const orderIds = orderIdsRaw.map((row) => row.id).filter(Boolean);

  if (orderIds.length === 0) {
    return res.json({ page, limit, total, data: [] });
  }

  const orders = await orderRepo
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.payment', 'payment')
    .leftJoinAndSelect('order.items', 'item')
    .where('order.id IN (:...ids)', { ids: orderIds })
    .orderBy('order.createdAt', getSortDirection(sort))
    .getMany();

  const data = orders.map((order) => ({
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    total: order.total,
    currency: order.currency,
    created_at: order.createdAt,
    payment: order.payment
      ? {
          status: order.payment.status,
          provider: order.payment.provider,
          amount: order.payment.amount,
        }
      : null,
    itemsCount: order.items?.length ?? 0,
  }));

  return res.json({ page, limit, total, data });
}

export async function getUserOrderById(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id, userId },
    relations: { items: true, payment: true },
  });

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  return res.json({
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    shipping_total: order.shippingTotal,
    discount_total: order.discountTotal,
    total: order.total,
    currency: order.currency,
    notes: order.notes,
    created_at: order.createdAt,
    payment: order.payment
      ? {
          status: order.payment.status,
          provider: order.payment.provider,
          amount: order.payment.amount,
          transaction_id: order.payment.transactionId,
        }
      : null,
    items: (order.items ?? []).map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
  });
}
