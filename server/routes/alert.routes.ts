import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const alertRouter = Router();

alertRouter.get('/', requireAuth, alertController.getAlerts);
alertRouter.put('/:id', requireAuth, alertController.updateAlert);
alertRouter.delete('/', requireAuth, alertController.clearAlerts);
alertRouter.delete('/:id', requireAuth, alertController.deleteAlert);
