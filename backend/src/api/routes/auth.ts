import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.post('/verify-otp', authRateLimiter, authController.verifyOtp);
authRoutes.post('/resend-otp', authRateLimiter, authController.resendOtp);
authRoutes.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', authRateLimiter, authController.resetPassword);
authRoutes.get('/profile', authenticate, authController.profile);
authRoutes.put('/profile', authenticate, authController.updateProfile);
authRoutes.post('/change-password', authenticate, authController.changePassword);
