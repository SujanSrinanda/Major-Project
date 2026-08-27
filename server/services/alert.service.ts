import { StoredAlert } from '../db';
import { alertRepository, AlertRepository } from '../repositories/alert.repository';

export class AlertService {
  constructor(private alertRepo: AlertRepository = alertRepository) {}

  async getAlerts(userId: string) {
    const alerts = await this.alertRepo.findByUserId(userId);
    return { status: 200, data: alerts };
  }

  async updateAlert(id: string, userId: string, updates: Partial<StoredAlert>) {
    const success = await this.alertRepo.update(id, userId, updates);
    if (!success) {
      return { status: 404, data: { error: 'Alert not found or unauthorized.' } };
    }
    return { status: 200, data: { success: true } };
  }

  async clearAlerts(userId: string) {
    await this.alertRepo.clearByUserId(userId);
    return { status: 200, data: { success: true } };
  }

  async deleteAlert(id: string, userId: string) {
    const success = await this.alertRepo.delete(id, userId);
    if (!success) {
      return { status: 404, data: { error: 'Alert not found or unauthorized.' } };
    }
    return { status: 200, data: { success: true } };
  }
}

export const alertService = new AlertService();
