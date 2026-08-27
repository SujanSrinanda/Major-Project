import 'dotenv/config';
import express from 'express';
import { setupRoutes } from './routes/index';
import { getSqliteClient, initDatabase } from './db/database';
import { userRepository } from './repositories/user.repository';
import { sessionRepository } from './repositories/session.repository';
import { createSessionToken } from './auth';
import { errorHandler } from './middleware/errorHandler';

let server: any;
let baseUrl = '';

async function startTestServer(): Promise<string> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  setupRoutes(app);
  app.use('/api', errorHandler);

  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve(baseUrl);
    });
  });
}

function stopTestServer() {
  if (server) {
    server.close();
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('SENTINELFIN — PHASE 4D.1 CORRECTNESS & CONTRACT SUITE');
  console.log('====================================================\n');

  await initDatabase();
  await startTestServer();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  // Setup test user & session
  const testUserId = `test-p4d1-${Date.now()}`;
  const testUser = await userRepository.create({
    id: testUserId,
    fullName: 'P4D1 Test User',
    email: `p4d1-${Date.now()}@example.com`,
    phone: `+9198${Date.now().toString().slice(-8)}`,
    passwordHash: 'hash',
    passwordSalt: 'salt',
    emailVerified: true,
    phoneVerified: true,
    onboardingCompleted: true,
    city: 'Bengaluru',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  });

  const sessionToken = await createSessionToken(testUser.id);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  };

  // Test 1: Client cannot override server BLOCK with ALLOW
  await test('P0.1: Client decision=ALLOW cannot override server BLOCK evaluation', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipientName: 'Unknown Crypto Sink',
        recipientPhone: '+919999999999',
        amount: 75000, // Trigger BLOCK
        type: 'PHONE',
        decision: 'ALLOW', // Client spoofing attempt
        safetyScore: 99,   // Client spoofing attempt
        riskLevel: 'LOW',  // Client spoofing attempt
      }),
    });

    if (res.status !== 201) {
      throw new Error(`Expected HTTP 201 created, got ${res.status}`);
    }

    const tx = await res.json();
    if (tx.decision !== 'BLOCK') {
      throw new Error(`Server failed to enforce BLOCK decision. Got decision: ${tx.decision}`);
    }
    if (tx.status !== 'BLOCKED') {
      throw new Error(`Expected status BLOCKED, got ${tx.status}`);
    }
    if (tx.safetyScore >= 50) {
      throw new Error(`Client safetyScore override took effect! SafetyScore: ${tx.safetyScore}`);
    }
  });

  // Test 2: Client cannot override server ALLOW with BLOCK
  await test('P0.2: Client decision=BLOCK cannot force server ALLOW to block', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipientName: 'Verified Merchant',
        recipientPhone: '+919888888888',
        amount: 200, // Safe transaction
        type: 'PHONE',
        decision: 'BLOCK', // Client attempt to force block
      }),
    });

    if (res.status !== 201) {
      throw new Error(`Expected HTTP 201 created, got ${res.status}`);
    }

    const tx = await res.json();
    if (tx.decision !== 'ALLOW') {
      throw new Error(`Client decision ALLOW override succeeded unexpectedly! Got: ${tx.decision}`);
    }
    if (tx.status !== 'COMPLETED') {
      throw new Error(`Expected status COMPLETED, got ${tx.status}`);
    }
  });

  // Test 3: Invalid transaction type rejected
  await test('P3.1: Invalid transaction type (FRIEND) is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipientName: 'Test Friend',
        recipientPhone: '+919777777777',
        amount: 500,
        type: 'FRIEND', // Invalid non-canonical type
      }),
    });

    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 for invalid type FRIEND, got ${res.status}`);
    }

    const err = await res.json();
    if (!err.error || !err.error.includes('Invalid transaction type')) {
      throw new Error(`Unexpected error response message: ${JSON.stringify(err)}`);
    }
  });

  // Test 4: Database CHECK constraint prevents invalid status FAILED from entering SQLite
  await test('P2.1: SQLite database CHECK constraint rejects invalid status FAILED', async () => {
    const client = getSqliteClient();
    try {
      await client.execute({
        sql: `INSERT INTO transactions (id, user_id, recipient_name, amount, type, status, decision, safety_score, risk_level, timestamp)
              VALUES ('invalid-tx-1', ?, 'Test', 100, 'PHONE', 'FAILED', 'ALLOW', 90, 'LOW', datetime('now'));`,
        args: [testUser.id],
      });
      throw new Error('SQLite allowed status FAILED despite CHECK constraint!');
    } catch (err: any) {
      if (!err.message || !err.message.toLowerCase().includes('check constraint')) {
        throw new Error(`Expected CHECK constraint failure, got: ${err.message}`);
      }
    }
  });

  // Test 5: Database CHECK constraint prevents invalid type FRIEND from entering SQLite
  await test('P3.2: SQLite database CHECK constraint rejects invalid type FRIEND', async () => {
    const client = getSqliteClient();
    try {
      await client.execute({
        sql: `INSERT INTO transactions (id, user_id, recipient_name, amount, type, status, decision, safety_score, risk_level, timestamp)
              VALUES ('invalid-tx-2', ?, 'Test', 100, 'FRIEND', 'COMPLETED', 'ALLOW', 90, 'LOW', datetime('now'));`,
        args: [testUser.id],
      });
      throw new Error('SQLite allowed type FRIEND despite CHECK constraint!');
    } catch (err: any) {
      if (!err.message || !err.message.toLowerCase().includes('check constraint')) {
        throw new Error(`Expected CHECK constraint failure, got: ${err.message}`);
      }
    }
  });

  // Test 6: Risk evaluation failure safely aborts transaction creation
  await test('P1.1: Missing recipient name aborts transaction evaluation and creation', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipientName: '',
        amount: 500,
        type: 'PHONE',
      }),
    });

    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 for missing recipient name, got ${res.status}`);
    }
  });

  stopTestServer();

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal error running Phase 4D.1 verification:', err);
  stopTestServer();
  process.exit(1);
});
