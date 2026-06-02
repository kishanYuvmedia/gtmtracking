import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.get('/profile', authenticate, authController.profile);
