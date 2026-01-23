import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Cart } from '../../../database/entities/Cart';
import { CartItem } from '../../../database/entities/CartItem';
import { Product } from '../../../database/entities/Product';
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

async function getOrCreateCart(userId: string) {
  const cartRepo = AppDataSource.getRepository(Cart);
  let cart = await cartRepo.findOne({ where: { userId } });

  if (!cart) {
    cart = cartRepo.create({ userId });
    cart = await cartRepo.save(cart);
  }

  return cart;
}

export async function getCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({
    where: { userId },
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
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

  const cart = await getOrCreateCart(userId);
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
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
  const cart = await cartRepo.findOne({ where: { userId } });

  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const itemRepo = AppDataSource.getRepository(CartItem);
  const item = await itemRepo.findOne({
    where: { cartId: cart.id, productId: paramsParsed.data.productId },
  });

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  item.quantity = parsed.data.quantity;
  await itemRepo.save(item);

  return res.json({ ok: true });
}

export async function deleteCartItem(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const paramsParsed = cartProductIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    const issue = paramsParsed.error.issues[0];
    const field = issue.path.join('.') || 'params';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({ where: { userId } });

  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const itemRepo = AppDataSource.getRepository(CartItem);
  const item = await itemRepo.findOne({
    where: { cartId: cart.id, productId: paramsParsed.data.productId },
  });

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  await itemRepo.remove(item);

  return res.json({ ok: true });
}

export async function clearCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureDataSource();

  const cartRepo = AppDataSource.getRepository(Cart);
  const cart = await cartRepo.findOne({ where: { userId } });

  if (!cart) {
    return res.json({ ok: true });
  }

  await AppDataSource.getRepository(CartItem).delete({ cartId: cart.id });

  return res.json({ ok: true });
}
