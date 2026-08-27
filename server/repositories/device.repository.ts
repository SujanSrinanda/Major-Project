import { getSqliteClient } from '../db/database';
import { StoredDevice } from '../db';

function mapRowToDevice(row: any): StoredDevice {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    browser: String(row.browser),
    isCurrent: Boolean(row.is_current),
    isTrusted: Boolean(row.is_trusted),
    lastActive: String(row.last_active),
    location: row.location ? String(row.location) : undefined,
    fingerprint: row.fingerprint ? String(row.fingerprint) : undefined,
  };
}

export class DeviceRepository {
  async findByUserId(userId: string): Promise<StoredDevice[]> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM devices WHERE user_id = ? ORDER BY last_active DESC;',
      args: [userId],
    });
    return result.rows.map(mapRowToDevice);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<StoredDevice | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM devices WHERE id = ? AND user_id = ? LIMIT 1;',
      args: [id, userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToDevice(result.rows[0]);
  }

  async findById(id: string): Promise<StoredDevice | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM devices WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToDevice(result.rows[0]);
  }

  async create(device: StoredDevice): Promise<StoredDevice> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO devices (id, user_id, name, browser, is_current, is_trusted, last_active, location, fingerprint)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        device.id,
        device.userId,
        device.name,
        device.browser,
        device.isCurrent ? 1 : 0,
        device.isTrusted ? 1 : 0,
        device.lastActive || new Date().toISOString(),
        device.location || null,
        device.fingerprint || null,
      ],
    });
    return device;
  }

  async update(id: string, updates: Partial<StoredDevice>): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    const client = getSqliteClient();
    await client.execute({
      sql: `UPDATE devices SET
              name = ?,
              browser = ?,
              is_current = ?,
              is_trusted = ?,
              last_active = ?,
              location = ?,
              fingerprint = ?
            WHERE id = ?;`,
      args: [
        merged.name,
        merged.browser,
        merged.isCurrent ? 1 : 0,
        merged.isTrusted ? 1 : 0,
        merged.lastActive || new Date().toISOString(),
        merged.location || null,
        merged.fingerprint || null,
        id,
      ],
    });
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      const existing = await this.findByIdAndUserId(id, userId);
      if (!existing) return false;

      const client = getSqliteClient();
      await client.execute({
        sql: 'DELETE FROM devices WHERE id = ? AND user_id = ?;',
        args: [id, userId],
      });
      return true;
    }

    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM devices WHERE id = ?;',
      args: [id],
    });
    return true;
  }

  async clearByUserId(userId: string): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM devices WHERE user_id = ?;',
      args: [userId],
    });
  }
}

export const deviceRepository = new DeviceRepository();
