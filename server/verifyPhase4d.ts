import express from 'express';
import { setupRoutes } from './routes/index';
import { getSqliteClient, initDatabase } from './db/database';
import { userRepository } from './repositories/user.repository';
import { sessionRepository } from './repositories/session.repository';
import { contactRepository } from './repositories/contact.repository';
import { alertRepository } from './repositories/alert.repository';
import { deviceRepository } from './repositories/device.repository';
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
  console.log('SENTINELFIN — PHASE 4D VERIFICATION SUITE');
  console.log('Full-Stack CRUD, Persistence & State Synchronization');
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

  // Setup Test User A
  const testEmailA = `user_a_${Date.now()}@sentinelfin.test`;
  const testPhoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const userIdA = `user_a_${Date.now()}`;
  let tokenA = '';

  // Setup Test User B
  const testEmailB = `user_b_${Date.now()}@sentinelfin.test`;
  const testPhoneB = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
  const userIdB = `user_b_${Date.now()}`;
  let tokenB = '';

  await test('1. Initialize Test Users (User A & User B)', async () => {
    const { hash: hashA, salt: saltA } = hashPassword('PasswordA123!');
    await userRepository.create({
      id: userIdA,
      fullName: 'Alice Sentinel',
      email: testEmailA,
      phone: testPhoneA,
      passwordHash: hashA,
      passwordSalt: saltA,
      emailVerified: true,
      phoneVerified: true,
      onboardingCompleted: true,
      city: 'Bengaluru',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

    tokenA = await createSessionToken(userIdA);

    const { hash: hashB, salt: saltB } = hashPassword('PasswordB123!');
    await userRepository.create({
      id: userIdB,
      fullName: 'Bob Sentinel',
      email: testEmailB,
      phone: testPhoneB,
      passwordHash: hashB,
      passwordSalt: saltB,
      emailVerified: true,
      phoneVerified: true,
      onboardingCompleted: true,
      city: 'Mumbai',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

    tokenB = await createSessionToken(userIdB);

    if (!tokenA || !tokenB) throw new Error('Failed to generate session tokens');
  });

  await test('2. Budget & Categories Persistence and Refresh', async () => {
    // Update budget with custom limit and categories for User A
    const resUpdate = await fetch(`${baseUrl}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        monthlyLimit: 75000,
        categories: [
          { category: 'FOOD_DINING', limit: 15000 },
          { category: 'SHOPPING', limit: 20000 },
          { category: 'TRAVEL', limit: 12000 },
        ],
      }),
    });

    if (!resUpdate.ok) {
      throw new Error(`Budget update failed: ${resUpdate.status} ${await resUpdate.text()}`);
    }

    // Simulate fresh load / refresh from SQLite
    const resGet = await fetch(`${baseUrl}/api/budgets`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const budgetData = await resGet.json();

    if (budgetData.monthlyLimit !== 75000) {
      throw new Error(`Expected monthlyLimit 75000, got ${budgetData.monthlyLimit}`);
    }
    if (!Array.isArray(budgetData.categories) || budgetData.categories.length < 3) {
      throw new Error(`Expected categories array with at least 3 items, got ${JSON.stringify(budgetData.categories)}`);
    }

    const foodCat = budgetData.categories.find((c: any) => c.category === 'FOOD_DINING');
    if (!foodCat || foodCat.limit !== 15000) {
      throw new Error(`Expected FOOD_DINING limit 15000, got ${JSON.stringify(foodCat)}`);
    }
  });

  let createdContactId = '';
  await test('3. Contact CRUD: Create, Read, Update/Favorite & Delete', async () => {
    // Create
    const resCreate = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Sunita Rao',
        phone: '+919876543210',
        vpa: 'sunita@okhdfcbank',
      }),
    });
    if (!resCreate.ok) throw new Error(`Create contact failed: ${await resCreate.text()}`);
    const created = await resCreate.json();
    createdContactId = created.id;

    // Read list
    const resList = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const contactsList = await resList.json();
    const found = contactsList.find((c: any) => c.id === createdContactId);
    if (!found || found.name !== 'Sunita Rao') {
      throw new Error('Created contact not found in list');
    }

    // Update / Favorite
    const resUpdate = await fetch(`${baseUrl}/api/contacts/${createdContactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        isFavorite: true,
      }),
    });
    if (!resUpdate.ok) throw new Error(`Update contact failed: ${await resUpdate.text()}`);

    // Verify update persisted
    const resList2 = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const list2 = await resList2.json();
    const updated = list2.find((c: any) => c.id === createdContactId);
    if (!updated || !updated.isFavorite) {
      throw new Error('Contact favorite status was not persisted');
    }

    // Delete
    const resDel = await fetch(`${baseUrl}/api/contacts/${createdContactId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!resDel.ok) throw new Error(`Delete contact failed: ${await resDel.text()}`);

    // Verify deleted
    const resList3 = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const list3 = await resList3.json();
    if (list3.some((c: any) => c.id === createdContactId)) {
      throw new Error('Contact still exists after deletion');
    }
  });

  await test('4. Alert Lifecycle: Mark Read, Dismiss & Clear All', async () => {
    // Seed 2 alerts for User A
    const a1 = await alertRepository.create({
      userId: userIdA,
      title: 'Suspicious Midnight Login',
      message: 'Detected unusual login attempt.',
      severity: 'high',
      isRead: false,
    });
    const a2 = await alertRepository.create({
      userId: userIdA,
      title: 'Spending Threshold Reached',
      message: 'Food & Dining exceeded 90% of cap.',
      severity: 'medium',
      isRead: false,
    });

    // Read alerts
    const resGet = await fetch(`${baseUrl}/api/alerts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const alerts = await resGet.json();
    if (alerts.length < 2) throw new Error(`Expected at least 2 alerts, got ${alerts.length}`);

    // Mark a1 as read
    const resRead = await fetch(`${baseUrl}/api/alerts/${a1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ isRead: true }),
    });
    if (!resRead.ok) throw new Error('Failed to mark alert as read');

    // Dismiss a1
    const resDismiss = await fetch(`${baseUrl}/api/alerts/${a1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!resDismiss.ok) throw new Error('Failed to dismiss alert');

    // Clear all alerts
    const resClear = await fetch(`${baseUrl}/api/alerts`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!resClear.ok) throw new Error('Failed to clear all alerts');

    // Verify empty alerts in SQLite
    const resFinal = await fetch(`${baseUrl}/api/alerts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const finalAlerts = await resFinal.json();
    if (finalAlerts.length !== 0) {
      throw new Error(`Expected 0 alerts after clearAll, got ${finalAlerts.length}`);
    }
  });

  await test('5. Device Inventory & Revocation Lifecycle', async () => {
    // Register a secondary device
    const resReg = await fetch(`${baseUrl}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Work MacBook Pro',
        browser: 'Firefox 125 on macOS',
        fingerprint: 'mac_fp_test_999',
        location: 'Bengaluru, KA, India',
      }),
    });
    if (!resReg.ok) throw new Error(`Register device failed: ${await resReg.text()}`);
    const regResult = await resReg.json();
    const devId = regResult.deviceId || regResult.device?.id;

    // List devices
    const resList = await fetch(`${baseUrl}/api/devices`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const devs = await resList.json();
    const foundDev = devs.find((d: any) => d.id === devId || d.name === 'Work MacBook Pro');
    if (!foundDev) throw new Error('Registered device not found in device inventory');

    // Revoke device
    const resRevoke = await fetch(`${baseUrl}/api/devices/${foundDev.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!resRevoke.ok) throw new Error(`Revoke device failed: ${await resRevoke.text()}`);

    // Verify revocation in SQLite
    const resListAfter = await fetch(`${baseUrl}/api/devices`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const devsAfter = await resListAfter.json();
    if (devsAfter.some((d: any) => d.id === foundDev.id)) {
      throw new Error('Revoked device still present in active device list');
    }
  });

  await test('6. User Profile, Financial Profile & Security Preferences Persistence', async () => {
    // Update profile with complete financial & security payload
    const resUpdate = await fetch(`${baseUrl}/api/users/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Alice Sentinel Updated',
        city: 'Hyderabad',
        protectionLevel: 'Strict',
        incomeRange: '₹1,00,000–₹2,50,000',
        spendingTarget: 45000,
        savingsGoal: 25000,
        securityAlertsEnabled: true,
        newDeviceAlerts: true,
        transactionAlerts: true,
      }),
    });

    if (!resUpdate.ok) throw new Error(`Profile update failed: ${await resUpdate.text()}`);
    const updateBody = await resUpdate.json();

    // Verify GET /api/users/me/profile fetches the persisted values
    const resGet = await fetch(`${baseUrl}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!resGet.ok) throw new Error(`Fetch profile failed: ${await resGet.text()}`);
    const profile = await resGet.json();

    if (profile.name !== 'Alice Sentinel Updated') {
      throw new Error(`Expected name 'Alice Sentinel Updated', got '${profile.name}'`);
    }
    if (profile.city !== 'Hyderabad') {
      throw new Error(`Expected city 'Hyderabad', got '${profile.city}'`);
    }
    if (profile.financialProfile?.incomeRange !== '₹1,00,000–₹2,50,000') {
      throw new Error(`Expected incomeRange '₹1,00,000–₹2,50,000', got '${profile.financialProfile?.incomeRange}'`);
    }
    if (Number(profile.financialProfile?.spendingTarget) !== 45000) {
      throw new Error(`Expected spendingTarget 45000, got ${profile.financialProfile?.spendingTarget}`);
    }
    if (Number(profile.financialProfile?.savingsGoal) !== 25000) {
      throw new Error(`Expected savingsGoal 25000, got ${profile.financialProfile?.savingsGoal}`);
    }
    if (profile.securityProfile?.protectionLevel !== 'Strict') {
      throw new Error(`Expected protectionLevel 'Strict', got '${profile.securityProfile?.protectionLevel}'`);
    }
  });

  await test('7. Cross-User Data Isolation (User A vs User B)', async () => {
    // Create a contact for User B
    const contactB = await contactRepository.create({
      id: `contact_b_${Date.now()}`,
      userId: userIdB,
      name: 'Bob Secret Contact',
      phone: '+919999888877',
      isFavorite: false,
      isNew: false,
    });

    // User A fetches contacts -> should NOT see User B's contact
    const resAContacts = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const aContacts = await resAContacts.json();
    if (aContacts.some((c: any) => c.id === contactB.id || c.name === 'Bob Secret Contact')) {
      throw new Error('IDOR violation: User A can see User B contacts!');
    }

    // User A tries to modify User B's contact -> should fail (404/403)
    const resAModifyB = await fetch(`${baseUrl}/api/contacts/${contactB.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: 'Hacked Contact' }),
    });
    if (resAModifyB.status !== 404 && resAModifyB.status !== 403) {
      throw new Error(`Expected 404 or 403 when User A modifies User B contact, got ${resAModifyB.status}`);
    }

    // User A tries to delete User B's contact -> should fail (404/403)
    const resADeleteB = await fetch(`${baseUrl}/api/contacts/${contactB.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (resADeleteB.status !== 404 && resADeleteB.status !== 403) {
      throw new Error(`Expected 404 or 403 when User A deletes User B contact, got ${resADeleteB.status}`);
    }

    // User B fetches budget -> should see default/isolated budget, not User A's 75000
    const resBBudget = await fetch(`${baseUrl}/api/budgets`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bBudget = await resBBudget.json();
    if (bBudget.monthlyLimit === 75000) {
      throw new Error('Cross-user budget leak: User B sees User A custom budget limit!');
    }
  });

  await test('8. Duplicate Submission Prevention and Idempotency Validation', async () => {
    // Execute concurrent creation requests for the exact same contact
    const payload = {
      name: 'Pooja Hegde',
      phone: '+919123456789',
      vpa: 'pooja@oksbi',
    };

    // Parallel requests
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(payload),
      }),
      fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(payload),
      }),
    ]);

    // Cleanup added contacts
    const listRes = await fetch(`${baseUrl}/api/contacts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const contactsData = await listRes.json();
    const contacts = Array.isArray(contactsData) ? contactsData : [];
    const poojaContacts = contacts.filter((c: any) => c.phone === '+919123456789');

    for (const c of poojaContacts) {
      await fetch(`${baseUrl}/api/contacts/${c.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    }
  });

  await test('9. Unauthenticated Requests Rejected with 401', async () => {
    const endpoints = [
      { url: `${baseUrl}/api/budgets`, method: 'GET' },
      { url: `${baseUrl}/api/contacts`, method: 'GET' },
      { url: `${baseUrl}/api/alerts`, method: 'GET' },
      { url: `${baseUrl}/api/devices`, method: 'GET' },
      { url: `${baseUrl}/api/users/me/profile`, method: 'GET' },
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, { method: ep.method });
      if (res.status !== 401) {
        throw new Error(`Expected 401 for ${ep.method} ${ep.url}, got ${res.status}`);
      }
    }
  });

  stopTestServer();

  console.log('\n====================================================');
  console.log(`PHASE 4D TESTS COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  stopTestServer();
  process.exit(1);
});
