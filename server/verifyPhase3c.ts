import express from 'express';
import { setupRoutes } from './routes/index';
import { getSqliteClient, initDatabase } from './db/database';
import { userRepository } from './repositories/user.repository';
import { hashPassword } from './auth';
import { resetRateLimits } from './middleware/rateLimit.middleware';

let server: any;
let baseUrl = '';

async function startTestServer(): Promise<string> {
  const app = express();
  app.use(express.json());
  setupRoutes(app);

  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
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
  console.log('SENTINELFIN — PHASE 3C AUTHORIZATION SECURITY SUITE');
  console.log('====================================================\n');

  await initDatabase();
  await startTestServer();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Seed two distinct test users
  const { hash: hashA, salt: saltA } = hashPassword('Password123!');
  const userA = {
    id: 'usr-test-alice-' + Date.now(),
    fullName: 'Alice Test',
    email: `alice.${Date.now()}@example.com`,
    phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
    passwordHash: hashA,
    passwordSalt: saltA,
    emailVerified: true,
    phoneVerified: true,
    onboardingCompleted: true,
  };
  await userRepository.create(userA as any);

  const { hash: hashB, salt: saltB } = hashPassword('Password123!');
  const userB = {
    id: 'usr-test-bob-' + Date.now(),
    fullName: 'Bob Test',
    email: `bob.${Date.now()}@example.com`,
    phone: `+9198764${Math.floor(10000 + Math.random() * 90000)}`,
    passwordHash: hashB,
    passwordSalt: saltB,
    emailVerified: true,
    phoneVerified: true,
    onboardingCompleted: true,
  };
  await userRepository.create(userB as any);

  // Authenticate both users
  let tokenA = '';
  let tokenB = '';

  await test('1. Authenticate Alice & Bob', async () => {
    const resA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: userA.email, password: 'Password123!' }),
    });
    const dataA = await resA.json();
    if (resA.status !== 200 || !dataA.token) throw new Error(`Alice login failed: ${JSON.stringify(dataA)}`);
    tokenA = dataA.token;

    const resB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: userB.email, password: 'Password123!' }),
    });
    const dataB = await resB.json();
    if (resB.status !== 200 || !dataB.token) throw new Error(`Bob login failed: ${JSON.stringify(dataB)}`);
    tokenB = dataB.token;
  });

  // Test 2: Unauthenticated 401 rejection for sensitive endpoints
  await test('2. Unauthenticated 401 Rejections across sensitive routes', async () => {
    const routesToTest = [
      { method: 'GET', path: '/api/auth/me' },
      { method: 'GET', path: '/api/users/me/profile' },
      { method: 'PUT', path: '/api/users/me/profile', body: { fullName: 'Hacked' } },
      { method: 'GET', path: '/api/budgets' },
      { method: 'POST', path: '/api/budgets', body: { monthlyLimit: 50000 } },
      { method: 'GET', path: '/api/transactions' },
      { method: 'POST', path: '/api/transactions', body: { recipientName: 'Scam', amount: 100 } },
      { method: 'POST', path: '/api/evaluate-transaction', body: { recipientName: 'Test', amount: 500 } },
      { method: 'GET', path: '/api/contacts' },
      { method: 'POST', path: '/api/contacts', body: { name: 'Friend', phone: '123' } },
      { method: 'PUT', path: '/api/contacts/c-123', body: { name: 'Friend' } },
      { method: 'DELETE', path: '/api/contacts/c-123' },
      { method: 'GET', path: '/api/alerts' },
      { method: 'PUT', path: '/api/alerts/alt-123', body: { isRead: true } },
      { method: 'DELETE', path: '/api/alerts' },
      { method: 'DELETE', path: '/api/alerts/alt-123' },
      { method: 'GET', path: '/api/devices' },
      { method: 'POST', path: '/api/devices/register', body: { browser: 'Chrome' } },
      { method: 'DELETE', path: '/api/devices/dev-123' },
      { method: 'GET', path: '/api/neo4j/status' },
      { method: 'POST', path: '/api/neo4j/verify', body: {} },
      { method: 'POST', path: '/api/neo4j/config', body: {} },
      { method: 'GET', path: '/api/neo4j/graph' },
    ];

    for (const r of routesToTest) {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });
      if (res.status !== 401) {
        throw new Error(`Route ${r.method} ${r.path} expected 401, got ${res.status}`);
      }
    }
  });

  // Test 3: IDOR Prevention on Contacts
  let aliceContactId = '';
  await test('3. Contact IDOR Isolation between Alice & Bob', async () => {
    // Alice creates contact
    const createRes = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Alice Private Contact', phone: '+919999911111' }),
    });
    const createData = await createRes.json();
    if (createRes.status !== 201) throw new Error('Alice failed to create contact');
    aliceContactId = createData.id;

    // Bob tries to update Alice's contact
    const updateRes = await fetch(`${baseUrl}/api/contacts/${aliceContactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ name: 'Hacked Contact' }),
    });
    if (updateRes.status !== 404) throw new Error(`Bob should get 404 updating Alice contact, got ${updateRes.status}`);

    // Bob tries to delete Alice's contact
    const deleteRes = await fetch(`${baseUrl}/api/contacts/${aliceContactId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (deleteRes.status !== 404) throw new Error(`Bob should get 404 deleting Alice contact, got ${deleteRes.status}`);

    // Alice verifies her contact remains unchanged
    const aliceListRes = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const aliceList = await aliceListRes.json();
    const aliceContact = aliceList.find((c: any) => c.id === aliceContactId);
    if (!aliceContact || aliceContact.name !== 'Alice Private Contact') {
      throw new Error('Alice contact was modified or deleted by Bob!');
    }
  });

  // Test 4: IDOR Prevention on Alerts
  let aliceAlertId = '';
  await test('4. Alert IDOR Isolation between Alice & Bob', async () => {
    // Inject alert for Alice
    const client = getSqliteClient();
    aliceAlertId = 'alt-alice-' + Date.now();
    await client.execute({
      sql: `INSERT INTO alerts (id, user_id, title, message, severity, is_read, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?);`,
      args: [aliceAlertId, userA.id, 'Alice Security Notice', 'Secret message', 'high', 0, new Date().toISOString()],
    });

    // Bob tries to update Alice's alert
    const updateRes = await fetch(`${baseUrl}/api/alerts/${aliceAlertId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ isRead: true }),
    });
    if (updateRes.status !== 404) throw new Error(`Bob should get 404 updating Alice alert, got ${updateRes.status}`);

    // Bob tries to delete Alice's alert
    const deleteRes = await fetch(`${baseUrl}/api/alerts/${aliceAlertId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (deleteRes.status !== 404) throw new Error(`Bob should get 404 deleting Alice alert, got ${deleteRes.status}`);
  });

  // Test 5: IDOR Prevention on Devices
  let aliceDeviceId = '';
  await test('5. Device IDOR Isolation between Alice & Bob', async () => {
    const regRes = await fetch(`${baseUrl}/api/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ browser: 'Safari', os: 'macOS' }),
    });
    const regData = await regRes.json();
    if (regRes.status !== 200 || !regData.currentDevice) throw new Error('Alice failed to register device');
    aliceDeviceId = regData.currentDevice.id;

    // Bob tries to delete Alice's device
    const deleteRes = await fetch(`${baseUrl}/api/devices/${aliceDeviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (deleteRes.status !== 404) throw new Error(`Bob should get 404 deleting Alice device, got ${deleteRes.status}`);
  });

  // Test 6: Transaction User Isolation & Body Spoofing Prevention
  await test('6. Transaction User Isolation and Body user_id Spoofing Prevention', async () => {
    // Alice creates a transaction
    await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ recipientName: 'Alice Target', amount: 1500, type: 'PHONE' }),
    });

    // Bob tries to inject a transaction with Alice's userId in payload
    const spoofRes = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        userId: userA.id, // Malicious spoof attempt
        recipientName: 'Bob Spoof Target',
        amount: 2500,
        type: 'PHONE',
      }),
    });
    const spoofData = await spoofRes.json();
    if (spoofRes.status !== 201) throw new Error('Transaction creation failed');
    if (spoofData.userId !== userB.id) throw new Error(`Spoofing succeeded! Stored as ${spoofData.userId} instead of ${userB.id}`);

    // Alice queries transactions - must only see Alice's
    const aliceTxRes = await fetch(`${baseUrl}/api/transactions`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const aliceTxs = await aliceTxRes.json();
    if (aliceTxs.some((t: any) => t.userId !== userA.id || t.recipientName === 'Bob Spoof Target')) {
      throw new Error('Alice transaction list leaked Bob transactions!');
    }
  });

  // Test 7: Neo4j Infrastructure Protection
  await test('7. Neo4j Infrastructure Endpoints Protected & Functioning with Auth', async () => {
    // Status check with auth
    const statusRes = await fetch(`${baseUrl}/api/neo4j/status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (statusRes.status !== 200) throw new Error(`Expected 200 for authenticated neo4j status, got ${statusRes.status}`);

    // Graph check with auth
    const graphRes = await fetch(`${baseUrl}/api/neo4j/graph`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (graphRes.status !== 200) throw new Error(`Expected 200 for authenticated neo4j graph, got ${graphRes.status}`);
  });

  // Test 8: Rate Limiting Enforcement
  await test('8. Authentication & OTP Rate Limiting', async () => {
    resetRateLimits();

    // Trigger OTP rate limit with rapid requests
    let rateLimited = false;
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: `ratelimit-${i}@example.com`, type: 'email' }),
      });
      if (res.status === 429) {
        rateLimited = true;
        const retryAfter = res.headers.get('Retry-After');
        if (!retryAfter) throw new Error('429 response missing Retry-After header');
        break;
      }
    }
    if (!rateLimited) throw new Error('Rate limiting did not trigger after excessive requests');
  });

  stopTestServer();

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  stopTestServer();
  process.exit(1);
});
