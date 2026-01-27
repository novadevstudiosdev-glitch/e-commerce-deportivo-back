import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { OrderItem } from '../../../database/entities/OrderItem';
import type { SelectQueryBuilder } from 'typeorm';
import { statsQuerySchema } from '../schemas/stats.schema';
import { ensureStaff } from '../../../common/utils/ensure-staff';

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

function applyDateFilters(qb: SelectQueryBuilder<Order>, from?: Date, to?: Date) {
  if (from) {
    qb.andWhere('order.createdAt >= :from', { from });
  }
  if (to) {
    qb.andWhere('order.createdAt <= :to', { to });
  }
}

export async function getSalesSummary(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { from, to } = parsed.data;
  const orderRepo = AppDataSource.getRepository(Order);

  const ordersQb = orderRepo
    .createQueryBuilder('order')
    .leftJoin('order.payment', 'payment')
    .where('payment.status = :status', { status: 'aprobado' });

  applyDateFilters(ordersQb, from, to);

  const summaryRaw = await ordersQb
    .select('COUNT(order.id)', 'orders')
    .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
    .addSelect('COALESCE(MIN(order.currency), \'ARS\')', 'currency')
    .getRawOne<{ orders: string; revenue: string; currency: string }>();

  const unitsQb = orderRepo
    .createQueryBuilder('order')
    .leftJoin('order.payment', 'payment')
    .innerJoin(OrderItem, 'item', 'item.orderId = order.id')
    .where('payment.status = :status', { status: 'aprobado' });

  applyDateFilters(unitsQb, from, to);

  const unitsRaw = await unitsQb
    .select('COALESCE(SUM(item.quantity), 0)', 'units')
    .getRawOne<{ units: string }>();

  return res.json({
    orders: Number(summaryRaw?.orders ?? 0),
    units: Number(unitsRaw?.units ?? 0),
    revenue: summaryRaw?.revenue ?? '0',
    currency: summaryRaw?.currency ?? 'ARS',
  });
}

export async function getTopProducts(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { from, to, limit } = parsed.data;
  const orderRepo = AppDataSource.getRepository(Order);

  const qb = orderRepo
    .createQueryBuilder('order')
    .leftJoin('order.payment', 'payment')
    .innerJoin(OrderItem, 'item', 'item.orderId = order.id')
    .where('payment.status = :status', { status: 'aprobado' });

  applyDateFilters(qb, from, to);

  const rows = await qb
    .select('item.productId', 'productId')
    .addSelect('item.productName', 'productName')
    .addSelect('SUM(item.quantity)', 'units')
    .addSelect('COALESCE(SUM(item.subtotal), 0)', 'revenue')
    .groupBy('item.productId')
    .addGroupBy('item.productName')
    .orderBy('units', 'DESC')
    .limit(limit)
    .getRawMany<{
      productId: string;
      productName: string;
      units: string;
      revenue: string;
    }>();

  return res.json({
    data: rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      units: Number(row.units ?? 0),
      revenue: row.revenue ?? '0',
    })),
  });
}
