import { getSqliteClient } from '../db/database';
import { OtpRecord } from '../db';

export class OtpRepository {
  async findByTarget(target: string): Promise<OtpRecord | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM otps WHERE target = ? LIMIT 1;',
      args: [target],
    });
    if (result.rows.length === 0) return undefined;
    const row: any = result.rows[0];
    return {
      id: `otp-${row.target}`,
      target: String(row.target),
      channel: row.channel as any,
      codeHash: String(row.otp_hash),
      expiresAt: Number(row.expires_at),
      attempts: Number(row.attempts),
      lastSentAt: Number(row.created_at),
    };
  }

  async save(record: OtpRecord): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO otps (target, otp_hash, channel, expires_at, attempts, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(target) DO UPDATE SET
              otp_hash = excluded.otp_hash,
              channel = excluded.channel,
              expires_at = excluded.expires_at,
              attempts = excluded.attempts,
              created_at = excluded.created_at;`,
      args: [
        record.target,
        record.codeHash,
        record.channel,
        record.expiresAt,
        record.attempts,
        record.lastSentAt,
      ],
    });
  }

  async delete(target: string): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: 'DELETE FROM otps WHERE target = ?;',
      args: [target],
    });
  }
}

export const otpRepository = new OtpRepository();
