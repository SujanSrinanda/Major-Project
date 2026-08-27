import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  constructor(private authSvc: AuthService = authService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authSvc.signup(req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { channel, target } = req.body;
      const result = await this.authSvc.sendOtp(channel, target);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { channel, target, otp } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const result = await this.authSvc.verifyOtp(channel, target, otp, token);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password, deviceFingerprint } = req.body;
      const userAgent = req.headers['user-agent'] || 'Web Browser';
      const result = await this.authSvc.login(identifier, password, deviceFingerprint, userAgent);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.authSvc.getMe(req.user!);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.authSvc.logout(req.token);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { target, channel } = req.body;
      const result = await this.authSvc.forgotPassword(target, channel);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { target, otp, newPassword } = req.body;
      const result = await this.authSvc.resetPassword(target, otp, newPassword);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
