import type { Request, Response } from 'express';
import { adminProductService } from '../services/admin.product.service';
import { ensureAdmin } from '../../../common/utils/ensure-admin';

export async function listCatalogSizes(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const type = req.query.type;
  if (type && type !== 'ropa' && type !== 'calzado' && type !== 'unico') {
    return res.status(400).json({ error: 'Invalid size type' });
  }

  const sizes = await adminProductService.listSizes(
    type as 'ropa' | 'calzado' | 'unico' | undefined,
  );

  return res.json(sizes);
}

export async function listCatalogColors(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const colors = await adminProductService.listColors();
  return res.json(colors);
}

export async function listCatalogCategories(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const categories = await adminProductService.listCategories();
  return res.json(categories);
}

export async function listCatalogBrands(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const brands = await adminProductService.listBrands();
  return res.json(brands);
}

export async function listCatalogSports(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const sports = await adminProductService.listSports();
  return res.json(sports);
}
