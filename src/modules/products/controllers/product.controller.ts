import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Product } from '../../../database/entities/Product';
import { productQuerySchema } from '../schemas/product.query.schema';

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

function serializeProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
    discount_percent: product.discountPercent,
    category: product.category,
    target: product.target,
    images: product.images,
    is_featured: product.isFeatured,
    created_at: product.createdAt,
  };
}

export async function listProducts(req: Request, res: Response) {
  const parsed = productQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { page, limit, q, category, target, minPrice, maxPrice, inStock, sort } =
    parsed.data;

  await ensureDataSource();

  const qb = AppDataSource.getRepository(Product)
    .createQueryBuilder('product')
    .where('product.is_active = true');

  if (q) {
    qb.andWhere(
      '(product.name ILIKE :q OR product.description ILIKE :q)',
      { q: `%${q}%` },
    );
  }

  if (category) {
    qb.andWhere('product.category = :category', { category });
  }

  if (target) {
    qb.andWhere('product.target = :target', { target });
  }

  if (minPrice !== undefined) {
    qb.andWhere('product.price >= :minPrice', { minPrice });
  }

  if (maxPrice !== undefined) {
    qb.andWhere('product.price <= :maxPrice', { maxPrice });
  }

  if (inStock === true) {
    qb.andWhere('product.stock > 0');
  }

  switch (sort) {
    case 'price_asc':
      qb.orderBy('product.price', 'ASC');
      break;
    case 'price_desc':
      qb.orderBy('product.price', 'DESC');
      break;
    case 'name_asc':
      qb.orderBy('product.name', 'ASC');
      break;
    case 'name_desc':
      qb.orderBy('product.name', 'DESC');
      break;
    default:
      qb.orderBy('product.created_at', 'DESC');
  }

  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  const data = items.map((product) => serializeProduct(product));

  return res.json({
    page,
    limit,
    total,
    data,
  });
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  await ensureDataSource();

  const product = await AppDataSource.getRepository(Product).findOne({
    where: { id, isActive: true },
  });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(serializeProduct(product));
}

export async function listProductCategories(_req: Request, res: Response) {
  await ensureDataSource();

  const rows = await AppDataSource.getRepository(Product)
    .createQueryBuilder('product')
    .select('DISTINCT product.category', 'category')
    .where('product.is_active = true')
    .orderBy('product.category', 'ASC')
    .getRawMany<{ category: string }>();

  const data = rows.map((row) => row.category).filter(Boolean);

  return res.json({ data });
}
