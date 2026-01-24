import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Cart } from '../../../database/entities/Cart';
import { CartItem } from '../../../database/entities/CartItem';
import { Product } from '../../../database/entities/Product';
import {
  createCartSessionId,
  getCartSessionId,
  setCartSessionCookie,
} from '../../../common/utils/cart-session';
import {
  cartItemSchema,
  cartItemUpdateSchema,
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
    relations: { items: { product: true } },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.json({ items: [], total: formatMoney(0) });
  }

  let totalValue = 0;
  const items = cart.items
    .filter((item) => item.product)
    .map((item) => {
      const unitPrice = Number(item.product.price);
      const subtotalValue = unitPrice * item.quantity;
      totalValue += subtotalValue;

      return {
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          currency: item.product.currency,
          stock: item.product.stock,
          images: item.product.images,
          category: item.product.category,
        },
        quantity: item.quantity,
        subtotal: formatMoney(subtotalValue),
      };
    });

  return res.json({ items, total: formatMoney(totalValue) });
}

export async function addCartItem(req: Request, res: Response) {
  const userId = req.user?.id;

  const parsed = cartItemSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { productId, quantity } = parsed.data;
  const productRepo = AppDataSource.getRepository(Product);
  const product = await productRepo.findOne({ where: { id: productId } });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!product.isActive) {
    return res.status(400).json({ error: 'Product inactive' });
  }

  const sessionId = userId ? null : resolveSessionId(req, res, true);
  const cart = await getOrCreateCart(userId, sessionId ?? undefined);
  const itemRepo = AppDataSource.getRepository(CartItem);
  let item = await itemRepo.findOne({ where: { cartId: cart.id, productId } });

  if (item) {
    item.quantity += quantity;
  } else {
    item = itemRepo.create({ cartId: cart.id, productId, quantity });
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

async function updateItemInCart(
  cartId: string,
  productId: string,
  quantity: number,
  res: Response,
) {
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
