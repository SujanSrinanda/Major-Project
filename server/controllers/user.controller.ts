import { Response, NextFunction } from 'express';
import { userService, UserService } from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class UserController {
  constructor(private userSvc: UserService = userService) {}

  submitOnboarding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.userSvc.submitOnboarding(req.user!, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.userSvc.getProfile(req.user!);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.userSvc.updateProfile(req.user!, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();
