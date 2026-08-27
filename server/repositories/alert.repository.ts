import { getSqliteClient } from '../db/database';
import { StoredAlert } from '../db';

function mapRowToAlert(row: any): StoredAlert {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    severity: row.severity as any,
    timestamp: String(row.timestamp),
    isRead: Boolean(row.is_read),
    actionTaken: row.action_taken ? String(row.action_taken) : undefined,
  };
}

export class AlertRepository {
  async findByUserId(userId: string): Promise<StoredAlert[]> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM alerts WHERE user_id = ? ORDER BY timestamp DESC;',
      args: [userId],
    });
    return result.rows.map(mapRowToAlert);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<StoredAlert | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM alerts WHERE id = ? AND user_id = ? LIMIT 1;',
      args: [id, userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToAlert(result.rows[0]);
  }

  async findById(id: string): Promise<StoredAlert | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM alerts WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToAlert(result.rows[0]);
  }

  async create(alert: Partial<StoredAlert> & { userId: string; title: string; message: string; severity: any }): Promise<StoredAlert> {
    const client = getSqliteClient();
    const id = alert.id || `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isRead = Boolean(alert.isRead);
    const timestamp = alert.timestamp || new Date().toISOString();
    const actionTaken = alert.actionTaken || null;

    await client.execute({
      sql: `INSERT INTO alerts (id, user_id, title, message, severity, is_read, action_taken, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        alert.userId,
        alert.title,
        alert.message,
        alert.severity,
        isRead ? 1 : 0,
        actionTaken,
        timestamp,
      ],
    });
    return {
      id,
      userId: alert.userId,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      isRead,
      actionTaken: actionTaken || undefined,
      timestamp,
    };
  }

  async update(id: string, userId: string, updates: Partial<StoredAlert>): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return false;

    const merged = { ...existing, ...updates };
    const client = getSqliteClient();
    await client.execute({
      sql: `UPDATE alerts SET
              title = ?,
              message = ?,
              severity = ?,
              is_read = ?,
              action_taken = ?
            WHERE id = ? AND user_id = ?;`,
      args: [
        merged.title,
        merged.message,
        merged.severity,
        merged.isRead ? 1 : 0,
        merged.actionTaken || null,
        id,
        userId,
      ],
    });
    return true;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return false;

    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM alerts WHERE id = ? AND user_id = ?;',
      args: [id, userId],
    });
    return true;
  }

  async clearByUserId(userId: string): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM alerts WHERE user_id = ?;',
      args: [userId],
    });
  }
}

export const alertRepository = new AlertRepository();
