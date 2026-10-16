import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validator';
import { loginRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', loginRateLimiter, validateRequest(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
