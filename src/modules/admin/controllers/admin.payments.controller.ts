import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Payment } from '../../../database/entities/Payment';
import { paymentsQuerySchema } from '../schemas/payments.schema';

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

export async function listPayments(req: Request, res: Response) {
  const parsed = paymentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { page, limit, status, provider, from, to, sort } = parsed.data;
  const paymentRepo = AppDataSource.getRepository(Payment);

  const baseQb = paymentRepo
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.order', 'order');

  if (status) {
    baseQb.andWhere('payment.status = :status', { status });
  }

  if (provider) {
    baseQb.andWhere('payment.provider = :provider', { provider });
  }

  if (from) {
    baseQb.andWhere('payment.createdAt >= :from', { from });
  }

  if (to) {
    baseQb.andWhere('payment.createdAt <= :to', { to });
  }

  const total = await baseQb.getCount();
  const dataQb = baseQb.clone();
  const orderDir = sort === 'oldest' ? 'ASC' : 'DESC';
  const payments = await dataQb
    .orderBy('payment.createdAt', orderDir)
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();

  return res.json({
    page,
    limit,
    total,
    data: payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      provider: payment.provider,
      amount: payment.amount,
      transaction_id: payment.transactionId,
      created_at: payment.createdAt,
      order: payment.order
        ? {
            id: payment.order.id,
            status: payment.order.status,
            currency: payment.order.currency,
            total: payment.order.total,
            user_id: payment.order.userId,
          }
        : null,
    })),
  });
}

export async function listPendingPayments(req: Request, res: Response) {
  const query = { ...req.query, status: 'pendiente' };
  req.query = query as typeof req.query;
  return listPayments(req, res);
}
