import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter, otpSendRateLimiter } from '../middleware/rateLimit.middleware';

export const authRouter = Router();

authRouter.post('/signup', authRateLimiter, authController.signup);
authRouter.post('/send-otp', otpSendRateLimiter, authController.sendOtp);
authRouter.post('/verify-otp', authRateLimiter, authController.verifyOtp);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRouter.post('/reset-password', authRateLimiter, authController.resetPassword);
