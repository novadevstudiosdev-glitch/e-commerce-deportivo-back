import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Cart } from '../../../database/entities/Cart';
import { CartItem } from '../../../database/entities/CartItem';
import { Coupon } from '../../../database/entities/Coupon';
import { Product } from '../../../database/entities/Product';
import {
  createCartSessionId,
  getCartSessionId,
  setCartSessionCookie,
} from '../../../common/utils/cart-session';
import {
  cartItemSchema,
  cartItemUpdateSchema,
  cartCouponSchema,
  cartProductIdParamSchema,
} from '../schemas/cart.schema';

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

function calculateCartTotals(
  items: CartItem[],
  coupon?: Coupon | null,
) {
  let itemsSubtotal = 0;
  let productDiscountTotal = 0;

  for (const item of items) {
    if (!item.product) {
      continue;
    }
    const { unitPrice, discountedUnitPrice } =
      getDiscountedUnitPrice(item.product);
    const lineOriginal = unitPrice * item.quantity;
    const lineDiscount = (unitPrice - discountedUnitPrice) * item.quantity;
    itemsSubtotal += lineOriginal;
    productDiscountTotal += lineDiscount;
  }

  itemsSubtotal = roundMoney(itemsSubtotal);
  productDiscountTotal = roundMoney(productDiscountTotal);
  const discountedSubtotal = roundMoney(itemsSubtotal - productDiscountTotal);

  let couponDiscount = 0;
  if (coupon) {
    const validation = validateCoupon(coupon, discountedSubtotal);
    if (validation.ok) {
      if (coupon.type === 'percent') {
        const percent = Number(coupon.value);
        couponDiscount = roundMoney((discountedSubtotal * percent) / 100);
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
    itemsSubtotal,
    productDiscountTotal,
    couponDiscount,
    discountTotal,
    total,
  };
}
async function getOrCreateCart(userId?: string, sessionId?: string) {
  const cartRepo = AppDataSource.getRepository(Cart);
  let cart = await cartRepo.findOne({
    where: userId ? { userId } : { sessionId },
  });

  if (!cart) {
    cart = cartRepo.create({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
    });
    cart = await cartRepo.save(cart);
  }

  return cart;
}

async function validateStock(
  productId: string,
  desiredQuantity: number,
): Promise<
  | { ok: true; product: Product }
  | { ok: false; status: number; error: string; available?: number }
> {
  const productRepo = AppDataSource.getRepository(Product);
  const product = await productRepo.findOne({ where: { id: productId } });

  if (!product) {
    return { ok: false, status: 404, error: 'Product not found' };
  }

  if (!product.isActive) {
    return { ok: false, status: 400, error: 'Product inactive' };
  }

  if (product.stock < desiredQuantity) {
    return {
      ok: false,
      status: 409,
      error: 'Insufficient stock',
      available: product.stock,
    };
  }

  return { ok: true, product };
}

function resolveSessionId(req: Request, res?: Response, createIfMissing = false) {
  const sessionId = getCartSessionId(req);
  if (sessionId || !createIfMissing) {
    return sessionId;
  }

  const newSessionId = createCartSessionId();
  if (res) {
    setCartSessionCookie(res, newSessionId);
  }
  return newSessionId;
}

export async function getCart(req: Request, res: Response) {
  const userId = req.user?.id;
  const sessionId = userId ? null : resolveSessionId(req);

  await ensureDataSource();

  const where = userId
    ? { userId }
    : sessionId
      ? { sessionId }
      : undefined;

  if (!where) {
    return res.json({ items: [], total: formatMoney(0) });
  }

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({
    where,
    relations: { items: { product: true }, coupon: true },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.json({
      items: [],
      subtotal: formatMoney(0),
      discount_total: formatMoney(0),
      total: formatMoney(0),
      coupon: null,
    });
  }

  const totals = calculateCartTotals(cart.items, cart.coupon);
  const items = cart.items
    .filter((item) => item.product)
    .map((item) => {
      const { unitPrice, discountPercent, discountedUnitPrice } =
        getDiscountedUnitPrice(item.product);
      const subtotalValue = discountedUnitPrice * item.quantity;

      return {
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          currency: item.product.currency,
          stock: item.product.stock,
          discount_percent: discountPercent,
          images: item.product.images,
          category: item.product.category,
        },
        quantity: item.quantity,
        subtotal: formatMoney(subtotalValue),
        unit_price: formatMoney(unitPrice),
        discounted_unit_price: formatMoney(discountedUnitPrice),
      };
    });

  return res.json({
    items,
    subtotal: formatMoney(totals.itemsSubtotal),
    discount_total: formatMoney(totals.discountTotal),
    total: formatMoney(totals.total),
    coupon: cart.coupon
      ? { code: cart.coupon.code, type: cart.coupon.type, value: cart.coupon.value }
      : null,
  });
}

export async function addCartItem(req: Request, res: Response) {
  const userId = req.user?.id;

  const parsed = cartItemSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { productId, quantity } = parsed.data;

  await ensureDataSource();

  const sessionId = userId ? null : resolveSessionId(req, res, true);
  const cart = await getOrCreateCart(userId, sessionId ?? undefined);
  const itemRepo = AppDataSource.getRepository(CartItem);
  let item = await itemRepo.findOne({ where: { cartId: cart.id, productId } });

  const desiredQuantity = (item?.quantity ?? 0) + quantity;
  const stockCheck = await validateStock(productId, desiredQuantity);
  if (!stockCheck.ok) {
    return res.status(stockCheck.status).json({
      error: stockCheck.error,
      ...(stockCheck.available !== undefined
        ? { available: stockCheck.available }
        : {}),
    });
  }

  if (item) {
    item.quantity = desiredQuantity;
  } else {
    item = itemRepo.create({
      cartId: cart.id,
      productId,
      quantity: desiredQuantity,
    });
  }

  await itemRepo.save(item);

  return res.status(201).json({ ok: true });
}

export async function updateCartItem(req: Request, res: Response) {
  const userId = req.user?.id;

  const paramsParsed = cartProductIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    const issue = paramsParsed.error.issues[0];
    const field = issue.path.join('.') || 'params';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const parsed = cartItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  if (!userId) {
    const sessionId = resolveSessionId(req);
    if (!sessionId) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    const sessionCart = await cartRepo.findOne({ where: { sessionId } });
    if (!sessionCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    return updateItemInCart(
      sessionCart.id,
      paramsParsed.data.productId,
      parsed.data.quantity,
      res,
    );
  }

  const cart = await cartRepo.findOne({ where: { userId } });
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  return updateItemInCart(
    cart.id,
    paramsParsed.data.productId,
    parsed.data.quantity,
    res,
  );
}

export async function deleteCartItem(req: Request, res: Response) {
  const userId = req.user?.id;

  const paramsParsed = cartProductIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    const issue = paramsParsed.error.issues[0];
    const field = issue.path.join('.') || 'params';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  if (!userId) {
    const sessionId = resolveSessionId(req);
    if (!sessionId) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    const sessionCart = await cartRepo.findOne({ where: { sessionId } });
    if (!sessionCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    return deleteItemFromCart(
      sessionCart.id,
      paramsParsed.data.productId,
      res,
    );
  }

  const cart = await cartRepo.findOne({ where: { userId } });
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  return deleteItemFromCart(cart.id, paramsParsed.data.productId, res);
}

export async function clearCart(req: Request, res: Response) {
  const userId = req.user?.id;

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  if (!userId) {
    const sessionId = resolveSessionId(req);
    if (!sessionId) {
      return res.json({ ok: true });
    }
    const sessionCart = await cartRepo.findOne({ where: { sessionId } });
    if (!sessionCart) {
      return res.json({ ok: true });
    }
    await AppDataSource.getRepository(CartItem).delete({
      cartId: sessionCart.id,
    });
    return res.json({ ok: true });
  }

  const cart = await cartRepo.findOne({ where: { userId } });
  if (!cart) {
    return res.json({ ok: true });
  }

  await AppDataSource.getRepository(CartItem).delete({ cartId: cart.id });

  return res.json({ ok: true });
}

export async function applyCoupon(req: Request, res: Response) {
  const userId = req.user?.id;

  const parsed = cartCouponSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const code = parsed.data.code.trim().toUpperCase();
  const couponRepo = AppDataSource.getRepository(Coupon);
  const coupon = await couponRepo.findOne({ where: { code } });

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  const sessionId = userId ? null : resolveSessionId(req, res, true);
  const cart = await getOrCreateCart(userId, sessionId ?? undefined);

  const cartRepo = AppDataSource.getRepository(Cart);
  const fullCart = await cartRepo.findOne({
    where: { id: cart.id },
    relations: { items: { product: true }, coupon: true },
  });

  if (!fullCart || !fullCart.items || fullCart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const totals = calculateCartTotals(fullCart.items, coupon);
  const discountedSubtotal = totals.itemsSubtotal - totals.productDiscountTotal;
  const validation = validateCoupon(coupon, discountedSubtotal);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  fullCart.couponId = coupon.id;
  fullCart.coupon = coupon;
  await cartRepo.save(fullCart);

  return getCart(req, res);
}

export async function removeCoupon(req: Request, res: Response) {
  const userId = req.user?.id;

  await ensureDataSource();

  const sessionId = userId ? null : resolveSessionId(req);
  if (!userId && !sessionId) {
    return res.json({ ok: true });
  }

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({
    where: userId ? { userId } : sessionId ? { sessionId } : undefined,
  });

  if (!cart) {
    return res.json({ ok: true });
  }

  cart.couponId = null;
  await cartRepo.save(cart);

  return res.json({ ok: true });
}

async function updateItemInCart(
  cartId: string,
  productId: string,
  quantity: number,
  res: Response,
) {
  const stockCheck = await validateStock(productId, quantity);
  if (!stockCheck.ok) {
    return res.status(stockCheck.status).json({
      error: stockCheck.error,
      ...(stockCheck.available !== undefined
        ? { available: stockCheck.available }
        : {}),
    });
  }

  const itemRepo = AppDataSource.getRepository(CartItem);
  const item = await itemRepo.findOne({ where: { cartId, productId } });

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  item.quantity = quantity;
  await itemRepo.save(item);

  return res.json({ ok: true });
}

async function deleteItemFromCart(
  cartId: string,
  productId: string,
  res: Response,
) {
  const itemRepo = AppDataSource.getRepository(CartItem);
  const item = await itemRepo.findOne({ where: { cartId, productId } });

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  await itemRepo.remove(item);

  return res.json({ ok: true });
}
