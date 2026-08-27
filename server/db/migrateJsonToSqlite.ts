import { getSqliteClient, dbManager } from './database';
import { runMigrations } from './migrations';
import fs from 'fs';
import path from 'path';

export interface MigrationResult {
  success: boolean;
  counts: Record<string, { json: number; sqlite: number; match: boolean }>;
  error?: string;
}

export async function migrateJsonToSqlite(): Promise<MigrationResult> {
  const jsonPath = path.resolve(process.cwd(), 'data/sentinelfin_db.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON database file not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const jsonData = JSON.parse(raw);
  const client = getSqliteClient();

  // 1. Ensure migrations are applied
  await runMigrations();
  await dbManager.enableForeignKeys();

  const counts: Record<string, { json: number; sqlite: number; match: boolean }> = {};

  try {
    // Begin transaction using batch
    console.log('[Migration] Beginning JSON -> SQLite data migration...');

    const statements: Array<{ sql: string; args: any[] }> = [];

    // Clean existing data for clean import
    statements.push(
      { sql: 'DELETE FROM budget_categories;', args: [] },
      { sql: 'DELETE FROM budgets;', args: [] },
      { sql: 'DELETE FROM financial_profiles;', args: [] },
      { sql: 'DELETE FROM security_profiles;', args: [] },
      { sql: 'DELETE FROM sessions;', args: [] },
      { sql: 'DELETE FROM otps;', args: [] },
      { sql: 'DELETE FROM transactions;', args: [] },
      { sql: 'DELETE FROM contacts;', args: [] },
      { sql: 'DELETE FROM alerts;', args: [] },
      { sql: 'DELETE FROM devices;', args: [] },
      { sql: 'DELETE FROM users;', args: [] }
    );

    // 1. Users
    const users = jsonData.users || [];
    for (const u of users) {
      statements.push({
        sql: `INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, email_verified, phone_verified, onboarding_completed, city, profile_photo, created_at, last_login)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          u.id,
          u.fullName || '',
          u.email,
          u.phone,
          u.passwordHash,
          u.passwordSalt,
          u.emailVerified ? 1 : 0,
          u.phoneVerified ? 1 : 0,
          u.onboardingCompleted ? 1 : 0,
          u.city || null,
          u.profilePhoto || null,
          u.createdAt || new Date().toISOString(),
          u.lastLogin || new Date().toISOString(),
        ],
      });
    }

    // 2. Financial Profiles
    const finProfiles = jsonData.financialProfiles || [];
    for (const fp of finProfiles) {
      statements.push({
        sql: `INSERT INTO financial_profiles (user_id, income_range, spending_target, savings_goal, currency, updated_at)
              VALUES (?, ?, ?, ?, ?, ?);`,
        args: [
          fp.userId,
          fp.incomeRange || '₹50,000–₹1,00,000',
          Number(fp.spendingTarget) || 30000,
          Number(fp.savingsGoal) || 10000,
          fp.currency || 'INR ₹',
          new Date().toISOString(),
        ],
      });
    }

    // 3. Security Profiles
    const secProfiles = jsonData.securityProfiles || [];
    for (const sp of secProfiles) {
      statements.push({
        sql: `INSERT INTO security_profiles (user_id, security_alerts_enabled, new_device_alerts, transaction_alerts, protection_level, updated_at)
              VALUES (?, ?, ?, ?, ?, ?);`,
        args: [
          sp.userId,
          sp.securityAlertsEnabled !== false ? 1 : 0,
          sp.newDeviceAlerts !== false ? 1 : 0,
          sp.transactionAlerts !== false ? 1 : 0,
          sp.protectionLevel || 'High Protection',
          new Date().toISOString(),
        ],
      });
    }

    // 4. Budgets & Categories
    const budgets = jsonData.budgets || [];
    let jsonCategoryCount = 0;
    for (const b of budgets) {
      statements.push({
        sql: `INSERT INTO budgets (user_id, monthly_limit, updated_at)
              VALUES (?, ?, ?);`,
        args: [b.userId, Number(b.monthlyLimit) || 45000, new Date().toISOString()],
      });

      const categories = b.categories || [];
      jsonCategoryCount += categories.length;
      for (const cat of categories) {
        statements.push({
          sql: `INSERT INTO budget_categories (id, user_id, category, limit_amount, created_at)
                VALUES (?, ?, ?, ?, ?);`,
          args: [
            cat.id || `cat-${b.userId}-${cat.category}`,
            b.userId,
            cat.category,
            Number(cat.limit) || 5000,
            new Date().toISOString(),
          ],
        });
      }
    }

    // 5. Sessions
    const sessions = jsonData.sessions || [];
    for (const s of sessions) {
      const exp = typeof s.expiresAt === 'number' ? new Date(s.expiresAt).toISOString() : String(s.expiresAt);
      statements.push({
        sql: `INSERT INTO sessions (token, user_id, created_at, expires_at, last_active)
              VALUES (?, ?, ?, ?, ?);`,
        args: [
          s.token,
          s.userId,
          s.createdAt || new Date().toISOString(),
          exp,
          s.createdAt || new Date().toISOString(),
        ],
      });
    }

    // 6. OTPs
    const otps = jsonData.otps || [];
    for (const o of otps) {
      statements.push({
        sql: `INSERT INTO otps (target, otp_hash, channel, expires_at, attempts, created_at)
              VALUES (?, ?, ?, ?, ?, ?);`,
        args: [
          o.target,
          o.codeHash || o.otpHash || '',
          o.channel || 'phone',
          Number(o.expiresAt) || Date.now() + 300000,
          Number(o.attempts) || 0,
          Number(o.lastSentAt || o.createdAt) || Date.now(),
        ],
      });
    }

    // 7. Transactions
    const txs = jsonData.transactions || [];
    for (const t of txs) {
      statements.push({
        sql: `INSERT INTO transactions (id, user_id, recipient_name, recipient_phone, amount, note, category, type, status, decision, safety_score, risk_level, reasons_json, technical_details_json, is_new_recipient, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          t.id,
          t.userId,
          t.recipientName || 'Recipient',
          t.recipientPhone || null,
          Number(t.amount) || 0,
          t.note || null,
          t.category || 'Other',
          t.type && ['PHONE', 'CONTACT', 'QR', 'MANUAL', 'BANK'].includes(String(t.type).toUpperCase()) ? String(t.type).toUpperCase() : 'PHONE',
          t.status === 'FAILED' ? 'BLOCKED' : (t.status && ['PENDING', 'COMPLETED', 'CHALLENGED', 'BLOCKED', 'FLAGGED'].includes(t.status) ? t.status : 'COMPLETED'),
          t.decision || 'ALLOW',
          Number(t.safetyScore) || 90,
          t.riskLevel || 'LOW',
          t.reasons ? JSON.stringify(t.reasons) : null,
          t.technicalDetails ? JSON.stringify(t.technicalDetails) : null,
          t.isNewRecipient ? 1 : 0,
          t.timestamp || new Date().toISOString(),
        ],
      });
    }

    // 8. Contacts
    const contacts = jsonData.contacts || [];
    for (const c of contacts) {
      statements.push({
        sql: `INSERT INTO contacts (id, user_id, name, phone, email, is_favorite, is_new, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          c.id,
          c.userId,
          c.name,
          c.phone,
          c.email || null,
          c.isFavorite ? 1 : 0,
          c.isNew !== false ? 1 : 0,
          c.createdAt || new Date().toISOString(),
        ],
      });
    }

    // 9. Alerts
    const alerts = jsonData.alerts || [];
    for (const a of alerts) {
      statements.push({
        sql: `INSERT INTO alerts (id, user_id, title, message, severity, is_read, action_taken, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          a.id,
          a.userId,
          a.title,
          a.message,
          a.severity || 'medium',
          a.isRead ? 1 : 0,
          a.actionTaken || null,
          a.timestamp || new Date().toISOString(),
        ],
      });
    }

    // 10. Devices
    const devices = jsonData.devices || [];
    for (const d of devices) {
      statements.push({
        sql: `INSERT INTO devices (id, user_id, name, browser, is_current, is_trusted, last_active, location, fingerprint)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          d.id,
          d.userId,
          d.name,
          d.browser,
          d.isCurrent ? 1 : 0,
          d.isTrusted !== false ? 1 : 0,
          d.lastActive || new Date().toISOString(),
          d.location || null,
          d.fingerprint || null,
        ],
      });
    }

    // Execute atomic batch
    await client.batch(statements, 'write');
    console.log('[Migration] Atomic batch committed successfully.');

    // Count verification
    const entityQueries = [
      { name: 'Users', table: 'users', jsonCount: users.length },
      { name: 'Financial Profiles', table: 'financial_profiles', jsonCount: finProfiles.length },
      { name: 'Security Profiles', table: 'security_profiles', jsonCount: secProfiles.length },
      { name: 'Budgets', table: 'budgets', jsonCount: budgets.length },
      { name: 'Budget Categories', table: 'budget_categories', jsonCount: jsonCategoryCount },
      { name: 'Sessions', table: 'sessions', jsonCount: sessions.length },
      { name: 'OTPs', table: 'otps', jsonCount: otps.length },
      { name: 'Transactions', table: 'transactions', jsonCount: txs.length },
      { name: 'Contacts', table: 'contacts', jsonCount: contacts.length },
      { name: 'Alerts', table: 'alerts', jsonCount: alerts.length },
      { name: 'Devices', table: 'devices', jsonCount: devices.length },
    ];

    let allMatched = true;
    for (const eq of entityQueries) {
      const res = await client.execute(`SELECT COUNT(*) as count FROM ${eq.table};`);
      const sqliteCount = Number(Object.values(res.rows[0])[0]);
      const match = sqliteCount === eq.jsonCount;
      if (!match) allMatched = false;
      counts[eq.name] = {
        json: eq.jsonCount,
        sqlite: sqliteCount,
        match,
      };
      console.log(`  -> ${eq.name.padEnd(20)} JSON: ${eq.jsonCount} | SQLite: ${sqliteCount} | ${match ? 'PASS' : 'MISMATCH'}`);
    }

    return {
      success: allMatched,
      counts,
    };
  } catch (err: any) {
    console.error('[Migration] Failed to migrate JSON to SQLite:', err);
    return {
      success: false,
      counts,
      error: err.message,
    };
  }
}

if (process.argv[1]?.includes('migrateJsonToSqlite')) {
  migrateJsonToSqlite().then((res) => {
    if (res.success) {
      console.log('=== DATA MIGRATION SUCCESSFUL ===');
      process.exit(0);
    } else {
      console.error('=== DATA MIGRATION FAILED ===', res.error);
      process.exit(1);
    }
  });
}
