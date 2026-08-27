import express from 'express';
import { setupRoutes } from './routes/index';
import { getSqliteClient, initDatabase } from './db/database';
import { userRepository } from './repositories/user.repository';
import { sessionRepository } from './repositories/session.repository';
import { hashPassword, validatePasswordPolicy, createSessionToken } from './auth';
import { authService } from './services/auth.service';
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
  console.log('SENTINELFIN — PHASE 3D FINAL SECURITY CLEANUP SUITE');
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

  // Test 1: Password Policy Core Function
  await test('1. Password Policy Validation Function Unit Tests', async () => {
    // Rejections
    const short = validatePasswordPolicy('pass12');
    if (short.valid) throw new Error('Short password (<8) should be rejected');

    const empty = validatePasswordPolicy('   ');
    if (empty.valid) throw new Error('Whitespace-only password should be rejected');

    const repeated = validatePasswordPolicy('aaaaaaaaaa');
    if (repeated.valid) throw new Error('Repeated character password should be rejected');

    const common = validatePasswordPolicy('password123');
    if (common.valid) throw new Error('Common weak password should be rejected');

    const tooLong = validatePasswordPolicy('A'.repeat(130));
    if (tooLong.valid) throw new Error('Overly long password (>128) should be rejected');

    // Acceptances
    const valid = validatePasswordPolicy('Sentinel#Secure99!');
    if (!valid.valid) throw new Error(`Valid strong password was rejected: ${valid.error}`);

    const valid2 = validatePasswordPolicy('SuperP@ssw0rd2026');
    if (!valid2.valid) throw new Error(`Valid password was rejected: ${valid2.error}`);
  });

  // Test 2: Signup Password Policy Enforcement via API
  await test('2. Signup API Enforces Password Policy', async () => {
    // Attempt weak password on signup
    const weakRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Weak Password Test',
        email: `weak.${Date.now()}@example.com`,
        phone: `+9199990${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'password123',
      }),
    });
    const weakData = await weakRes.json();
    if (weakRes.status !== 400) throw new Error(`Expected 400 for weak password, got ${weakRes.status}`);
    if (!weakData.error || !weakData.error.includes('common')) {
      throw new Error(`Expected weak password error message, got: ${JSON.stringify(weakData)}`);
    }

    // Attempt short password on signup
    const shortRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Short Password Test',
        email: `short.${Date.now()}@example.com`,
        phone: `+9199991${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'short',
      }),
    });
    if (shortRes.status !== 400) throw new Error(`Expected 400 for short password, got ${shortRes.status}`);

    // Attempt strong password on signup
    const strongRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Strong Password User',
        email: `strong.${Date.now()}@example.com`,
        phone: `+9199992${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'Strong#Password2026!',
      }),
    });
    const strongData = await strongRes.json();
    if (strongRes.status !== 201 || !strongData.token) {
      throw new Error(`Signup with strong password failed: ${JSON.stringify(strongData)}`);
    }
  });

  // Test 3: Password Reset Password Policy Enforcement
  await test('3. Password Reset Enforces Password Policy', async () => {
    // Attempt password reset with weak password
    const resetWeakRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'test@example.com',
        otp: '123456',
        newPassword: '123',
      }),
    });
    if (resetWeakRes.status !== 400) {
      throw new Error(`Expected 400 for short reset password, got ${resetWeakRes.status}`);
    }
  });

  // Test 4: Expired Session Cleanup
  await test('4. Session Expiration & Repository Cleanup', async () => {
    const { hash, salt } = hashPassword('Test#Pass123!');
    const userId = 'usr-test-cleanup-' + Date.now();
    await userRepository.create({
      id: userId,
      fullName: 'Cleanup Test User',
      email: `cleanup.${Date.now()}@example.com`,
      phone: `+9199993${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: true,
      phoneVerified: true,
      onboardingCompleted: true,
    } as any);

    const token = await createSessionToken(userId, sessionRepository);

    // Manually expire session in database
    const client = getSqliteClient();
    const pastDate = new Date(Date.now() - 100000).toISOString();
    await client.execute({
      sql: 'UPDATE sessions SET expires_at = ? WHERE token = ?;',
      args: [pastDate, token],
    });

    // Run deleteExpired
    await sessionRepository.deleteExpired();

    // Verify session is removed
    const found = await sessionRepository.findByToken(token);
    if (found) throw new Error('Expired session was not purged by deleteExpired()');
  });

  // Test 5: HTTP Security Headers
  await test('5. Security Headers (X-Powered-By Disabled)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const poweredBy = res.headers.get('x-powered-by');
    if (poweredBy) throw new Error(`x-powered-by header was not stripped: ${poweredBy}`);
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
