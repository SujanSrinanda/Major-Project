import { getSqliteClient } from '../db/database';
import { SessionRecord } from '../db';

export class SessionRepository {
  async findByToken(token: string): Promise<SessionRecord | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM sessions WHERE token = ? LIMIT 1;',
      args: [token],
    });
    if (result.rows.length === 0) return undefined;
    const row: any = result.rows[0];
    const exp = isNaN(Number(row.expires_at)) ? new Date(row.expires_at).getTime() : Number(row.expires_at);
    return {
      token: String(row.token),
      userId: String(row.user_id),
      createdAt: String(row.created_at),
      expiresAt: exp,
    };
  }

  async create(session: SessionRecord): Promise<void> {
    const client = getSqliteClient();
    const exp = typeof session.expiresAt === 'number' ? new Date(session.expiresAt).toISOString() : String(session.expiresAt);
    await client.execute({
      sql: `INSERT INTO sessions (token, user_id, created_at, expires_at, last_active)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET
              expires_at = excluded.expires_at,
              last_active = excluded.last_active;`,
      args: [
        session.token,
        session.userId,
        session.createdAt || new Date().toISOString(),
        exp,
        session.createdAt || new Date().toISOString(),
      ],
    });
  }

  async delete(token: string): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM sessions WHERE token = ?;',
      args: [token],
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM sessions WHERE user_id = ?;',
      args: [userId],
    });
  }

  async deleteExpired(): Promise<void> {
    const client = getSqliteClient();
    const nowIso = new Date().toISOString();
    await client.execute({
      sql: 'DELETE FROM sessions WHERE expires_at < ?;',
      args: [nowIso],
    });
  }
}

export const sessionRepository = new SessionRepository();
