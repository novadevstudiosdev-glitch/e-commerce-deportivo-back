import type { Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { OrderItem } from '../../../database/entities/OrderItem';
import { Payment } from '../../../database/entities/Payment';
import { Product } from '../../../database/entities/Product';
import {
  createPaymentSchema,
  createPreferenceSchema,
} from '../schemas/mercadopago.schema';
import {
  createPayment,
  createPreference,
  getPayment,
  MercadoPagoPayment,
  MercadoPagoPreferencePayload,
} from '../services/mercadopago.service';

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

function buildBackUrls() {
  const frontendUrl = process.env.FRONTEND_URL;
  const success =
    (process.env.MP_SUCCESS_URL || '').trim() ||
    (frontendUrl ? `${frontendUrl}/checkout/success` : undefined);
  const failure =
    (process.env.MP_FAILURE_URL || '').trim() ||
    (frontendUrl ? `${frontendUrl}/checkout/failure` : undefined);
  const pending =
    (process.env.MP_PENDING_URL || '').trim() ||
    (frontendUrl ? `${frontendUrl}/checkout/pending` : undefined);
  const entries = Object.entries({ success, failure, pending }).filter(
    ([, value]) => Boolean(value),
  );

  const backUrls =
    (Object.fromEntries(entries) as MercadoPagoPreferencePayload['back_urls']) ??
    {};

  if (!backUrls.success) {
    backUrls.success = 'http://localhost:3000/checkout/success';
  }

  return backUrls;
}

function buildNotificationUrl() {
  if (process.env.MP_WEBHOOK_URL) {
    return process.env.MP_WEBHOOK_URL;
  }

  if (process.env.PUBLIC_BACKEND_URL) {
    return `${process.env.PUBLIC_BACKEND_URL}/api/payments/mercadopago/webhook`;
  }

  return undefined;
}

function parsePaymentId(req: Request) {
  const queryRaw = req.query['data.id'] ?? req.query['id'];
  const queryId = Array.isArray(queryRaw) ? queryRaw[0] : queryRaw;
  if (queryId !== undefined && queryId !== null) {
    return String(queryId);
  }

  const body = req.body as { data?: { id?: string | number }; id?: string | number } | undefined;
  const bodyId = body?.data?.id ?? body?.id;
  if (bodyId !== undefined && bodyId !== null) {
    return String(bodyId);
  }

  return undefined;
}

function parseWebhookType(req: Request) {
  const bodyType = (req.body as { type?: string } | undefined)?.type;
  const queryTypeRaw = req.query['type'];
  const queryTopicRaw = req.query['topic'];
  const queryType = Array.isArray(queryTypeRaw) ? queryTypeRaw[0] : queryTypeRaw;
  const queryTopic = Array.isArray(queryTopicRaw) ? queryTopicRaw[0] : queryTopicRaw;
  return bodyType ?? queryType ?? queryTopic ?? null;
}

function mapPaymentStatus(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'approved':
      return 'aprobado' as const;
    case 'rejected':
    case 'cancelled':
      return 'rechazado' as const;
    case 'refunded':
    case 'charged_back':
      return 'reembolsado' as const;
    case 'pending':
    case 'in_process':
    case 'authorized':
    default:
      return 'pendiente' as const;
  }
}

function resolveOrderIdFromPayment(mpPayment: MercadoPagoPayment) {
  const metadata = mpPayment.metadata ?? {};
  return (
    mpPayment.external_reference ??
    (typeof metadata.orderId === 'string' ? metadata.orderId : undefined) ??
    (typeof metadata.order_id === 'string' ? metadata.order_id : undefined)
  );
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyWebhookSignature(req: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature || Array.isArray(signature) || !requestId || Array.isArray(requestId)) {
    return false;
  }

  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=').map((item) => item.trim());
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1?.toLowerCase();
  if (!ts || !v1) {
    return false;
  }

  const dataId = parsePaymentId(req);
  if (!dataId) {
    return false;
  }

  const normalizedId = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${normalizedId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return safeEqual(hmac, v1);
}

export async function createMercadoPagoPayment(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: parsed.data.orderId, userId },
    relations: { payment: true },
  });

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status !== 'pendiente_pago') {
    return res.status(409).json({ error: 'Order is not pending payment' });
  }

  if (order.payment?.status === 'aprobado') {
    return res.status(409).json({ error: 'Payment already approved' });
  }

  const amount = Number(order.total);
  if (Number.isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid order total' });
  }

  const envPayerEmail = (process.env.MP_PAYER_EMAIL || '').trim();
  const payerEmail = envPayerEmail || parsed.data.payer.email;
  if (!payerEmail) {
    return res.status(400).json({ error: 'Missing payer email' });
  }

  const payload = {
    transaction_amount: amount,
    token: parsed.data.token,
    description: `Order ${order.id}`,
    installments: parsed.data.installments,
    payment_method_id: parsed.data.payment_method_id,
    ...(parsed.data.issuer_id ? { issuer_id: parsed.data.issuer_id } : {}),
    payer: {
      email: payerEmail,
    },
    external_reference: order.id,
    metadata: {
      orderId: order.id,
      paymentId: order.payment?.id,
    },
    notification_url: buildNotificationUrl(),
  };
  if (process.env.NODE_ENV === 'development') {
    console.log('[MercadoPago] Payer email used:', payerEmail);
  }

  let mpPayment: MercadoPagoPayment;
  try {
    mpPayment = await createPayment(payload);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Mercado Pago request failed';
    const status =
      (error as { status?: number } | null | undefined)?.status ?? 500;
    const data =
      (error as { data?: unknown } | null | undefined)?.data ?? undefined;

    return res.status(502).json({
      error: 'Failed to create Mercado Pago payment',
      details,
      ...(process.env.NODE_ENV === 'development' ? { mp: data } : {}),
      status,
    });
  }

  const paymentRepo = AppDataSource.getRepository(Payment);
  const payment =
    order.payment ??
    paymentRepo.create({
      orderId: order.id,
      provider: 'mercadopago',
      status: 'pendiente',
      amount: order.total,
    });

  payment.provider = 'mercadopago';
  payment.status = 'pendiente';
  payment.amount = order.total;
  payment.transactionId =
    mpPayment?.id !== undefined && mpPayment?.id !== null
      ? String(mpPayment.id)
      : payment.transactionId ?? null;
  payment.raw = {
    ...(payment.raw ?? {}),
    mercado_pago: mpPayment,
  };

  await paymentRepo.save(payment);

  const nextAction =
    mpPayment.point_of_interaction ?? mpPayment.three_ds_info ?? null;

  return res.status(201).json({
    paymentId:
      mpPayment?.id !== undefined && mpPayment?.id !== null
        ? String(mpPayment.id)
        : null,
    status: mpPayment.status ?? 'unknown',
    status_detail: mpPayment.status_detail ?? null,
    next_action: nextAction,
  });
}

export async function createMercadoPagoPreference(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = createPreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: parsed.data.orderId, userId },
    relations: { items: true, payment: true, user: true },
  });

  if (!order || !order.payment) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.payment.status === 'aprobado') {
    return res.status(409).json({ error: 'Payment already approved' });
  }

  if (!order.items || order.items.length === 0) {
    return res.status(400).json({ error: 'Order has no items' });
  }

  const items = order.items.map((item) => {
    const unitPrice = Number(item.unitPrice);
    return {
      title: item.productName,
      quantity: item.quantity,
      unit_price: unitPrice,
      currency_id: order.currency,
    };
  });

  if (items.some((item) => Number.isNaN(item.unit_price))) {
    return res.status(400).json({ error: 'Invalid item price' });
  }

  const backUrls = buildBackUrls();
  const payerEmail = (process.env.MP_PAYER_EMAIL || '').trim();
  const disableAccountMoney =
    (process.env.MP_DISABLE_ACCOUNT_MONEY ?? 'true').toLowerCase() === 'true';
  const paymentMethods = disableAccountMoney
    ? { excluded_payment_types: [{ id: 'account_money' }] }
    : undefined;
  const payload: MercadoPagoPreferencePayload = {
    items,
    back_urls: backUrls,
    payment_methods: paymentMethods,
    external_reference: order.id,
    metadata: {
      orderId: order.id,
      paymentId: order.payment.id,
    },
    notification_url: buildNotificationUrl(),
    payer: payerEmail ? { email: payerEmail } : undefined,
  };
  if (process.env.NODE_ENV === 'development') {
    console.log('[MercadoPago] Preference payload:', payload);
  }

  let preference;
  try {
    preference = await createPreference(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Mercado Pago request failed';
    if (message.includes('account_money cannot be excluded')) {
      try {
        const retryPayload = { ...payload };
        delete retryPayload.payment_methods;
        preference = await createPreference(retryPayload);
      } catch (retryError) {
        const details =
          retryError instanceof Error
            ? retryError.message
            : 'Mercado Pago request failed';
        const status =
          (retryError as { status?: number } | null | undefined)?.status ?? 500;
        const data =
          (retryError as { data?: unknown } | null | undefined)?.data ??
          undefined;
        return res.status(502).json({
          error: 'Failed to create Mercado Pago preference',
          details,
          ...(process.env.NODE_ENV === 'development' ? { mp: data } : {}),
          status,
        });
      }
    } else {
    const details =
      error instanceof Error ? error.message : 'Mercado Pago request failed';
    const status =
      (error as { status?: number } | null | undefined)?.status ?? 500;
    const data =
      (error as { data?: unknown } | null | undefined)?.data ?? undefined;

    return res.status(502).json({
      error: 'Failed to create Mercado Pago preference',
      details,
      ...(process.env.NODE_ENV === 'development' ? { mp: data } : {}),
      status,
    });
    }
  }

  const paymentRepo = AppDataSource.getRepository(Payment);
  order.payment.provider = 'mercadopago';
  order.payment.status = 'pendiente';
  order.payment.raw = {
    ...(order.payment.raw ?? {}),
    preference: {
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    },
  };
  await paymentRepo.save(order.payment);

  return res.status(201).json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
  });
}

export async function mercadoPagoWebhook(req: Request, res: Response) {
  const hasSecret = Boolean(process.env.MP_WEBHOOK_SECRET);
  if (hasSecret && !verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (!hasSecret && process.env.NODE_ENV === 'development') {
    console.warn('[MercadoPago] Webhook signature validation skipped (missing MP_WEBHOOK_SECRET).');
  }

  const type = parseWebhookType(req);
  if (type && type !== 'payment') {
    return res.json({ ok: true });
  }

  const paymentId = parsePaymentId(req);
  if (!paymentId) {
    return res.json({ ok: true });
  }

  await ensureDataSource();

  let mpPayment: MercadoPagoPayment;
  try {
    mpPayment = await getPayment(paymentId);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Mercado Pago payment' });
  }

  const orderId = resolveOrderIdFromPayment(mpPayment);
  if (!orderId) {
    return res.json({ ok: true });
  }

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: { items: true, payment: true },
  });

  if (!order || !order.payment) {
    return res.json({ ok: true });
  }

  const payment = order.payment;
  const paymentRepo = AppDataSource.getRepository(Payment);
  const mappedStatus = mapPaymentStatus(mpPayment.status);

  if (mappedStatus === 'aprobado') {
    if (payment.status !== 'aprobado') {
      try {
        await AppDataSource.manager.transaction(async (manager) => {
          const productRepo = manager.getRepository(Product);
          const orderItemRepo = manager.getRepository(OrderItem);
          const paymentRepoTx = manager.getRepository(Payment);
          const orderRepoTx = manager.getRepository(Order);

          const items = await orderItemRepo.find({ where: { orderId: order.id } });

          for (const item of items) {
            const product = await productRepo.findOne({
              where: { id: item.productId },
            });

            if (!product) {
              throw new Error('missing_product');
            }

            if (product.stock < item.quantity) {
              throw new Error('stock_insufficient');
            }
          }

          for (const item of items) {
            await productRepo.decrement(
              { id: item.productId },
              'stock',
              item.quantity,
            );
          }

          payment.status = 'aprobado';
          order.status = 'pagado';
          payment.provider = 'mercadopago';
          payment.transactionId = String(mpPayment.id);
          payment.raw = {
            ...(payment.raw ?? {}),
            mercado_pago: mpPayment,
          };

          await paymentRepoTx.save(payment);
          await orderRepoTx.save(order);
        });
      } catch (error) {
        if ((error as Error).message === 'stock_insufficient') {
          return res.status(409).json({ error: 'Insufficient stock for approval' });
        }
        if ((error as Error).message === 'missing_product') {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(500).json({ error: 'Failed to approve payment' });
      }
    } else {
      payment.provider = 'mercadopago';
      payment.transactionId = String(mpPayment.id);
      payment.raw = {
        ...(payment.raw ?? {}),
        mercado_pago: mpPayment,
      };
      await AppDataSource.manager.transaction(async (manager) => {
        const paymentRepoTx = manager.getRepository(Payment);
        const orderRepoTx = manager.getRepository(Order);

        if (order.status !== 'pagado') {
          order.status = 'pagado';
          await orderRepoTx.save(order);
        }

        await paymentRepoTx.save(payment);
      });
    }
  } else if (mappedStatus === 'reembolsado') {
    if (payment.status !== 'reembolsado') {
      try {
        await AppDataSource.manager.transaction(async (manager) => {
          const productRepo = manager.getRepository(Product);
          const orderItemRepo = manager.getRepository(OrderItem);
          const paymentRepoTx = manager.getRepository(Payment);
          const orderRepoTx = manager.getRepository(Order);

          if (payment.status === 'aprobado') {
            const items = await orderItemRepo.find({ where: { orderId: order.id } });
            for (const item of items) {
              await productRepo.increment(
                { id: item.productId },
                'stock',
                item.quantity,
              );
            }
          }

          payment.status = 'reembolsado';
          payment.provider = 'mercadopago';
          payment.transactionId = String(mpPayment.id);
          payment.raw = {
            ...(payment.raw ?? {}),
            mercado_pago: mpPayment,
          };

          order.status = 'reembolsado';
          await paymentRepoTx.save(payment);
          await orderRepoTx.save(order);
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to refund payment' });
      }
    } else if (order.status !== 'reembolsado') {
      order.status = 'reembolsado';
      await AppDataSource.getRepository(Order).save(order);
    }
  } else {
    payment.status = mappedStatus;
    payment.provider = 'mercadopago';
    payment.transactionId = String(mpPayment.id);
    payment.raw = {
      ...(payment.raw ?? {}),
      mercado_pago: mpPayment,
    };
    await AppDataSource.manager.transaction(async (manager) => {
      const paymentRepoTx = manager.getRepository(Payment);
      const orderRepoTx = manager.getRepository(Order);

      if (order.status !== 'pendiente_pago') {
        order.status = 'pendiente_pago';
        await orderRepoTx.save(order);
      }

      await paymentRepoTx.save(payment);
    });
  }

  return res.json({ ok: true });
}

export async function getMercadoPagoPaymentStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { paymentId } = req.params;
  if (!paymentId || Array.isArray(paymentId)) {
    return res.status(400).json({ error: 'Invalid payment id' });
  }

  await ensureDataSource();

  const paymentRepo = AppDataSource.getRepository(Payment);
  const paymentRecord = await paymentRepo.findOne({
    where: { transactionId: String(paymentId) },
    relations: { order: true },
  });

  if (!paymentRecord || paymentRecord.order?.userId !== userId) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  let mpPayment: MercadoPagoPayment;
  try {
    mpPayment = await getPayment(paymentId);
  } catch (error) {
    return res.status(502).json({ error: 'Failed to fetch Mercado Pago payment' });
  }

  const orderId =
    resolveOrderIdFromPayment(mpPayment) ?? paymentRecord.orderId ?? null;

  return res.json({
    paymentId: mpPayment?.id ? String(mpPayment.id) : String(paymentId),
    status: mapPaymentStatus(mpPayment.status),
    mp_status: mpPayment.status ?? null,
    status_detail: mpPayment.status_detail ?? null,
    orderId,
  });
}

export async function getOrderPayment(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { orderId } = req.params;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
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

  return res.json({
    orderId: order.id,
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          provider: order.payment.provider,
          amount: order.payment.amount,
          transaction_id: order.payment.transactionId,
        }
      : null,
  });
}
