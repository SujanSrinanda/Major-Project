import { getSqliteClient } from '../db/database';
import { StoredContact } from '../db';

function mapRowToContact(row: any): StoredContact {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    isFavorite: Boolean(row.is_favorite),
    isNew: Boolean(row.is_new),
  };
}

export class ContactRepository {
  async findByUserId(userId: string): Promise<StoredContact[]> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM contacts WHERE user_id = ? ORDER BY is_favorite DESC, name ASC;',
      args: [userId],
    });
    return result.rows.map(mapRowToContact);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<StoredContact | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM contacts WHERE id = ? AND user_id = ? LIMIT 1;',
      args: [id, userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToContact(result.rows[0]);
  }

  async findById(id: string): Promise<StoredContact | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM contacts WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToContact(result.rows[0]);
  }

  async create(contact: StoredContact): Promise<StoredContact> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO contacts (id, user_id, name, phone, email, is_favorite, is_new, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        contact.id,
        contact.userId,
        contact.name,
        contact.phone,
        contact.email || null,
        contact.isFavorite ? 1 : 0,
        contact.isNew ? 1 : 0,
        new Date().toISOString(),
      ],
    });
    return contact;
  }

  async update(id: string, userId: string, updates: Partial<StoredContact>): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return false;

    const merged = { ...existing, ...updates };
    const client = getSqliteClient();
    await client.execute({
      sql: `UPDATE contacts SET
              name = ?,
              phone = ?,
              email = ?,
              is_favorite = ?,
              is_new = ?
            WHERE id = ? AND user_id = ?;`,
      args: [
        merged.name,
        merged.phone,
        merged.email || null,
        merged.isFavorite ? 1 : 0,
        merged.isNew ? 1 : 0,
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
      sql: 'DELETE FROM contacts WHERE id = ? AND user_id = ?;',
      args: [id, userId],
    });
    return true;
  }
}

export const contactRepository = new ContactRepository();
