import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const contactRouter = Router();

contactRouter.get('/', requireAuth, contactController.getContacts);
contactRouter.post('/', requireAuth, contactController.createContact);
contactRouter.put('/:id', requireAuth, contactController.updateContact);
contactRouter.delete('/:id', requireAuth, contactController.deleteContact);
