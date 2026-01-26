import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Product } from '../../../database/entities/Product';
import { stockAlertQuerySchema } from '../schemas/stock-alert.schema';

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

export async function listLowStock(req: Request, res: Response) {
  const parsed = stockAlertQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { threshold } = parsed.data;
  const repo = AppDataSource.getRepository(Product);
  const qb = repo.createQueryBuilder('product');

  qb.where('product.isActive = :active', { active: true });

  if (threshold !== undefined) {
    qb.andWhere('product.stock <= :threshold', { threshold });
  } else {
    qb.andWhere('product.stock <= product.lowStockThreshold');
  }

  const products = await qb
    .orderBy('product.stock', 'ASC')
    .getMany();

  return res.json({
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      low_stock_threshold: product.lowStockThreshold,
      category: product.category,
    })),
  });
}
