import type { Request, Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../../../database/data-source';
import { Cart } from '../../../database/entities/Cart';
import { CartItem } from '../../../database/entities/CartItem';
import { Coupon } from '../../../database/entities/Coupon';
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getDiscountedUnitPrice(product: Product) {
  const unitPrice = Number(product.price);
  const discountPercent = Math.min(
    Math.max(product.discountPercent ?? 0, 0),
    100,
  );
  const discounted = unitPrice * (1 - discountPercent / 100);
  return {
    unitPrice,
    discountPercent,
    discountedUnitPrice: roundMoney(discounted),
  };
}

function validateCoupon(
  coupon: Coupon,
  baseTotal: number,
): { ok: true } | { ok: false; error: string } {
  if (!coupon.active) {
    return { ok: false, error: 'Coupon inactive' };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: 'Coupon not started' };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { ok: false, error: 'Coupon expired' };
  }

  const minOrderTotal = Number(coupon.minOrderTotal ?? 0);
  if (minOrderTotal > 0 && baseTotal < minOrderTotal) {
    return { ok: false, error: 'Minimum order total not reached' };
  }

  return { ok: true };
}

function buildOrderItems(
  products: Product[],
  quantityById: Map<string, number>,
  coupon?: Coupon | null,
) {
  let itemsSubtotal = 0;
  let productDiscountTotal = 0;
  const items = products.map((product) => {
    const quantity = quantityById.get(product.id) ?? 0;
    const { unitPrice, discountedUnitPrice } = getDiscountedUnitPrice(product);
    const subtotalItem = unitPrice * quantity;
    const lineDiscount = (unitPrice - discountedUnitPrice) * quantity;
    itemsSubtotal += subtotalItem;
    productDiscountTotal += lineDiscount;

    return {
      productId: product.id,
      productName: product.name,
      unitPrice: formatMoney(unitPrice),
      quantity,
      subtotal: formatMoney(subtotalItem),
    };
  });

  itemsSubtotal = roundMoney(itemsSubtotal);
  productDiscountTotal = roundMoney(productDiscountTotal);
  const discountedSubtotal = roundMoney(itemsSubtotal - productDiscountTotal);

  let couponDiscount = 0;
  if (coupon) {
    const validation = validateCoupon(coupon, discountedSubtotal);
    if (validation.ok) {
      if (coupon.type === 'percent') {
        couponDiscount = roundMoney(
          (discountedSubtotal * Number(coupon.value)) / 100,
        );
      } else {
        couponDiscount = roundMoney(
          Math.min(discountedSubtotal, Number(coupon.value)),
        );
      }
    }
  }

  const discountTotal = roundMoney(productDiscountTotal + couponDiscount);
  const total = roundMoney(itemsSubtotal - discountTotal);

  return {
    items,
    subtotal: formatMoney(itemsSubtotal),
    discountedSubtotal: formatMoney(discountedSubtotal),
    discountTotal: formatMoney(discountTotal),
    total: formatMoney(total),
  };
}

async function findCouponByCode(code?: string) {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const couponRepo = AppDataSource.getRepository(Coupon);
  return couponRepo.findOne({ where: { code: normalized } });
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

  const { items, notes, coupon_code } = parsed.data;
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

  let coupon: Coupon | null = null;
  if (coupon_code) {
    coupon = await findCouponByCode(coupon_code);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
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

  const { items: orderItems, subtotal, discountedSubtotal, discountTotal, total } =
    buildOrderItems(
    products,
    quantityById,
    coupon,
  );

  if (coupon) {
    const validation = validateCoupon(coupon, Number(discountedSubtotal));
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }
  }

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
      discountTotal,
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
    discount_total: result.order.discountTotal,
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

export async function createOrderFromCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({
    where: { userId },
    relations: { items: true, coupon: true },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(400).json({ error: 'carrito vacío' });
  }

  const invalidItems = cart.items.filter((item) => item.quantity <= 0);
  if (invalidItems.length > 0) {
    return res.status(400).json({ error: 'Invalid item quantity' });
  }

  const productIds = cart.items.map((item) => item.productId);
  const productRepo = AppDataSource.getRepository(Product);
  const products = await productRepo.find({ where: { id: In(productIds) } });

  const foundIds = new Set(products.map((product) => product.id));
  const missingIds = productIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return res.status(404).json({ error: 'Products not found', missingIds });
  }

  const inactiveIds = products
    .filter((product) => !product.isActive)
    .map((product) => product.id);
  if (inactiveIds.length > 0) {
    return res.status(400).json({ error: 'Product inactive', inactiveIds });
  }

  const quantityById = new Map(
    cart.items.map((item) => [item.productId, item.quantity]),
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

  const coupon = cart.coupon ?? null;

  const { items: orderItems, subtotal, discountedSubtotal, discountTotal, total } =
    buildOrderItems(
    products,
    quantityById,
    coupon,
  );

  if (coupon) {
    const validation = validateCoupon(coupon, Number(discountedSubtotal));
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }
  }

  const result = await AppDataSource.manager.transaction(async (manager) => {
    const orderRepo = manager.getRepository(Order);
    const itemRepo = manager.getRepository(OrderItem);
    const paymentRepo = manager.getRepository(Payment);
    const cartItemRepo = manager.getRepository(CartItem);
    const cartRepoTx = manager.getRepository(Cart);

    const order = orderRepo.create({
      userId,
      status: 'pendiente_pago',
      currency: 'ARS',
      subtotal,
      shippingTotal: formatMoney(0),
      discountTotal,
      total,
      notes: null,
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

    await cartItemRepo.delete({ cartId: cart.id });
    await cartRepoTx.update({ id: cart.id }, { couponId: null });

    return { order: savedOrder, items: orderItems, payment: savedPayment };
  });

  return res.status(201).json({
    orderId: result.order.id,
    status: result.order.status,
    total: result.order.total,
    discount_total: result.order.discountTotal,
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
