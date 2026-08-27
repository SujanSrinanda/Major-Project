import crypto from 'crypto';
import { UserAccount, SessionRecord, OtpRecord } from './db';
import { userRepository, UserRepository } from './repositories/user.repository';
import { sessionRepository, SessionRepository } from './repositories/session.repository';
import { otpRepository, OtpRepository } from './repositories/otp.repository';

// Cryptographic Configuration Constants
export const PBKDF2_ITERATIONS = 210000;
export const PBKDF2_LEGACY_ITERATIONS = 1000;
export const PBKDF2_KEY_LENGTH = 64;
export const PBKDF2_DIGEST = 'sha512';
export const PBKDF2_SALT_BYTES = 16;
export const SESSION_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days active session lifetime

// Secure Secret Resolution
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AUTH_SECRET environment variable is required in production.');
    }
    return 'sentinelfin_dev_secret_local_only_do_not_use_in_prod';
  }
  return secret;
}

export function validateAuthEnvironment(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
    throw new Error('FATAL: AUTH_SECRET environment variable is required in production.');
  }
}

// Password Policy Validation
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'admin1234',
  'sentinelfin',
  'sentinelfin123',
  'letmein123',
  'welcome123',
]);

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }

  const trimmed = password.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Password cannot be empty or whitespace only.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }

  // Check for repeated single character (e.g. "aaaaaaaa", "11111111")
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, error: 'Password cannot consist of a single repeated character.' };
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common and easily guessed. Please choose a stronger password.' };
  }

  return { valid: true };
}

// Password hashing
export function hashPassword(
  password: string,
  salt?: string,
  iterations = PBKDF2_ITERATIONS
): { hash: string; salt: string; iterations: number } {
  const actualSalt = salt || crypto.randomBytes(PBKDF2_SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, actualSalt, iterations, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
    .toString('hex');
  return { hash, salt: actualSalt, iterations };
}

export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

export function verifyPassword(password: string, hash: string, salt: string): PasswordVerificationResult {
  try {
    // 1. Try modern 210,000 iterations
    const modernCalc = crypto
      .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
      .toString('hex');
    const buf1 = Buffer.from(modernCalc, 'hex');
    const buf2 = Buffer.from(hash, 'hex');

    if (buf1.length === buf2.length && buf1.length > 0 && crypto.timingSafeEqual(buf1, buf2)) {
      return { valid: true, needsRehash: false };
    }

    // 2. Try legacy 1,000 iterations for backward compatibility & migration
    const legacyCalc = crypto
      .pbkdf2Sync(password, salt, PBKDF2_LEGACY_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
      .toString('hex');
    const bufLegacy = Buffer.from(legacyCalc, 'hex');

    if (bufLegacy.length === buf2.length && bufLegacy.length > 0 && crypto.timingSafeEqual(bufLegacy, buf2)) {
      return { valid: true, needsRehash: true };
    }

    return { valid: false, needsRehash: false };
  } catch (e) {
    return { valid: false, needsRehash: false };
  }
}

// Session Token Generation & Verification
export async function createSessionToken(
  userId: string,
  sessionRepo: SessionRepository = sessionRepository
): Promise<string> {
  const secret = getAuthSecret();
  const payload = {
    userId,
    created: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const str = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(str).digest('hex');
  const token = Buffer.from(str).toString('base64url') + '.' + signature;

  const expiresAt = Date.now() + SESSION_LIFESPAN_MS;
  await sessionRepo.create({
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  return token;
}

export async function verifySessionToken(
  token: string,
  sessionRepo: SessionRepository = sessionRepository,
  userRepo: UserRepository = userRepository
): Promise<UserAccount | null> {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const secret = getAuthSecret();
    const str = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const signature = parts[1];
    const expectedSig = crypto.createHmac('sha256', secret).update(str).digest('hex');

    const bufSig = Buffer.from(signature);
    const bufExp = Buffer.from(expectedSig);
    if (bufSig.length !== bufExp.length || bufSig.length === 0) {
      return null;
    }
    if (!crypto.timingSafeEqual(bufSig, bufExp)) {
      return null;
    }

    const payload = JSON.parse(str);
    const session = await sessionRepo.findByToken(token);

    if (!session || session.expiresAt < Date.now()) {
      if (session) {
        await sessionRepo.delete(token);
      }
      return null;
    }

    const user = await userRepo.findById(payload.userId);
    return user || null;
  } catch (e) {
    return null;
  }
}

// OTP Generation & Verification
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

export interface OtpGenerationResult {
  otp: string;
  expiresInSeconds: number;
  cooldownRemainingSeconds: number;
}

export async function generateAndStoreOtp(
  target: string,
  channel: 'email' | 'phone',
  otpRepo: OtpRepository = otpRepository
): Promise<{ success: boolean; error?: string; result?: OtpGenerationResult }> {
  const existing = await otpRepo.findByTarget(target);
  const now = Date.now();

  if (existing) {
    const timeSinceLastSent = now - existing.lastSentAt;
    if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
      const cooldownLeft = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
      return {
        success: false,
        error: `Please wait ${cooldownLeft} seconds before requesting a new code.`,
      };
    }
  }

  // Cryptographically secure 6-digit random numeric OTP (100000–999999)
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

  const otpRecord: OtpRecord = {
    id: 'otp-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
    target,
    channel,
    codeHash,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: now,
  };

  await otpRepo.save(otpRecord);

  return {
    success: true,
    result: {
      otp: rawOtp,
      expiresInSeconds: 300,
      cooldownRemainingSeconds: 60,
    },
  };
}

export async function verifyOtpCode(
  target: string,
  code: string,
  otpRepo: OtpRepository = otpRepository
): Promise<{ success: boolean; error?: string }> {
  const record = await otpRepo.findByTarget(target);
  const now = Date.now();

  if (!record) {
    return { success: false, error: 'No verification code found. Please request a new code.' };
  }

  if (now > record.expiresAt) {
    await otpRepo.delete(target);
    return { success: false, error: 'That code has expired. Please request a new code.' };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  const providedHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  const expectedBuf = Buffer.from(record.codeHash, 'hex');
  const providedBuf = Buffer.from(providedHash, 'hex');

  const isValid =
    expectedBuf.length === providedBuf.length &&
    expectedBuf.length > 0 &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!isValid) {
    record.attempts += 1;
    await otpRepo.save(record);
    const remaining = MAX_OTP_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Success: consume single-use OTP
  await otpRepo.delete(target);
  return { success: true };
}

