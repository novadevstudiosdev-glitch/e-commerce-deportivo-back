import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  getCart,
  updateCartItem,
} from '../controllers/cart.controller';

const router = Router();

router.get('/cart', requireAuth, getCart);
router.post('/cart/items', requireAuth, addCartItem);
router.put('/cart/items/:productId', requireAuth, updateCartItem);
router.delete('/cart/items/:productId', requireAuth, deleteCartItem);
router.delete('/cart', requireAuth, clearCart);

export default router;
