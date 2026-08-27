import { getSqliteClient } from '../db/database';
import { UserAccount, FinancialProfile, SecurityProfile } from '../db';

function mapRowToUser(row: any): UserAccount {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
    emailVerified: Boolean(row.email_verified),
    phoneVerified: Boolean(row.phone_verified),
    onboardingCompleted: Boolean(row.onboarding_completed),
    city: row.city ? String(row.city) : undefined,
    profilePhoto: row.profile_photo ? String(row.profile_photo) : undefined,
    createdAt: String(row.created_at),
    lastLogin: String(row.last_login),
  };
}

function mapRowToFinancialProfile(row: any): FinancialProfile {
  return {
    userId: String(row.user_id),
    incomeRange: String(row.income_range),
    spendingTarget: Number(row.spending_target),
    savingsGoal: Number(row.savings_goal),
    currency: String(row.currency),
  };
}

function mapRowToSecurityProfile(row: any): SecurityProfile {
  return {
    userId: String(row.user_id),
    securityAlertsEnabled: Boolean(row.security_alerts_enabled),
    newDeviceAlerts: Boolean(row.new_device_alerts),
    transactionAlerts: Boolean(row.transaction_alerts),
    protectionLevel: row.protection_level as any,
  };
}

export class UserRepository {
  async findById(id: string): Promise<UserAccount | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<UserAccount | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [email.trim()],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToUser(result.rows[0]);
  }

  async findByPhone(phone: string): Promise<UserAccount | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE phone = ? LIMIT 1;',
      args: [phone.trim()],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToUser(result.rows[0]);
  }

  async create(user: UserAccount): Promise<UserAccount> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, email_verified, phone_verified, onboarding_completed, city, profile_photo, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        user.id,
        user.fullName,
        user.email.toLowerCase(),
        user.phone,
        user.passwordHash,
        user.passwordSalt,
        user.emailVerified ? 1 : 0,
        user.phoneVerified ? 1 : 0,
        user.onboardingCompleted ? 1 : 0,
        user.city || null,
        user.profilePhoto || null,
        user.createdAt || new Date().toISOString(),
        user.lastLogin || new Date().toISOString(),
      ],
    });
    return user;
  }

  async update(id: string, updates: Partial<UserAccount>): Promise<UserAccount | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const merged = { ...existing, ...updates };
    const client = getSqliteClient();
    await client.execute({
      sql: `UPDATE users SET
              full_name = ?,
              email = ?,
              phone = ?,
              password_hash = ?,
              password_salt = ?,
              email_verified = ?,
              phone_verified = ?,
              onboarding_completed = ?,
              city = ?,
              profile_photo = ?,
              last_login = ?
            WHERE id = ?;`,
      args: [
        merged.fullName,
        merged.email.toLowerCase(),
        merged.phone,
        merged.passwordHash,
        merged.passwordSalt,
        merged.emailVerified ? 1 : 0,
        merged.phoneVerified ? 1 : 0,
        merged.onboardingCompleted ? 1 : 0,
        merged.city || null,
        merged.profilePhoto || null,
        merged.lastLogin || new Date().toISOString(),
        id,
      ],
    });

    return merged;
  }

  async getFinancialProfile(userId: string): Promise<FinancialProfile | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM financial_profiles WHERE user_id = ? LIMIT 1;',
      args: [userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToFinancialProfile(result.rows[0]);
  }

  async setFinancialProfile(profile: FinancialProfile): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO financial_profiles (user_id, income_range, spending_target, savings_goal, currency, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              income_range = excluded.income_range,
              spending_target = excluded.spending_target,
              savings_goal = excluded.savings_goal,
              currency = excluded.currency,
              updated_at = excluded.updated_at;`,
      args: [
        profile.userId,
        profile.incomeRange,
        profile.spendingTarget,
        profile.savingsGoal,
        profile.currency,
        new Date().toISOString(),
      ],
    });
  }

  async getSecurityProfile(userId: string): Promise<SecurityProfile | undefined> {
    const client = getSqliteClient();
    const result = await client.execute({
      sql: 'SELECT * FROM security_profiles WHERE user_id = ? LIMIT 1;',
      args: [userId],
    });
    if (result.rows.length === 0) return undefined;
    return mapRowToSecurityProfile(result.rows[0]);
  }

  async setSecurityProfile(profile: SecurityProfile): Promise<void> {
    const client = getSqliteClient();
    await client.execute({
      sql: `INSERT INTO security_profiles (user_id, security_alerts_enabled, new_device_alerts, transaction_alerts, protection_level, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              security_alerts_enabled = excluded.security_alerts_enabled,
              new_device_alerts = excluded.new_device_alerts,
              transaction_alerts = excluded.transaction_alerts,
              protection_level = excluded.protection_level,
              updated_at = excluded.updated_at;`,
      args: [
        profile.userId,
        profile.securityAlertsEnabled ? 1 : 0,
        profile.newDeviceAlerts ? 1 : 0,
        profile.transactionAlerts ? 1 : 0,
        profile.protectionLevel,
        new Date().toISOString(),
      ],
    });
  }
}

export const userRepository = new UserRepository();
