import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  generateAndStoreOtp,
  verifyOtpCode,
  validateAuthEnvironment,
  PBKDF2_ITERATIONS,
  PBKDF2_LEGACY_ITERATIONS,
} from '../auth';
import { initDatabase, getSqliteClient } from './database';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { otpRepository } from '../repositories/otp.repository';
import { authService } from '../services/auth.service';

async function runPhase3BTests() {
  console.log('\n======================================================');
  console.log('  SENTINELFIN — PHASE 3B SECURITY VERIFICATION SUITE  ');
  console.log('======================================================\n');

  await initDatabase();
  const client = getSqliteClient();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, label: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${label}`);
      throw new Error(`Assertion failed: ${label}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 1: PASSWORD HASHING & LEGACY MIGRATION
  // ----------------------------------------------------
  console.log('--- 1. Password Hashing & Migration Tests ---');

  const testPassword = 'SecureFinancialPass2026!';
  const modernHashResult = hashPassword(testPassword);
  assert(modernHashResult.iterations === PBKDF2_ITERATIONS, `Modern hash uses ${PBKDF2_ITERATIONS} iterations`);

  const modernVerify = verifyPassword(testPassword, modernHashResult.hash, modernHashResult.salt);
  assert(modernVerify.valid === true && modernVerify.needsRehash === false, 'Modern password hash verifies without requiring rehash');

  const wrongVerify = verifyPassword('WrongPassword123', modernHashResult.hash, modernHashResult.salt);
  assert(wrongVerify.valid === false, 'Incorrect password correctly rejected');

  // Create legacy 1,000 iteration password
  const legacySalt = crypto.randomBytes(16).toString('hex');
  const legacyHash = crypto.pbkdf2Sync(testPassword, legacySalt, PBKDF2_LEGACY_ITERATIONS, 64, 'sha512').toString('hex');
  
  const legacyVerify = verifyPassword(testPassword, legacyHash, legacySalt);
  assert(legacyVerify.valid === true && legacyVerify.needsRehash === true, 'Legacy 1,000-iteration hash verifies and flags needsRehash=true');

  // Test Transparent Database Rehash on Login
  const testLegacyUserId = 'usr-test-legacy-' + Date.now();
  await userRepository.create({
    id: testLegacyUserId,
    fullName: 'Legacy User Migration Test',
    email: `legacy_${Date.now()}@sentinelfin.com`,
    phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: legacyHash,
    passwordSalt: legacySalt,
    emailVerified: true,
    phoneVerified: true,
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  });

  const legacyUser = await userRepository.findById(testLegacyUserId);
  const loginRes = await authService.login(legacyUser!.email, testPassword);
  assert(loginRes.status === 200, 'Legacy user logs in successfully');

  const upgradedUser = await userRepository.findById(testLegacyUserId);
  assert(upgradedUser!.passwordHash !== legacyHash, 'Stored password hash was updated transparently in SQLite');

  const upgradedVerify = verifyPassword(testPassword, upgradedUser!.passwordHash, upgradedUser!.passwordSalt);
  assert(upgradedVerify.valid === true && upgradedVerify.needsRehash === false, 'Upgraded stored hash now verifies with 210,000 iterations without needing rehash');

  // ----------------------------------------------------
  // SECTION 2: AUTH_SECRET ENVIRONMENT VALIDATION
  // ----------------------------------------------------
  console.log('\n--- 2. AUTH_SECRET & Secret Validation Tests ---');

  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthSecret = process.env.AUTH_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;

    let threwInProd = false;
    try {
      validateAuthEnvironment();
    } catch (e: any) {
      threwInProd = e.message.includes('AUTH_SECRET');
    }
    assert(threwInProd, 'Server startup throws fatal error if NODE_ENV=production and AUTH_SECRET is missing');

    process.env.AUTH_SECRET = 'valid-test-production-secret-256bit-min';
    let passedInProd = false;
    try {
      validateAuthEnvironment();
      passedInProd = true;
    } catch (e) {
      passedInProd = false;
    }
    assert(passedInProd, 'Server validation passes when AUTH_SECRET is provided in production');
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAuthSecret) {
      process.env.AUTH_SECRET = originalAuthSecret;
    } else {
      delete process.env.AUTH_SECRET;
    }
  }

  // Forged Session Regression Check
  const oldHardcodedSecret = 'sentinelfin_super_secret_jwt_and_session_key_2026';
  const fakePayload = JSON.stringify({ userId: testLegacyUserId, created: Date.now(), nonce: '123' });
  const forgedSig = crypto.createHmac('sha256', oldHardcodedSecret).update(fakePayload).digest('hex');
  const forgedToken = Buffer.from(fakePayload).toString('base64url') + '.' + forgedSig;

  const forgedVerification = await verifySessionToken(forgedToken);
  assert(forgedVerification === null, 'Forged session token signed with old known secret is rejected');

  // ----------------------------------------------------
  // SECTION 3: CRYPTOGRAPHICALLY SECURE OTP & CONTROLS
  // ----------------------------------------------------
  console.log('\n--- 3. Cryptographic OTP & Security Controls Tests ---');

  const testTargetPhone = '+9199999' + Math.floor(10000 + Math.random() * 90000);
  const otpGen = await generateAndStoreOtp(testTargetPhone, 'phone');
  assert(otpGen.success === true && !!otpGen.result, 'OTP generated successfully');

  const generatedOtp = otpGen.result!.otp;
  assert(/^\d{6}$/.test(generatedOtp), 'Generated OTP is exactly 6 numeric digits');

  // Verify stored hashed in SQLite
  const otpRow = await otpRepository.findByTarget(testTargetPhone);
  assert(!!otpRow, 'OTP record exists in SQLite database');
  assert(otpRow!.codeHash !== generatedOtp, 'OTP is stored as SHA-256 hash in SQLite, not plaintext');

  // Test Universal Bypass Removal
  const bypassResult = await verifyOtpCode(testTargetPhone, '123456');
  if (generatedOtp !== '123456') {
    assert(bypassResult.success === false, 'Universal dev bypass 123456 is rejected when actual OTP differs');
  }

  // Test Correct OTP Verification
  const correctResult = await verifyOtpCode(testTargetPhone, generatedOtp);
  assert(correctResult.success === true, 'Correct cryptographic OTP verifies successfully');

  // Test Single-Use Consumption
  const reuseResult = await verifyOtpCode(testTargetPhone, generatedOtp);
  assert(reuseResult.success === false, 'Consumed OTP cannot be reused (single-use consumption enforced)');

  // ----------------------------------------------------
  // SECTION 4: OTP LEAKAGE IN API RESPONSES
  // ----------------------------------------------------
  console.log('\n--- 4. API Response Leakage Checks ---');

  const signupEmail = `test_leak_${Date.now()}@sentinelfin.com`;
  const signupPhone = `+91888${Math.floor(1000000 + Math.random() * 9000000)}`;
  const signupRes = await authService.signup({
    fullName: 'Leakage Test User',
    email: signupEmail,
    phone: signupPhone,
    password: 'Password123!',
  });

  assert(signupRes.status === 201, 'Signup API call succeeds');
  const signupData: any = signupRes.data;
  assert(signupData.otp === undefined, 'Signup API response does NOT contain plaintext otp');
  assert(signupData.devInfo === undefined, 'Signup API response does NOT contain devInfo or bypass code');

  const sendOtpRes = await authService.sendOtp('email', signupEmail);
  const sendOtpData: any = sendOtpRes.data;
  assert(sendOtpData.otp === undefined, 'sendOtp API response does NOT contain plaintext otp');
  assert(sendOtpData.devInfo === undefined, 'sendOtp API response does NOT contain devInfo');

  const forgotRes = await authService.forgotPassword(signupEmail, 'email');
  const forgotData: any = forgotRes.data;
  assert(forgotData.otp === undefined, 'forgotPassword API response does NOT contain plaintext otp');
  assert(forgotData.devInfo === undefined, 'forgotPassword API response does NOT contain devInfo');

  // ----------------------------------------------------
  // SECTION 5: SESSION LIFECYCLE & PASSWORD RESET
  // ----------------------------------------------------
  console.log('\n--- 5. Session Lifecycle & Invalidation Tests ---');

  // Login creates session
  const userLogin = await authService.login(signupEmail, 'Password123!');
  assert(userLogin.status === 200, 'User logs in');
  const userToken = userLogin.data.token!;

  const verifiedUser = await verifySessionToken(userToken);
  assert(verifiedUser !== null && verifiedUser.email === signupEmail, 'Active session token authenticates user');

  // Logout invalidates session
  const logoutRes = await authService.logout(userToken);
  assert(logoutRes.status === 200, 'Logout succeeds');
  const postLogoutVerify = await verifySessionToken(userToken);
  assert(postLogoutVerify === null, 'Logged-out session token is deleted and cannot authenticate');

  // Password reset revokes all active sessions for that user
  const loginBeforeReset = await authService.login(signupEmail, 'Password123!');
  const activeToken1 = loginBeforeReset.data.token!;
  const login2 = await authService.login(signupEmail, 'Password123!');
  const activeToken2 = login2.data.token!;

  assert((await verifySessionToken(activeToken1)) !== null, 'Session 1 active before reset');
  assert((await verifySessionToken(activeToken2)) !== null, 'Session 2 active before reset');

  // Request password reset OTP & execute reset
  const resetOtpRow = await otpRepository.findByTarget(signupEmail);
  // Generate a fresh OTP for reset
  await otpRepository.delete(signupEmail);
  const freshResetOtp = await generateAndStoreOtp(signupEmail, 'email');

  const resetResult = await authService.resetPassword(signupEmail, freshResetOtp.result!.otp, 'NewSecurePass2026!');
  assert(resetResult.status === 200, 'Password reset succeeds');

  // Verify all prior sessions for user are invalidated
  const postResetToken1 = await verifySessionToken(activeToken1);
  const postResetToken2 = await verifySessionToken(activeToken2);
  assert(postResetToken1 === null, 'Prior Session 1 revoked after password reset');
  assert(postResetToken2 === null, 'Prior Session 2 revoked after password reset');

  // Verify login with new password works
  const newLogin = await authService.login(signupEmail, 'NewSecurePass2026!');
  assert(newLogin.status === 200, 'Login with new password succeeds');
  assert((await verifySessionToken(newLogin.data.token!)) !== null, 'New session token authenticates');

  console.log('\n======================================================');
  console.log(`  ALL ${passedTests}/${totalTests} PHASE 3B TESTS PASSED SUCCESSFULLY!  `);
  console.log('======================================================\n');
}

runPhase3BTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nVerification failed with error:', err);
    process.exit(1);
  });
