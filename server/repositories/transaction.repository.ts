import { getSqliteClient } from '../db/database';
import { StoredTransaction } from '../db';

function mapRowToTransaction(row: any): StoredTransaction {
  let reasons: string[] = [];
  if (row.reasons_json) {
    try {
      reasons = typeof row.reasons_json === 'string' ? JSON.parse(row.reasons_json) : row.reasons_json;
    } catch {
      reasons = [];
    }
  }

  let technicalDetails: any = undefined;
  if (row.technical_details_json) {
    try {
      technicalDetails = typeof row.technical_details_json === 'string' ? JSON.parse(row.technical_details_json) : row.technical_details_json;
    } catch {
      technicalDetails = undefined;
    }
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    recipientName: String(row.recipient_name),
    recipientPhone: row.recipient_phone ? String(row.recipient_phone) : undefined,
    amount: Number(row.amount),
    note: row.note ? String(row.note) : undefined,
    category: String(row.category),
    type: row.type as any,
    status: row.status as any,
    decision: row.decision as any,
    safetyScore: Number(row.safety_score),
    riskLevel: row.risk_level as any,
    reasons,
    technicalDetails,
    timestamp: String(row.timestamp),
    isNewRecipient: row.is_new_recipient !== null ? Boolean(row.is_new_recipient) : undefined,
  };
}

export class TransactionRepository {
  async findByUserId(userId: string): Promise<StoredTransaction[]> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC;',
      args: [userId],
    });
    return result.rows.map(mapRowToTransaction);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<StoredTransaction | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1;',
      args: [id, userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToTransaction(result.rows[0]);
  }

  async findById(id: string): Promise<StoredTransaction | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToTransaction(result.rows[0]);
  }

  async create(transaction: StoredTransaction): Promise<StoredTransaction> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO transactions (id, user_id, recipient_name, recipient_phone, amount, note, category, type, status, decision, safety_score, risk_level, reasons_json, technical_details_json, is_new_recipient, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        transaction.id,
        transaction.userId,
        transaction.recipientName,
        transaction.recipientPhone || null,
        transaction.amount,
        transaction.note || null,
        transaction.category,
        transaction.type,
        transaction.status,
        transaction.decision,
        transaction.safetyScore,
        transaction.riskLevel,
        transaction.reasons ? JSON.stringify(transaction.reasons) : null,
        transaction.technicalDetails ? JSON.stringify(transaction.technicalDetails) : null,
        transaction.isNewRecipient ? 1 : 0,
        transaction.timestamp || new Date().toISOString(),
      ],
    });
    return transaction;
  }
}

export const transactionRepository = new TransactionRepository();
