import type { Request, Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../../../database/data-source';
import { Order } from '../../../database/entities/Order';
import { OrderItem } from '../../../database/entities/OrderItem';
import { Payment } from '../../../database/entities/Payment';
import { Product } from '../../../database/entities/Product';
import { createOrderSchema } from '../schemas/order.schema';

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

function consolidateItems(
  items: Array<{ productId: string; quantity: number }>,
) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

export async function createOrder(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { items, notes } = parsed.data;
  const consolidated = consolidateItems(items);

  await ensureDataSource();

  const productRepo = AppDataSource.getRepository(Product);
  const productIds = consolidated.map((item) => item.productId);
  const products = await productRepo.find({
    where: { id: In(productIds) },
  });

  const foundIds = new Set(products.map((product) => product.id));
  const missingIds = productIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return res.status(404).json({ error: 'Products not found', missingIds });
  }

  const inactiveIds = products
    .filter((product) => !product.isActive)
    .map((product) => product.id);

  if (inactiveIds.length > 0) {
    return res
      .status(400)
      .json({ error: 'Product inactive', inactiveIds });
  }

  const quantityById = new Map(
    consolidated.map((item) => [item.productId, item.quantity]),
  );

  const insufficient = products
    .filter((product) => product.stock < (quantityById.get(product.id) ?? 0))
    .map((product) => ({
      productId: product.id,
      available: product.stock,
      requested: quantityById.get(product.id) ?? 0,
    }));

  if (insufficient.length > 0) {
    return res
      .status(409)
      .json({ error: 'Insufficient stock', insufficient });
  }

  let subtotalValue = 0;
  const orderItems = products.map((product) => {
    const quantity = quantityById.get(product.id) ?? 0;
    const unitPrice = Number(product.price);
    const subtotalItem = unitPrice * quantity;
    subtotalValue += subtotalItem;

    return {
      productId: product.id,
      productName: product.name,
      unitPrice: formatMoney(unitPrice),
      quantity,
      subtotal: formatMoney(subtotalItem),
    };
  });

  const subtotal = formatMoney(subtotalValue);
  const total = subtotal;

  const result = await AppDataSource.manager.transaction(async (manager) => {
    const orderRepo = manager.getRepository(Order);
    const itemRepo = manager.getRepository(OrderItem);
    const paymentRepo = manager.getRepository(Payment);

    const order = orderRepo.create({
      userId,
      status: 'pendiente_pago',
      currency: 'ARS',
      subtotal,
      shippingTotal: formatMoney(0),
      discountTotal: formatMoney(0),
      total,
      notes: notes ?? null,
    });

    const savedOrder = await orderRepo.save(order);

    const itemsToSave = orderItems.map((item) =>
      itemRepo.create({
        orderId: savedOrder.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }),
    );

    await itemRepo.save(itemsToSave);

    const payment = paymentRepo.create({
      orderId: savedOrder.id,
      provider: 'manual',
      status: 'pendiente',
      amount: total,
    });

    const savedPayment = await paymentRepo.save(payment);

    return { order: savedOrder, items: orderItems, payment: savedPayment };
  });

  return res.status(201).json({
    id: result.order.id,
    status: result.order.status,
    total: result.order.total,
    items: result.items.map((item) => ({
      productId: item.productId,
      product_name: item.productName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    payment: { status: result.payment.status },
  });
}
