import { getSqliteClient, dbManager } from './database';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: number;
  name: string;
  up: (client: ReturnType<typeof getSqliteClient>) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: async (client) => {
      const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
      const rawSql = fs.readFileSync(schemaPath, 'utf8');

      // Strip single-line comments (-- ...)
      const cleanSql = rawSql
        .split('\n')
        .map((line) => {
          const commentIdx = line.indexOf('--');
          return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        })
        .join('\n');

      // Split sql statements by semicolon, ignoring empty statements
      const statements = cleanSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await client.execute(statement);
      }
    },
  },
];

export async function runMigrations(): Promise<{ applied: number; currentVersion: number }> {
  const client = getSqliteClient();

  // 1. Ensure foreign keys are turned on
  await dbManager.enableForeignKeys();

  // 2. Ensure schema_migrations table exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // 3. Find currently applied migrations
  const result = await client.execute('SELECT version FROM schema_migrations ORDER BY version ASC;');
  const appliedVersions = new Set(result.rows.map((r) => Number(r.version)));

  let appliedCount = 0;
  let maxVersion = 0;

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[SQLite Migration] Applying version ${migration.version}: ${migration.name}...`);
      await migration.up(client);
      await client.execute({
        sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        args: [migration.version, migration.name, new Date().toISOString()],
      });
      appliedCount++;
    }
    if (migration.version > maxVersion) {
      maxVersion = migration.version;
    }
  }

  return { applied: appliedCount, currentVersion: maxVersion };
}
