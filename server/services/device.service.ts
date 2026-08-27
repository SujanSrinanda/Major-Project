import { StoredDevice } from '../db';
import { deviceRepository, DeviceRepository } from '../repositories/device.repository';

export class DeviceService {
  constructor(private deviceRepo: DeviceRepository = deviceRepository) {}

  async getDevices(userId: string) {
    const userDevices = await this.deviceRepo.findByUserId(userId);
    return { status: 200, data: userDevices };
  }

  async registerDevice(
    userId: string,
    userAgent: string,
    data: { name?: string; browser?: string; os?: string; fingerprint?: string; location?: string }
  ) {
    const { name, browser, os, fingerprint, location } = data;
    const now = new Date().toISOString();

    const existingDevices = await this.deviceRepo.findByUserId(userId);
    // Mark existing current devices as not current
    for (const d of existingDevices) {
      if (d.isCurrent) {
        await this.deviceRepo.update(d.id, { isCurrent: false });
      }
    }

    const currentDev: StoredDevice = {
      id: 'dev-' + Date.now(),
      userId,
      name: name || `${browser || (userAgent.includes('Mobile') ? 'Mobile' : 'Desktop Browser')} on ${os || 'Windows'}`,
      browser: browser || 'Chrome',
      isCurrent: true,
      isTrusted: true,
      lastActive: now,
      location: location || 'Bengaluru, KA, India',
      fingerprint: fingerprint || 'fp-' + Date.now(),
    };

    await this.deviceRepo.create(currentDev);
    const allDevices = await this.deviceRepo.findByUserId(userId);

    return {
      status: 200,
      data: {
        success: true,
        deviceId: currentDev.id,
        currentDevice: currentDev,
        devices: allDevices,
      },
    };
  }

  async deleteDevice(id: string, userId: string) {
    const success = await this.deviceRepo.delete(id, userId);
    if (!success) {
      return { status: 404, data: { error: 'Device not found or unauthorized.' } };
    }
    return { status: 200, data: { success: true } };
  }
}

export const deviceService = new DeviceService();
