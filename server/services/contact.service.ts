import { StoredContact } from '../db';
import { contactRepository, ContactRepository } from '../repositories/contact.repository';

export class ContactService {
  constructor(private contactRepo: ContactRepository = contactRepository) {}

  async getContacts(userId: string) {
    const contacts = await this.contactRepo.findByUserId(userId);
    return { status: 200, data: contacts };
  }

  async createContact(userId: string, data: { name?: string; phone?: string; email?: string; isFavorite?: boolean }) {
    const newContact: StoredContact = {
      id: 'c-' + Date.now(),
      userId,
      name: data.name || 'Contact',
      phone: data.phone || '',
      email: data.email,
      isFavorite: !!data.isFavorite,
      isNew: true,
    };

    await this.contactRepo.create(newContact);
    return { status: 201, data: newContact };
  }

  async updateContact(id: string, userId: string, updates: Partial<StoredContact>) {
    const success = await this.contactRepo.update(id, userId, updates);
    if (!success) {
      return { status: 404, data: { error: 'Contact not found or unauthorized.' } };
    }
    return { status: 200, data: { success: true } };
  }

  async deleteContact(id: string, userId: string) {
    const success = await this.contactRepo.delete(id, userId);
    if (!success) {
      return { status: 404, data: { error: 'Contact not found or unauthorized.' } };
    }
    return { status: 200, data: { success: true } };
  }
}

export const contactService = new ContactService();
