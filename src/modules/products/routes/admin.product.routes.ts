import { Router } from 'express';
import { requireRole } from '../../auth/middlewares/auth.middleware';
import {
  createProduct,
  deleteProductById,
  getProductById,
  listAdminProducts,
  updateProductById,
} from '../controllers/admin.product.controller';

const router = Router();

router.use(requireRole('admin', 'vendedor'));

router.get('/', listAdminProducts);
router.post('/', createProduct);
router.get('/:id', getProductById);
router.put('/:id', updateProductById);
router.delete('/:id', deleteProductById);

export default router;
