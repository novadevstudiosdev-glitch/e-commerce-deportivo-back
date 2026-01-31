import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Product } from '../../../database/entities/Product';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAdminProductDto } from '../dtos/admin-create-product.dto';
import { adminProductService } from '../services/admin.product.service';
import { ensureStaff } from '../../../common/utils/ensure-staff';
import { ensureAdmin } from '../../../common/utils/ensure-admin';
import { adminProductQuerySchema } from '../schemas/admin.product.query.schema';

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

function mapProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category_id: product.categoryId,
    brand_id: product.brandId,
    sport_id: product.sportId,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
    discount_percent: product.discountPercent,
    low_stock_threshold: product.lowStockThreshold,
    category: product.category,
    target: product.target,
    images: product.images,
    is_active: product.isActive,
    is_featured: product.isFeatured,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function flattenValidationErrors(errors: Array<{ property: string; constraints?: Record<string, string>; children?: any[] }>, parent = '') {
  const results: Array<{ field: string; message: string }> = [];
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      const message = Object.values(error.constraints)[0];
      results.push({ field, message });
    }
    if (error.children && error.children.length > 0) {
      results.push(...flattenValidationErrors(error.children, field));
    }
  }
  return results;
}

export async function createProduct(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  /**
   * curl -X POST http://localhost:3000/api/admin/products \
   *  -H "Authorization: Bearer <token>" \
   *  -H "Content-Type: application/json" \
   *  -d '{ "name":"Remera Ciclismo Pro 23","description":"...","category_id":"<uuid>","images":[{"url":"https://...","is_main":true,"sort_order":1}],"variants":[{"size_id":"<uuid>","color_id":"<uuid>","base_price":74000.99,"discount_percentage":0,"stock":10,"low_stock_threshold":2}] }'
   */
  const payload = plainToInstance(CreateAdminProductDto, req.body);
  const errors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const first = flattenValidationErrors(errors)[0];
    return res.status(400).json({
      error: `${first?.field || 'body'}: ${first?.message || 'Validation error'}`,
    });
  }

  try {
    const created = await adminProductService.createProductWithVariants(payload);
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return res.status(400).json({ error: message });
  }
}

export async function getProductById(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const product = await adminProductService.getProductDetail(id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(product);
}

export async function updateProductById(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const payload = plainToInstance(CreateAdminProductDto, req.body);
  const errors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const first = flattenValidationErrors(errors)[0];
    return res.status(400).json({
      error: `${first?.field || 'body'}: ${first?.message || 'Validation error'}`,
    });
  }

  try {
    const updated = await adminProductService.updateProductWithVariants(id, payload);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return res.status(400).json({ error: message });
  }
}

export async function deleteProductById(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

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

export async function listAdminProducts(req: Request, res: Response) {
  if (!ensureStaff(req, res)) {
    return;
  }

  const parsed = adminProductQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { page, limit, q, is_active } = parsed.data;

  const qb = AppDataSource.getRepository(Product).createQueryBuilder('product');
  qb.where('1=1');

  if (q) {
    qb.andWhere(
      '(product.name ILIKE :q OR product.description ILIKE :q OR product.category ILIKE :q)',
      { q: `%${q}%` },
    );
  }

  if (is_active !== undefined) {
    qb.andWhere('product.is_active = :isActive', { isActive: is_active });
  }

  const [items, total] = await qb
    .orderBy('product.updated_at', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return res.json({
    page,
    limit,
    total,
    data: items.map(mapProduct),
  });
}
