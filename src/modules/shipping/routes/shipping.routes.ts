import { Router } from 'express';
import { quoteCorreoArgentino } from '../controllers/shipping.controller';

const router = Router();

router.post('/shipping/cotizar/correo-argentino', quoteCorreoArgentino);

export default router;
