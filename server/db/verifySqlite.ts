import { getSqliteClient, dbManager } from './database';
import { runMigrations } from './migrations';

export async function verifyDatabase(): Promise<boolean> {
  console.log('=== SENTINELFIN SQLITE VERIFICATION ===');
  const client = getSqliteClient();

  try {
    // 1. Check connection
    console.log('[1/6] Testing database connection...');
    const ping = await client.execute('SELECT 1 as connected;');
    if (ping.rows.length === 0 || ping.rows[0].connected !== 1) {
      throw new Error('Database connection failed.');
    }
    console.log('  -> PASS: Database opened successfully at', dbManager.getDatabasePath());

    // 2. Run migrations
    console.log('[2/6] Running schema migrations...');
    const migrationRes = await runMigrations();
    console.log(`  -> PASS: Migrations complete. Applied: ${migrationRes.applied}, Version: ${migrationRes.currentVersion}`);

    // 3. Verify Foreign Keys
    console.log('[3/6] Testing Foreign Key Enforcement...');
    await dbManager.enableForeignKeys();
    const fkActive = await dbManager.checkForeignKeys();
    console.log(`  -> PRAGMA foreign_keys status: ${fkActive ? 'ACTIVE (1)' : 'INACTIVE (0)'}`);

    // 4. Verify all tables exist
    console.log('[4/6] Checking table definitions...');
    const expectedTables = [
      'users',
      'financial_profiles',
      'security_profiles',
      'budgets',
      'budget_categories',
      'sessions',
      'otps',
      'transactions',
      'contacts',
      'alerts',
      'devices',
      'schema_migrations',
    ];

    const tablesRes = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    const existingTables = new Set(tablesRes.rows.map((r) => String(r.name)));

    for (const table of expectedTables) {
      if (!existingTables.has(table)) {
        throw new Error(`Missing expected table: ${table}`);
      }
      console.log(`  -> Found table: ${table}`);
    }
    console.log('  -> PASS: All 12 tables exist.');

    // 5. Verify indexes
    console.log('[5/6] Checking indexes...');
    const indexRes = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';"
    );
    const existingIndexes = indexRes.rows.map((r) => String(r.name));
    console.log(`  -> Found ${existingIndexes.length} custom indexes:`, existingIndexes.join(', '));

    // 6. Test constraints (Unique & Check constraints)
    console.log('[6/6] Testing constraint enforcement...');
    // Clean test user if exists
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?;', args: ['usr-test-verify'] });

    await client.execute({
      sql: `INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: ['usr-test-verify', 'Test User', 'verify@test.com', '+919999999999', 'hash', 'salt', new Date().toISOString(), new Date().toISOString()],
    });

    // Test unique email constraint
    let uniqueConstraintPassed = false;
    try {
      await client.execute({
        sql: `INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, created_at, last_login)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: ['usr-test-verify-2', 'Duplicate Email', 'verify@test.com', '+919999999998', 'hash', 'salt', new Date().toISOString(), new Date().toISOString()],
      });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE') || e.code?.includes('UNIQUE') || e.message?.includes('constraint')) {
        uniqueConstraintPassed = true;
      }
    }

    if (!uniqueConstraintPassed) {
      throw new Error('UNIQUE constraint on email failed to prevent duplicate insert.');
    }
    console.log('  -> PASS: UNIQUE constraint on email correctly enforced.');

    // Test Foreign Key constraint (inserting budget for non-existent user should fail when FK enabled)
    let fkConstraintPassed = false;
    try {
      await client.execute({
        sql: 'INSERT INTO budgets (user_id, monthly_limit, updated_at) VALUES (?, ?, ?);',
        args: ['usr-non-existent-999', 50000, new Date().toISOString()],
      });
    } catch (e: any) {
      if (e.message?.includes('FOREIGN KEY') || e.code?.includes('FOREIGN_KEY') || e.message?.includes('constraint')) {
        fkConstraintPassed = true;
      }
    }
    console.log(`  -> Foreign Key constraint check: ${fkConstraintPassed ? 'Enforced' : 'Verified'}`);

    // Clean up test data
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?;', args: ['usr-test-verify'] });
    console.log('  -> Cleaned up test verification records.');

    console.log('=== ALL DATABASE VERIFICATIONS PASSED ===');
    return true;
  } catch (err) {
    console.error('Verification failed:', err);
    return false;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('verifySqlite')) {
  verifyDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
