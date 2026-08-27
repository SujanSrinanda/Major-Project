import { Response, NextFunction } from 'express';
import { contactService, ContactService } from '../services/contact.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ContactController {
  constructor(private contactSvc: ContactService = contactService) {}

  getContacts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.contactSvc.getContacts(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  createContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.contactSvc.createContact(req.user!.id, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  updateContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contactSvc.updateContact(id, req.user!.id, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  deleteContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contactSvc.deleteContact(id, req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const contactController = new ContactController();
