import { Router } from 'express';
import { optionalAuth } from '../../auth/middlewares/auth.middleware';
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  getCart,
  updateCartItem,
} from '../controllers/cart.controller';

const router = Router();

router.get('/cart', optionalAuth, getCart);
router.post('/cart/items', optionalAuth, addCartItem);
router.put('/cart/items/:productId', optionalAuth, updateCartItem);
router.delete('/cart/items/:productId', optionalAuth, deleteCartItem);
router.delete('/cart', optionalAuth, clearCart);

export default router;
