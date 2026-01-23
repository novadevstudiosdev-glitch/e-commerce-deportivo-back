import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares/auth.middleware';
import {
  createProduct,
  deleteProductById,
  getProductById,
  updateProductById,
} from '../controllers/admin.product.controller';

const router = Router();

router.post('/', requireAuth, requireRole('admin'), createProduct);
router.get('/:id', requireAuth, requireRole('admin'), getProductById);
router.put('/:id', requireAuth, requireRole('admin'), updateProductById);
router.delete('/:id', requireAuth, requireRole('admin'), deleteProductById);

export default router;
