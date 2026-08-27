import { getSqliteClient, dbManager, initDatabase } from './database';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { otpRepository } from '../repositories/otp.repository';
import { budgetRepository } from '../repositories/budget.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { contactRepository } from '../repositories/contact.repository';
import { alertRepository } from '../repositories/alert.repository';
import { deviceRepository } from '../repositories/device.repository';
import { createSessionToken, verifySessionToken, generateAndStoreOtp, verifyOtpCode } from '../auth';

export async function verifyPhase2b(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🚀 SENTINELFIN PHASE 2B VERIFICATION SUITE');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // Ensure DB is initialized
  await initDatabase();

  // Test 1: SQLite Connection & Foreign Keys
  await test('1. SQLite Connection & Foreign Keys Enabled', async () => {
    const isFk = await dbManager.checkForeignKeys();
    if (!isFk) throw new Error('Foreign keys are not enabled!');
  });

  // Test 2: User Repository - Find Demo User
  await test('2. UserRepository.findById for demo user', async () => {
    const demoUser = await userRepository.findById('usr-demo-001');
    if (!demoUser) throw new Error('Demo user usr-demo-001 not found!');
    if (demoUser.email !== 'demo@sentinelfin.com') {
      throw new Error(`Email mismatch: got ${demoUser.email}`);
    }
  });

  // Test 3: User Repository - Find by Email and Phone
  await test('3. UserRepository findByEmail & findByPhone', async () => {
    const byEmail = await userRepository.findByEmail('DEMO@SENTINELFIN.COM');
    if (!byEmail || byEmail.id !== 'usr-demo-001') throw new Error('Case-insensitive findByEmail failed');

    const byPhone = await userRepository.findByPhone('+919876543210');
    if (!byPhone || byPhone.id !== 'usr-demo-001') throw new Error('findByPhone failed');
  });

  // Test 4: User Financial & Security Profiles
  await test('4. UserRepository Financial & Security Profiles', async () => {
    const fin = await userRepository.getFinancialProfile('usr-demo-001');
    if (!fin || fin.spendingTarget !== 40000) throw new Error('Financial profile incorrect');

    const sec = await userRepository.getSecurityProfile('usr-demo-001');
    if (!sec || sec.protectionLevel !== 'High Protection') throw new Error('Security profile incorrect');
  });

  // Test 5: Budget Repository - Find and Save
  await test('5. BudgetRepository retrieve and update categories', async () => {
    const budget = await budgetRepository.findByUserId('usr-demo-001');
    if (!budget) throw new Error('Budget not found for demo user');
    if (budget.categories.length !== 6) {
      throw new Error(`Expected 6 categories, got ${budget.categories.length}`);
    }

    // Test saving new category list
    await budgetRepository.save({
      userId: 'usr-demo-001',
      monthlyLimit: 45000,
      categories: [
        ...budget.categories,
        { id: 'cat-test-new', userId: 'usr-demo-001', category: 'Investment', limit: 15000 },
      ],
    });

    const updated = await budgetRepository.findByUserId('usr-demo-001');
    if (!updated || updated.categories.length !== 7) {
      throw new Error('Failed to update budget categories');
    }

    // Restore original
    await budgetRepository.save(budget);
    const restored = await budgetRepository.findByUserId('usr-demo-001');
    if (restored?.categories.length !== 6) throw new Error('Failed to restore original budget');
  });

  // Test 6: Transaction Repository - Retrieval & Creation
  await test('6. TransactionRepository create and retrieve with JSON details', async () => {
    const testTxId = 'tx-test-' + Date.now();
    await transactionRepository.create({
      id: testTxId,
      userId: 'usr-demo-001',
      recipientName: 'Test Target Merchant',
      recipientPhone: '+919999900000',
      amount: 1250,
      note: 'Dinner test',
      category: 'Food & Dining',
      type: 'PHONE',
      status: 'COMPLETED',
      decision: 'ALLOW',
      safetyScore: 92,
      riskLevel: 'LOW',
      reasons: ['Reason 1', 'Reason 2'],
      technicalDetails: { testScore: 0.95, model: 'TestAI' },
      timestamp: new Date().toISOString(),
    });

    const fetched = await transactionRepository.findById(testTxId);
    if (!fetched) throw new Error('Inserted transaction not found');
    if (fetched.reasons.length !== 2 || fetched.reasons[0] !== 'Reason 1') {
      throw new Error('Transaction reasons JSON deserialization failed');
    }
    if (fetched.technicalDetails?.testScore !== 0.95) {
      throw new Error('Transaction technicalDetails JSON deserialization failed');
    }

    // Clean up test transaction
    const client = getSqliteClient();
    await client.execute({ sql: 'DELETE FROM transactions WHERE id = ?;', args: [testTxId] });
  });

  // Test 7: Contact Repository - CRUD
  await test('7. ContactRepository CRUD', async () => {
    const testContactId = 'c-test-' + Date.now();
    await contactRepository.create({
      id: testContactId,
      userId: 'usr-demo-001',
      name: 'Alice Johnson',
      phone: '+919876543219',
      email: 'alice@example.com',
      isFavorite: true,
      isNew: false,
    });

    const contacts = await contactRepository.findByUserId('usr-demo-001');
    const created = contacts.find((c) => c.id === testContactId);
    if (!created || !created.isFavorite) throw new Error('Created contact not found or invalid');

    await contactRepository.update(testContactId, 'usr-demo-001', { name: 'Alice Smith' });
    const updated = await contactRepository.findById(testContactId);
    if (updated?.name !== 'Alice Smith') throw new Error('Contact update failed');

    await contactRepository.delete(testContactId, 'usr-demo-001');
    const deleted = await contactRepository.findById(testContactId);
    if (deleted) throw new Error('Contact delete failed');
  });

  // Test 8: Alert Repository - CRUD & Clear
  await test('8. AlertRepository CRUD & Clear', async () => {
    const testAlertId = 'alt-test-' + Date.now();
    await alertRepository.create({
      id: testAlertId,
      userId: 'usr-demo-001',
      title: 'Suspicious Login Attempt',
      message: 'Blocked unauthorized access',
      severity: 'high',
      isRead: false,
      timestamp: new Date().toISOString(),
    });

    const alert = await alertRepository.findById(testAlertId);
    if (!alert || alert.severity !== 'high') throw new Error('Alert creation failed');

    await alertRepository.update(testAlertId, 'usr-demo-001', { isRead: true });
    const updatedAlert = await alertRepository.findById(testAlertId);
    if (!updatedAlert?.isRead) throw new Error('Alert update isRead failed');

    await alertRepository.delete(testAlertId, 'usr-demo-001');
    const deletedAlert = await alertRepository.findById(testAlertId);
    if (deletedAlert) throw new Error('Alert delete failed');
  });

  // Test 9: Device Repository - CRUD
  await test('9. DeviceRepository CRUD', async () => {
    const testDeviceId = 'dev-test-' + Date.now();
    await deviceRepository.create({
      id: testDeviceId,
      userId: 'usr-demo-001',
      name: 'Safari on macOS',
      browser: 'Safari',
      isCurrent: false,
      isTrusted: true,
      lastActive: new Date().toISOString(),
      location: 'Bengaluru, KA, India',
    });

    const device = await deviceRepository.findById(testDeviceId);
    if (!device || device.browser !== 'Safari') throw new Error('Device creation failed');

    await deviceRepository.delete(testDeviceId);
    const deletedDevice = await deviceRepository.findById(testDeviceId);
    if (deletedDevice) throw new Error('Device delete failed');
  });

  // Test 10: Session Token Lifecycle (Auth Module)
  await test('10. Session creation & verification with SQLite storage', async () => {
    const token = await createSessionToken('usr-demo-001');
    if (!token) throw new Error('Token generation failed');

    const session = await sessionRepository.findByToken(token);
    if (!session || session.userId !== 'usr-demo-001') throw new Error('Session not persisted to SQLite');

    const verifiedUser = await verifySessionToken(token);
    if (!verifiedUser || verifiedUser.id !== 'usr-demo-001') throw new Error('verifySessionToken failed');

    await sessionRepository.delete(token);
    const deletedSession = await sessionRepository.findByToken(token);
    if (deletedSession) throw new Error('Session delete failed');
  });

  // Test 11: OTP Lifecycle (Auth Module)
  await test('11. OTP generation, storage, cooldown and verification', async () => {
    const testPhone = '+919999988888';
    const otpRes = await generateAndStoreOtp(testPhone, 'phone');
    if (!otpRes.success || !otpRes.result) throw new Error(`OTP generation failed: ${otpRes.error}`);

    const otpCode = otpRes.result.otp;
    const record = await otpRepository.findByTarget(testPhone);
    if (!record) throw new Error('OTP record not stored in SQLite');

    // Test invalid code
    const badVerify = await verifyOtpCode(testPhone, '000000');
    if (badVerify.success) throw new Error('Invalid OTP unexpectedly succeeded');

    // Test valid code
    const goodVerify = await verifyOtpCode(testPhone, otpCode);
    if (!goodVerify.success) throw new Error(`Valid OTP verification failed: ${goodVerify.error}`);

    // Verify OTP was consumed
    const consumed = await otpRepository.findByTarget(testPhone);
    if (consumed) throw new Error('Single-use OTP was not consumed');
  });

  // Test 12: User Creation and Cascade Deletion
  await test('12. User Creation & Foreign Key Cascade Deletion', async () => {
    const testUserId = 'usr-temp-' + Date.now();
    await userRepository.create({
      id: testUserId,
      fullName: 'Temp User',
      email: 'temp@test.com',
      phone: '+919000000001',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      emailVerified: true,
      phoneVerified: true,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

    await userRepository.setFinancialProfile({
      userId: testUserId,
      incomeRange: '₹50,000–₹1,00,000',
      spendingTarget: 25000,
      savingsGoal: 5000,
      currency: 'INR ₹',
    });

    await budgetRepository.save({
      userId: testUserId,
      monthlyLimit: 30000,
      categories: [{ id: `cat-${testUserId}-1`, userId: testUserId, category: 'Food', limit: 5000 }],
    });

    // Delete user from SQLite directly to verify ON DELETE CASCADE
    const client = getSqliteClient();
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?;', args: [testUserId] });

    const fin = await userRepository.getFinancialProfile(testUserId);
    if (fin) throw new Error('Cascade delete failed on financial_profiles');

    const budget = await budgetRepository.findByUserId(testUserId);
    if (budget) throw new Error('Cascade delete failed on budgets');
  });

  console.log('\n========================================');
  console.log(`🏁 Phase 2B Verification: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  return failed === 0;
}

if (process.argv[1]?.includes('verifyPhase2b')) {
  verifyPhase2b().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
