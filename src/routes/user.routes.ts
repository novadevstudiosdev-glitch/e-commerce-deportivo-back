import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createAddress,
  deleteAddress,
  getMe,
  listAddresses,
  updateAddress,
  updateMe,
} from '../controllers/user.controller';

const router = Router();

router.get('/users/me', requireAuth, getMe);
router.put('/users/me', requireAuth, updateMe);

router.get('/users/me/addresses', requireAuth, listAddresses);
router.post('/users/me/addresses', requireAuth, createAddress);
router.put('/users/me/addresses/:id', requireAuth, updateAddress);
router.delete('/users/me/addresses/:id', requireAuth, deleteAddress);

export default router;
