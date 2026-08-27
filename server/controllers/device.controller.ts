import { Response, NextFunction } from 'express';
import { deviceService, DeviceService } from '../services/device.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DeviceController {
  constructor(private deviceSvc: DeviceService = deviceService) {}

  getDevices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.deviceSvc.getDevices(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  registerDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userAgent = req.headers['user-agent'] || 'Web Browser';
      const result = await this.deviceSvc.registerDevice(req.user!.id, userAgent, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  deleteDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.deviceSvc.deleteDevice(id, req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const deviceController = new DeviceController();
