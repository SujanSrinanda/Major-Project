import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const userRouter = Router();

userRouter.put('/me/onboarding', requireAuth, userController.submitOnboarding);
userRouter.get('/me/profile', requireAuth, userController.getProfile);
userRouter.put('/me/profile', requireAuth, userController.updateProfile);
