import { Router } from 'express';
import { requireAdmin } from '../../auth/middlewares/auth.middleware';
import { listUsers, updateUserById } from '../controllers/admin.user.controller';

const router = Router();

router.use(requireAdmin);

router.get('/', listUsers);
router.patch('/:id', updateUserById);

export default router;
