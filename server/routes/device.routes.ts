import { Router } from 'express';
import { deviceController } from '../controllers/device.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const deviceRouter = Router();

deviceRouter.get('/', requireAuth, deviceController.getDevices);
deviceRouter.post('/register', requireAuth, deviceController.registerDevice);
deviceRouter.delete('/:id', requireAuth, deviceController.deleteDevice);
