import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations';

class DatabaseManager {
  private client: Client | null = null;
  private dbPath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'sentinelfin.sqlite');
  }

  public getClient(): Client {
    if (!this.client) {
      const url = `file:${this.dbPath}`;
      this.client = createClient({ url });
    }
    return this.client;
  }

  public async enableForeignKeys(): Promise<void> {
    const client = this.getClient();
    await client.execute('PRAGMA foreign_keys = ON;');
  }

  public async checkForeignKeys(): Promise<boolean> {
    const client = this.getClient();
    const res = await client.execute('PRAGMA foreign_keys;');
    if (res.rows.length > 0) {
      const val = Object.values(res.rows[0])[0];
      return Number(val) === 1;
    }
    return false;
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public close(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

export const dbManager = new DatabaseManager();
export const getSqliteClient = () => dbManager.getClient();

export async function initDatabase(): Promise<void> {
  const client = getSqliteClient();
  await runMigrations();
  await dbManager.enableForeignKeys();

  // Check if users exist; if not, check if json exists and seed
  const countRes = await client.execute('SELECT COUNT(*) as count FROM users;');
  const userCount = Number(Object.values(countRes.rows[0])[0]);
  if (userCount === 0) {
    const jsonPath = path.resolve(process.cwd(), 'data/sentinelfin_db.json');
    if (fs.existsSync(jsonPath)) {
      console.log('[Database] Empty SQLite database detected. Auto-migrating from sentinelfin_db.json...');
      const { migrateJsonToSqlite } = await import('./migrateJsonToSqlite');
      await migrateJsonToSqlite();
    }
  }
  console.log('[Database] SQLite database initialized and ready.');
}
