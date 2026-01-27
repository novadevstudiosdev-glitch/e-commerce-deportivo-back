import { Router } from 'express';
import {
  getProductById,
  listProductCategories,
  listProducts,
} from '../controllers/product.controller';

const router = Router();

router.get('/products/categories', listProductCategories);
router.get('/products/:id', getProductById);
router.get('/products', listProducts);

export default router;
