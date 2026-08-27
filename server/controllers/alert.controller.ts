import { Response, NextFunction } from 'express';
import { alertService, AlertService } from '../services/alert.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AlertController {
  constructor(private alertSvc: AlertService = alertService) {}

  getAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.alertSvc.getAlerts(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  updateAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.alertSvc.updateAlert(id, req.user!.id, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  clearAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.alertSvc.clearAlerts(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  deleteAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.alertSvc.deleteAlert(id, req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const alertController = new AlertController();
