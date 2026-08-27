import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  city?: string;
  profilePhoto?: string;
  createdAt: string;
  lastLogin: string;
}

export interface FinancialProfile {
  userId: string;
  incomeRange: string; // e.g. "₹50,000–₹1,00,000"
  spendingTarget: number;
  savingsGoal: number;
  currency: string; // "INR ₹"
}

export interface SecurityProfile {
  userId: string;
  securityAlertsEnabled: boolean;
  newDeviceAlerts: boolean;
  transactionAlerts: boolean;
  protectionLevel: 'Balanced' | 'High Protection' | 'Strict';
}

export interface BudgetCategory {
  id: string;
  userId: string;
  category: string;
  limit: number;
}

export interface UserBudget {
  userId: string;
  monthlyLimit: number;
  categories: BudgetCategory[];
}

export interface OtpRecord {
  id: string;
  target: string; // email or phone
  channel: 'email' | 'phone';
  codeHash: string;
  expiresAt: number; // timestamp
  attempts: number;
  lastSentAt: number; // timestamp for cooldown
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
}

export interface StoredTransaction {
  id: string;
  userId: string;
  recipientName: string;
  recipientPhone: string;
  amount: number;
  note?: string;
  category?: string;
  type: 'PHONE' | 'CONTACT' | 'QR' | 'MANUAL' | 'BANK';
  status: 'PENDING' | 'COMPLETED' | 'CHALLENGED' | 'BLOCKED' | 'FLAGGED';
  decision: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
  safetyScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  technicalDetails?: any;
  timestamp: string;
  isNewRecipient?: boolean;
}

export interface StoredContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  isFavorite: boolean;
  isNew: boolean;
  email?: string;
}

export interface StoredAlert {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead: boolean;
  relatedTransactionId?: string;
  actionTaken?: string;
}

export interface StoredDevice {
  id: string;
  userId: string;
  name: string;
  browser: string;
  isCurrent: boolean;
  isTrusted: boolean;
  lastActive: string;
  location?: string;
  fingerprint?: string;
}

interface DatabaseSchema {
  users: UserAccount[];
  financialProfiles: FinancialProfile[];
  securityProfiles: SecurityProfile[];
  budgets: UserBudget[];
  otps: OtpRecord[];
  sessions: SessionRecord[];
  transactions: StoredTransaction[];
  contacts: StoredContact[];
  alerts: StoredAlert[];
  devices: StoredDevice[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'sentinelfin_db.json');

class LocalDB {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromFile();
    this.initDefaultUser();
  }

  private loadFromFile(): DatabaseSchema {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load DB file, starting fresh:', e);
    }
    return {
      users: [],
      financialProfiles: [],
      securityProfiles: [],
      budgets: [],
      otps: [],
      sessions: [],
      transactions: [],
      contacts: [],
      alerts: [],
      devices: [],
    };
  }

  public save(): void {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save DB to disk:', e);
    }
  }

  private initDefaultUser() {
    const salt = 'demo_salt_12345';
    const hash = crypto.pbkdf2Sync('password123', salt, 1000, 64, 'sha512').toString('hex');

    const demoUser = this.data.users.find((u) => u.email === 'demo@sentinelfin.com' || u.phone === '+919876543210');
    if (demoUser) {
      if (!demoUser.passwordHash || demoUser.passwordHash.length !== 128) {
        demoUser.passwordHash = hash;
        demoUser.passwordSalt = salt;
        this.save();
      }
      return;
    }

    const userId = 'usr-demo-001';

    this.data.users.push({
      id: userId,
      fullName: 'Sujan Kumar',
      email: 'demo@sentinelfin.com',
      phone: '+919876543210',
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: true,
      phoneVerified: true,
      onboardingCompleted: true,
      city: 'Bengaluru',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

      this.data.financialProfiles.push({
        userId,
        incomeRange: '₹50,000–₹1,00,000',
        spendingTarget: 40000,
        savingsGoal: 15000,
        currency: 'INR ₹',
      });

      this.data.securityProfiles.push({
        userId,
        securityAlertsEnabled: true,
        newDeviceAlerts: true,
        transactionAlerts: true,
        protectionLevel: 'High Protection',
      });

      this.data.budgets.push({
        userId,
        monthlyLimit: 45000,
        categories: [
          { id: 'cat-1', userId, category: 'Food & Dining', limit: 12000 },
          { id: 'cat-2', userId, category: 'Transport', limit: 6000 },
          { id: 'cat-3', userId, category: 'Bills & Utilities', limit: 10000 },
          { id: 'cat-4', userId, category: 'Shopping', limit: 8000 },
          { id: 'cat-5', userId, category: 'Entertainment', limit: 4000 },
          { id: 'cat-6', userId, category: 'Other', limit: 5000 },
        ],
      });

      this.save();
  }

  // Users
  public getUsers() { return this.data.users; }
  public findUserById(id: string) { return this.data.users.find((u) => u.id === id); }
  public findUserByEmail(email: string) { return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()); }
  public findUserByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.data.users.find((u) => u.phone.replace(/\D/g, '').endsWith(clean.slice(-10)));
  }
  public addUser(user: UserAccount) {
    this.data.users.push(user);
    this.save();
  }
  public updateUser(id: string, updates: Partial<UserAccount>) {
    const u = this.findUserById(id);
    if (u) {
      Object.assign(u, updates);
      this.save();
    }
  }

  // Financial Profiles
  public getFinancialProfile(userId: string) { return this.data.financialProfiles.find((p) => p.userId === userId); }
  public setFinancialProfile(profile: FinancialProfile) {
    const idx = this.data.financialProfiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) this.data.financialProfiles[idx] = profile;
    else this.data.financialProfiles.push(profile);
    this.save();
  }

  // Security Profiles
  public getSecurityProfile(userId: string) { return this.data.securityProfiles.find((p) => p.userId === userId); }
  public setSecurityProfile(profile: SecurityProfile) {
    const idx = this.data.securityProfiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) this.data.securityProfiles[idx] = profile;
    else this.data.securityProfiles.push(profile);
    this.save();
  }

  // Budgets
  public getBudget(userId: string) { return this.data.budgets.find((b) => b.userId === userId); }
  public setBudget(budget: UserBudget) {
    const idx = this.data.budgets.findIndex((b) => b.userId === budget.userId);
    if (idx >= 0) this.data.budgets[idx] = budget;
    else this.data.budgets.push(budget);
    this.save();
  }

  // OTPs
  public getOtp(target: string) {
    const clean = target.toLowerCase().trim();
    return this.data.otps.find((o) => o.target.toLowerCase() === clean);
  }
  public setOtp(otp: OtpRecord) {
    const idx = this.data.otps.findIndex((o) => o.target.toLowerCase() === otp.target.toLowerCase());
    if (idx >= 0) this.data.otps[idx] = otp;
    else this.data.otps.push(otp);
    this.save();
  }
  public deleteOtp(target: string) {
    this.data.otps = this.data.otps.filter((o) => o.target.toLowerCase() !== target.toLowerCase());
    this.save();
  }

  // Sessions
  public getSession(token: string) { return this.data.sessions.find((s) => s.token === token); }
  public addSession(session: SessionRecord) {
    this.data.sessions.push(session);
    this.save();
  }
  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  // Transactions
  public getTransactions(userId: string) {
    return this.data.transactions.filter((t) => t.userId === userId);
  }
  public addTransaction(tx: StoredTransaction) {
    this.data.transactions.unshift(tx);
    this.save();
  }

  // Contacts
  public getContacts(userId: string) {
    return this.data.contacts.filter((c) => c.userId === userId);
  }
  public addContact(c: StoredContact) {
    this.data.contacts.unshift(c);
    this.save();
  }
  public updateContact(id: string, updates: Partial<StoredContact>) {
    const target = this.data.contacts.find((c) => c.id === id);
    if (target) {
      Object.assign(target, updates);
      this.save();
    }
  }
  public deleteContact(id: string) {
    this.data.contacts = this.data.contacts.filter((c) => c.id !== id);
    this.save();
  }

  // Alerts
  public getAlerts(userId: string) {
    return this.data.alerts.filter((a) => a.userId === userId);
  }
  public addAlert(a: StoredAlert) {
    this.data.alerts.unshift(a);
    this.save();
  }
  public updateAlert(id: string, updates: Partial<StoredAlert>) {
    const target = this.data.alerts.find((a) => a.id === id);
    if (target) {
      Object.assign(target, updates);
      this.save();
    }
  }
  public deleteAlert(id: string) {
    this.data.alerts = this.data.alerts.filter((a) => a.id !== id);
    this.save();
  }
  public clearUserAlerts(userId: string) {
    this.data.alerts = this.data.alerts.filter((a) => a.userId !== userId);
    this.save();
  }

  // Devices
  public getDevices(userId: string) {
    return this.data.devices.filter((d) => d.userId === userId);
  }
  public addDevice(d: StoredDevice) {
    this.data.devices.unshift(d);
    this.save();
  }
  public updateDevice(id: string, updates: Partial<StoredDevice>) {
    const target = this.data.devices.find((d) => d.id === id);
    if (target) {
      Object.assign(target, updates);
      this.save();
    }
  }
  public deleteDevice(id: string) {
    this.data.devices = this.data.devices.filter((d) => d.id !== id);
    this.save();
  }
  public clearUserDevices(userId: string) {
    this.data.devices = this.data.devices.filter((d) => d.userId !== userId);
    this.save();
  }
}

export const db = new LocalDB();
