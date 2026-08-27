import { UserAccount, StoredDevice } from '../db';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { sessionRepository, SessionRepository } from '../repositories/session.repository';
import { budgetRepository, BudgetRepository } from '../repositories/budget.repository';
import { alertRepository, AlertRepository } from '../repositories/alert.repository';
import { deviceRepository, DeviceRepository } from '../repositories/device.repository';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  generateAndStoreOtp,
  verifyOtpCode,
  validatePasswordPolicy,
} from '../auth';
import { sendOtpNotification } from '../providers';
import { storeUserInNeo4j } from '../neo4j';

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private sessionRepo: SessionRepository = sessionRepository,
    private budgetRepo: BudgetRepository = budgetRepository,
    private alertRepo: AlertRepository = alertRepository,
    private deviceRepo: DeviceRepository = deviceRepository
  ) {}

  async signup(data: { fullName: string; email: string; phone: string; password: string }) {
    const { fullName, email, phone, password } = data;

    if (!fullName || !email || !phone || !password) {
      return { status: 400, data: { error: 'Full name, email, phone number, and password are required.' } };
    }

    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
      return { status: 400, data: { error: passwordCheck.error } };
    }

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) {
      return { status: 400, data: { error: 'An account with this email address already exists.' } };
    }

    const existingPhone = await this.userRepo.findByPhone(phone);
    if (existingPhone) {
      return { status: 400, data: { error: 'An account with this phone number already exists.' } };
    }

    const { hash, salt } = hashPassword(password);
    const userId = 'usr-' + Date.now();

    const newUser: UserAccount = {
      id: userId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: false,
      phoneVerified: false,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await this.userRepo.create(newUser);

    // Store User Node in Neo4j
    storeUserInNeo4j({
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
    }).catch((err) => console.error('Error syncing signup to Neo4j:', err));

    // Initialize default budget
    await this.budgetRepo.save({
      userId,
      monthlyLimit: 35000,
      categories: [
        { id: `cat-${userId}-1`, userId, category: 'Food & Dining', limit: 10000 },
        { id: `cat-${userId}-2`, userId, category: 'Transport', limit: 5000 },
        { id: `cat-${userId}-3`, userId, category: 'Bills & Utilities', limit: 8000 },
        { id: `cat-${userId}-4`, userId, category: 'Shopping', limit: 6000 },
        { id: `cat-${userId}-5`, userId, category: 'Entertainment', limit: 3000 },
        { id: `cat-${userId}-6`, userId, category: 'Other', limit: 3000 },
      ],
    });

    // Initialize default security profile
    await this.userRepo.setSecurityProfile({
      userId,
      securityAlertsEnabled: true,
      newDeviceAlerts: true,
      transactionAlerts: true,
      protectionLevel: 'High Protection',
    });

    // Create initial session token
    const token = await createSessionToken(userId, this.sessionRepo);

    // Send initial phone verification OTP
    const otpRes = await generateAndStoreOtp(newUser.phone, 'phone');
    if (otpRes.success && otpRes.result) {
      await sendOtpNotification(newUser.phone, 'phone', otpRes.result.otp);
    }

    return {
      status: 201,
      data: {
        success: true,
        message: 'Account created successfully. Please verify your phone number.',
        token,
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          emailVerified: newUser.emailVerified,
          phoneVerified: newUser.phoneVerified,
          onboardingCompleted: newUser.onboardingCompleted,
        },
      },
    };
  }

  async sendOtp(channel: 'email' | 'phone', target: string) {
    if (!channel || !target || (channel !== 'email' && channel !== 'phone')) {
      return { status: 400, data: { error: 'Valid channel (email/phone) and target are required.' } };
    }

    const otpRes = await generateAndStoreOtp(target, channel);
    if (!otpRes.success) {
      return { status: 429, data: { error: otpRes.error } };
    }

    const notifyRes = await sendOtpNotification(target, channel, otpRes.result!.otp);

    return {
      status: 200,
      data: {
        success: true,
        message: notifyRes.message,
        expiresInSeconds: otpRes.result?.expiresInSeconds,
        cooldownRemainingSeconds: otpRes.result?.cooldownRemainingSeconds,
      },
    };
  }

  async verifyOtp(channel: 'email' | 'phone', target: string, otp: string, authToken?: string) {
    if (!target || !otp) {
      return { status: 400, data: { error: 'Target and verification code are required.' } };
    }

    const verifyResult = await verifyOtpCode(target, otp);
    if (!verifyResult.success) {
      return { status: 400, data: { error: verifyResult.error } };
    }

    // Update user status if target matches existing user
    let user = channel === 'email' ? await this.userRepo.findByEmail(target) : await this.userRepo.findByPhone(target);

    if (!user && authToken) {
      user = (await verifySessionToken(authToken, this.sessionRepo, this.userRepo)) || undefined;
    }

    if (user) {
      if (channel === 'email') {
        await this.userRepo.update(user.id, { emailVerified: true });
      } else {
        await this.userRepo.update(user.id, { phoneVerified: true });
      }
      user = await this.userRepo.findById(user.id);
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'Verification successful!',
        user: user
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              emailVerified: user.emailVerified,
              phoneVerified: user.phoneVerified,
              onboardingCompleted: user.onboardingCompleted,
            }
          : null,
      },
    };
  }

  async login(identifier: string, password: string, deviceFingerprint?: string, userAgent: string = 'Web Browser') {
    if (!identifier || !password) {
      return { status: 400, data: { error: 'Email/Phone and password are required.' } };
    }

    const user = (await this.userRepo.findByEmail(identifier)) || (await this.userRepo.findByPhone(identifier));
    if (!user) {
      return { status: 401, data: { error: 'Invalid email/phone or password.' } };
    }

    const passVerification = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!passVerification.valid) {
      return { status: 401, data: { error: 'Invalid email/phone or password.' } };
    }

    // Transparent password hash upgrade for legacy accounts (e.g. migrating from 1k to 210k iterations)
    if (passVerification.needsRehash) {
      const { hash: newHash, salt: newSalt } = hashPassword(password);
      await this.userRepo.update(user.id, { passwordHash: newHash, passwordSalt: newSalt });
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLogin: new Date().toISOString() });

    // Track Device
    const userDevices = await this.deviceRepo.findByUserId(user.id);
    const matchedDevice = userDevices.find(
      (d) => d.fingerprint === deviceFingerprint || d.browser === userAgent
    );

    if (!matchedDevice) {
      const newDevice: StoredDevice = {
        id: 'dev-' + Date.now(),
        userId: user.id,
        name: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        browser: userAgent,
        isCurrent: true,
        isTrusted: true,
        lastActive: new Date().toISOString(),
        location: 'Bengaluru, KA, India',
        fingerprint: deviceFingerprint,
      };
      await this.deviceRepo.create(newDevice);

      // Security alert for new device login
      await this.alertRepo.create({
        id: 'alt-' + Date.now(),
        userId: user.id,
        title: 'New Device Sign-In Detected',
        message: `Signed in from ${newDevice.name} (${newDevice.location}).`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        isRead: false,
        actionTaken: 'Device Authorized',
      });
    }

    const token = await createSessionToken(user.id, this.sessionRepo);

    return {
      status: 200,
      data: {
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          onboardingCompleted: user.onboardingCompleted,
        },
      },
    };
  }

  async getMe(user: UserAccount) {
    const finProfile = await this.userRepo.getFinancialProfile(user.id);
    const secProfile = await this.userRepo.getSecurityProfile(user.id);
    const budget = await this.budgetRepo.findByUserId(user.id);

    return {
      status: 200,
      data: {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          onboardingCompleted: user.onboardingCompleted,
          city: user.city,
          profilePhoto: user.profilePhoto,
        },
        financialProfile: finProfile || null,
        securityProfile: secProfile || null,
        budget: budget || null,
      },
    };
  }

  async logout(token?: string) {
    if (token) {
      await this.sessionRepo.delete(token);
    }
    return { status: 200, data: { success: true, message: 'Logged out successfully.' } };
  }

  async forgotPassword(target: string, channel: 'email' | 'phone' = 'email') {
    if (!target) {
      return { status: 400, data: { error: 'Email or phone number is required.' } };
    }

    const user = channel === 'email' ? await this.userRepo.findByEmail(target) : await this.userRepo.findByPhone(target);
    if (!user) {
      // Obfuscate for security
      return { status: 200, data: { success: true, message: 'If an account exists, a reset code was sent.' } };
    }

    const otpRes = await generateAndStoreOtp(target, channel || 'email');
    if (otpRes.success && otpRes.result) {
      await sendOtpNotification(target, channel || 'email', otpRes.result.otp);
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'A password reset code has been sent.',
      },
    };
  }

  async resetPassword(target: string, otp: string, newPassword: string) {
    if (!target || !otp || !newPassword) {
      return { status: 400, data: { error: 'Target, verification code, and new password are required.' } };
    }

    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.valid) {
      return { status: 400, data: { error: passwordCheck.error } };
    }

    const verifyRes = await verifyOtpCode(target, otp);
    if (!verifyRes.success) {
      return { status: 400, data: { error: verifyRes.error } };
    }

    const user = (await this.userRepo.findByEmail(target)) || (await this.userRepo.findByPhone(target));
    if (!user) {
      return { status: 404, data: { error: 'User account not found.' } };
    }

    const { hash, salt } = hashPassword(newPassword);
    await this.userRepo.update(user.id, { passwordHash: hash, passwordSalt: salt });

    // Revoke all existing sessions for the user upon successful password reset
    await this.sessionRepo.deleteByUserId(user.id);

    return { status: 200, data: { success: true, message: 'Password reset successfully. You can now log in.' } };
  }
}

export const authService = new AuthService();
