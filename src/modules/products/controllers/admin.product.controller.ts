import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Product } from '../../../database/entities/Product';
import {
  productCreateSchema,
  productUpdateSchema,
} from '../schemas/product.schema';

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

function normalizeProductInput<T extends { name?: string; category?: string }>(
  data: T,
) {
  return {
    ...data,
    name: data.name?.trim(),
    category: data.category?.trim(),
  };
}

function mapProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
    category: product.category,
    images: product.images,
    is_active: product.isActive,
    is_featured: product.isFeatured,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

export async function createProduct(req: Request, res: Response) {
  const parsed = productCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const payload = normalizeProductInput(parsed.data);

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Product);

  const product = repo.create({
    name: payload.name,
    description: payload.description,
    price: payload.price,
    currency: payload.currency ?? 'ARS',
    stock: payload.stock ?? 0,
    category: payload.category,
    images: payload.images ?? null,
    isActive: payload.is_active ?? true,
    isFeatured: payload.is_featured ?? false,
  });

  const saved = await repo.save(product);
  return res.status(201).json(mapProduct(saved));
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id } });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(mapProduct(product));
}

export async function updateProductById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const payload = normalizeProductInput(parsed.data);

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id } });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (payload.name !== undefined) {
    product.name = payload.name;
  }
  if (payload.description !== undefined) {
    product.description = payload.description;
  }
  if (payload.price !== undefined) {
    product.price = payload.price;
  }
  if (payload.currency !== undefined) {
    product.currency = payload.currency;
  }
  if (payload.stock !== undefined) {
    if (payload.stock < 0) {
      return res.status(400).json({ error: 'Stock must be >= 0' });
    }
    product.stock = payload.stock;
  }
  if (payload.category !== undefined) {
    product.category = payload.category;
  }
  if (payload.images !== undefined) {
    product.images = payload.images;
  }
  if (payload.is_active !== undefined) {
    product.isActive = payload.is_active;
  }
  if (payload.is_featured !== undefined) {
    product.isFeatured = payload.is_featured;
  }

  const saved = await repo.save(product);
  return res.json(mapProduct(saved));
}

export async function deleteProductById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id } });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  product.isActive = false;
  const saved = await repo.save(product);
  return res.json(mapProduct(saved));
}
