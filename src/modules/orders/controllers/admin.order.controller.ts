import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { OrderItem } from '../../../database/entities/OrderItem';
import { Payment } from '../../../database/entities/Payment';
import { Product } from '../../../database/entities/Product';
import { ConfigService } from '@nestjs/config';
import { paymentStatusSchema } from '../schemas/payment.schema';
import { orderStatusUpdateSchema } from '../schemas/order.status.schema';
import { EmailService } from '../../../common/services/email.service';

let dataSourceInit: Promise<void> | null = null;
const emailService = new EmailService(new ConfigService());

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

export async function updatePaymentStatus(req: Request, res: Response) {
  const { orderId } = req.params;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  const parsed = paymentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { status } = parsed.data;

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: { items: true, payment: true, user: { profile: true } },
  });

  if (!order || !order.payment) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const payment = order.payment;
  const currentStatus = payment.status;

  if (currentStatus === 'aprobado' && status === 'aprobado') {
    return res.status(409).json({ error: 'Payment already approved' });
  }

  if (currentStatus === 'reembolsado') {
    return res.status(409).json({ error: 'Payment already refunded' });
  }

  if (status === 'reembolsado' && currentStatus !== 'aprobado') {
    return res.status(409).json({ error: 'Refund requires approved payment' });
  }

  if (status === 'rechazado') {
    payment.status = 'rechazado';
    await AppDataSource.getRepository(Payment).save(payment);

    return res.json({
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: payment.status,
    });
  }

  if (status === 'aprobado') {
    try {
      await AppDataSource.manager.transaction(async (manager) => {
        const productRepo = manager.getRepository(Product);
        const paymentRepo = manager.getRepository(Payment);
        const orderItemRepo = manager.getRepository(OrderItem);
        const orderRepoTx = manager.getRepository(Order);

        const items = await orderItemRepo.find({
          where: { orderId: order.id },
        });

        for (const item of items) {
          const product = await productRepo.findOne({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error('missing_product');
          }

          if (product.stock < item.quantity) {
            const error = new Error('stock_insufficient');
            (error as Error & { productId?: string }).productId = product.id;
            throw error;
          }
        }

        for (const item of items) {
          await productRepo.decrement({ id: item.productId }, 'stock', item.quantity);
        }

        payment.status = 'aprobado';
        order.status = 'pagado';

        await paymentRepo.save(payment);
        await orderRepoTx.save(order);
      });
    } catch (error) {
      if ((error as Error).message === 'stock_insufficient') {
        return res
          .status(409)
          .json({ error: 'Insufficient stock for approval' });
      }
      if ((error as Error).message === 'missing_product') {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(500).json({ error: 'Failed to approve payment' });
    }

    if (order.user) {
      emailService
        .sendOrderConfirmationEmail({
          user: order.user,
          order,
          items: order.items,
        })
        .catch((error) => {
          console.warn(
            '[EmailService] Failed to send order confirmation',
            error,
          );
        });
    }

    return res.json({
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: payment.status,
    });
  }

  if (status === 'reembolsado') {
    try {
      await AppDataSource.manager.transaction(async (manager) => {
        const productRepo = manager.getRepository(Product);
        const paymentRepo = manager.getRepository(Payment);
        const orderItemRepo = manager.getRepository(OrderItem);
        const orderRepoTx = manager.getRepository(Order);

        const items = await orderItemRepo.find({
          where: { orderId: order.id },
        });

        for (const item of items) {
          await productRepo.increment({ id: item.productId }, 'stock', item.quantity);
        }

        payment.status = 'reembolsado';
        order.status = 'pagado';

        await paymentRepo.save(payment);
        await orderRepoTx.save(order);
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to refund payment' });
    }

    return res.json({
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: payment.status,
    });
  }

  return res.status(400).json({ error: 'Invalid status' });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { orderId } = req.params;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  const parsed = orderStatusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: { payment: true },
  });

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'pendiente_pago') {
    return res.status(409).json({ error: 'Order not paid' });
  }

  if (!order.payment || order.payment.status !== 'aprobado') {
    return res.status(409).json({ error: 'Payment not approved' });
  }

  const { status } = parsed.data;
  if (order.status === status) {
    return res.status(409).json({ error: 'Order already in status' });
  }

  order.status = status;
  await orderRepo.save(order);

  return res.json({
    orderId: order.id,
    orderStatus: order.status,
  });
}
