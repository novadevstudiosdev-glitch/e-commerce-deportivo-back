import { Router } from 'express';
import { requireAdmin } from '../../auth/middlewares/auth.middleware';
import {
  listCatalogColors,
  listCatalogSizes,
  listCatalogCategories,
  listCatalogBrands,
  listCatalogSports,
} from '../controllers/admin.catalog.controller';

const router = Router();

router.use(requireAdmin);

router.get('/sizes', listCatalogSizes);
router.get('/colors', listCatalogColors);
router.get('/categories', listCatalogCategories);
router.get('/brands', listCatalogBrands);
router.get('/sports', listCatalogSports);

export default router;
