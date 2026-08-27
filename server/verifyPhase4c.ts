import express from 'express';
import { setupRoutes } from './routes/index';
import { getSqliteClient, initDatabase } from './db/database';
import { userRepository } from './repositories/user.repository';
import { sessionRepository } from './repositories/session.repository';
import { transactionRepository } from './repositories/transaction.repository';
import { contactRepository } from './repositories/contact.repository';
import { alertRepository } from './repositories/alert.repository';
import { budgetRepository } from './repositories/budget.repository';
import { hashPassword, createSessionToken } from './auth';
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
  console.log('SENTINELFIN — PHASE 4C VERIFICATION SUITE');
  console.log('Real Data Integration & Mock Data Elimination');
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
      console.error(`❌ [FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  const testEmail = `phase4c_${Date.now()}@sentinelfin.test`;
  const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'SecurePassword123!';
  const userId = `user_p4c_${Date.now()}`;
  let token = '';

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  try {
    // 1. Setup real test user in SQLite
    await test('1. User Creation in SQLite and Session Creation', async () => {
      const { hash: passwordHash, salt: passwordSalt } = hashPassword(testPassword);
      
      await userRepository.create({
        id: userId,
        fullName: 'Phase4C Test User',
        email: testEmail,
        phone: testPhone,
        passwordHash,
        passwordSalt,
        emailVerified: true,
        phoneVerified: true,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });

      token = await createSessionToken(userId);

      const user = await userRepository.findById(userId);
      if (!user || user.email !== testEmail) throw new Error('Failed to create test user in SQLite');
    });

    // 2. Real Empty State Verification (No mock data injected)
    await test('2. Fresh User has 0 Transactions (Real Empty State, No Fake Fallback)', async () => {
      const res = await fetch(`${baseUrl}/api/transactions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const txs = await res.json();
      if (!Array.isArray(txs)) throw new Error('transactions response is not an array');
      if (txs.length !== 0) throw new Error(`Expected 0 transactions for new user, got ${txs.length}`);
    });

    await test('3. Fresh User has 0 Contacts (Real Empty State, No Fake Fallback)', async () => {
      const res = await fetch(`${baseUrl}/api/contacts`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const contacts = await res.json();
      if (!Array.isArray(contacts)) throw new Error('contacts response is not an array');
      if (contacts.length !== 0) throw new Error(`Expected 0 contacts for new user, got ${contacts.length}`);
    });

    await test('4. Fresh User has 0 Alerts (Real Empty State)', async () => {
      const res = await fetch(`${baseUrl}/api/alerts`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const alerts = await res.json();
      if (!Array.isArray(alerts)) throw new Error('alerts response is not an array');
      if (alerts.length !== 0) throw new Error(`Expected 0 alerts for new user, got ${alerts.length}`);
    });

    // 3. Real Transaction Creation & Persistence
    let createdTxId = '';
    await test('5. Create Transaction and Persist to SQLite Backend', async () => {
      const txPayload = {
        recipientName: 'Kavita Iyer',
        recipientPhone: '+919876543210',
        amount: 3500,
        type: 'PHONE',
        category: 'Shopping',
        riskScore: 12,
        decision: 'ALLOW',
        status: 'COMPLETED',
        reasons: ['Verified contact behavior', 'Standard daylight transaction time'],
        timestamp: new Date().toISOString(),
        safetyScore: 95,
        isNewRecipient: false,
      };

      const res = await fetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(txPayload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const createdTx = await res.json();
      if (!createdTx || !createdTx.id) throw new Error('Transaction creation did not return transaction object');
      createdTxId = createdTx.id;
      if (createdTx.amount !== 3500) throw new Error(`Expected amount 3500, got ${createdTx.amount}`);
      if (createdTx.recipientName !== 'Kavita Iyer') throw new Error(`Expected recipient Kavita Iyer, got ${createdTx.recipientName}`);

      // Verify in SQLite directly
      const dbTx = await transactionRepository.findByIdAndUserId(createdTxId, userId);
      if (!dbTx) throw new Error('Transaction was not found in SQLite database');
      if (dbTx.userId !== userId) throw new Error('Transaction userId does not match authenticated user');
    });

    // 4. Querying Newly Persisted Data
    await test('6. Fetch Transactions Returns Persisted Transaction', async () => {
      const res = await fetch(`${baseUrl}/api/transactions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const txs = await res.json();
      if (txs.length !== 1) throw new Error(`Expected 1 transaction, got ${txs.length}`);
      if (txs[0].id !== createdTxId) throw new Error(`Expected tx ID ${createdTxId}, got ${txs[0].id}`);
      if (txs[0].recipientName !== 'Kavita Iyer') throw new Error('Fetched transaction data mismatch');
    });

    // 5. Real Contact Creation & Retrieval
    let createdContactId = '';
    await test('7. Add Contact and Persist to SQLite Backend', async () => {
      const contactPayload = {
        name: 'Rahul Sharma',
        phone: '+919812345678',
        email: 'rahul@upi',
        isFavorite: true,
        isNew: false,
      };

      const res = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(contactPayload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const createdContact = await res.json();
      if (!createdContact || !createdContact.id) throw new Error('Contact creation did not return contact object');
      createdContactId = createdContact.id;

      const getRes = await fetch(`${baseUrl}/api/contacts`, { headers: getAuthHeaders() });
      const contacts = await getRes.json();
      if (contacts.length !== 1) throw new Error(`Expected 1 contact, got ${contacts.length}`);
      if (contacts[0].name !== 'Rahul Sharma') throw new Error('Contact name mismatch in query');
    });

    // 6. Security Alert Creation & Dismissal
    let createdAlertId = '';
    await test('8. Real Security Alert Lifecycle (Create, Read, Delete)', async () => {
      const alert = await alertRepository.create({
        userId,
        title: 'Unusual Midnight Access Attempt',
        message: 'A login was attempted from an unverified IP range.',
        severity: 'high',
        isRead: false,
        timestamp: new Date().toISOString(),
      });

      createdAlertId = alert.id;
      const getRes = await fetch(`${baseUrl}/api/alerts`, { headers: getAuthHeaders() });
      const alerts = await getRes.json();
      if (alerts.length !== 1) throw new Error(`Expected 1 alert, got ${alerts.length}`);
      if (alerts[0].title !== 'Unusual Midnight Access Attempt') throw new Error('Alert title mismatch');

      // Dismiss alert
      const delRes = await fetch(`${baseUrl}/api/alerts/${createdAlertId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!delRes.ok) throw new Error(`Delete alert failed: ${await delRes.text()}`);

      const checkRes = await fetch(`${baseUrl}/api/alerts`, { headers: getAuthHeaders() });
      const checkAlerts = await checkRes.json();
      if (checkAlerts.length !== 0) throw new Error(`Expected 0 alerts after delete, got ${checkAlerts.length}`);
    });

    // 7. Budget Configuration Persistence
    await test('9. Budget Limit Update and Retrieval in SQLite', async () => {
      const putRes = await fetch(`${baseUrl}/api/budgets`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ monthlyLimit: 60000 }),
      });
      if (!putRes.ok) throw new Error(`Update budget failed: ${await putRes.text()}`);

      const getRes = await fetch(`${baseUrl}/api/budgets`, { headers: getAuthHeaders() });
      const budget = await getRes.json();
      if (Number(budget.monthlyLimit) !== 60000) throw new Error(`Expected budget limit 60000, got ${budget.monthlyLimit}`);

      const dbBudget = await budgetRepository.findByUserId(userId);
      if (!dbBudget || Number(dbBudget.monthlyLimit) !== 60000) throw new Error('SQLite budget table not updated');
    });

    // 8. Authorization Integrity & Error Handling
    await test('10. Unauthorized Request Handled Cleanly (No Fallback Injection)', async () => {
      const badHeaders = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_tampered_token_xyz',
      };
      const res = await fetch(`${baseUrl}/api/transactions`, { headers: badHeaders });
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got HTTP ${res.status}`);
    });

  } finally {
    stopTestServer();
  }

  console.log('\n====================================================');
  console.log(`PHASE 4C TESTS COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
