-- SentinelFin SQLite Core Relational Schema
-- Version 1

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  city TEXT,
  profile_photo TEXT,
  created_at TEXT NOT NULL,
  last_login TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Financial Profiles Table (1-to-1 with users)
CREATE TABLE IF NOT EXISTS financial_profiles (
  user_id TEXT PRIMARY KEY,
  income_range TEXT NOT NULL DEFAULT '₹50,000–₹1,00,000',
  spending_target REAL NOT NULL DEFAULT 30000,
  savings_goal REAL NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'INR ₹',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Security Profiles Table (1-to-1 with users)
CREATE TABLE IF NOT EXISTS security_profiles (
  user_id TEXT PRIMARY KEY,
  security_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  new_device_alerts INTEGER NOT NULL DEFAULT 1,
  transaction_alerts INTEGER NOT NULL DEFAULT 1,
  protection_level TEXT NOT NULL DEFAULT 'High Protection' CHECK (protection_level IN ('Balanced', 'High Protection', 'Strict')),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Budgets Table (1-to-1 with users)
CREATE TABLE IF NOT EXISTS budgets (
  user_id TEXT PRIMARY KEY,
  monthly_limit REAL NOT NULL DEFAULT 45000,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Budget Categories Table (1-to-Many with users/budgets)
CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  limit_amount REAL NOT NULL DEFAULT 5000,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);

-- 6. Sessions Table (1-to-Many with users)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- 7. OTPs Table (Target-based verification)
CREATE TABLE IF NOT EXISTS otps (
  target TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'phone')),
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otps_target ON otps(target);

-- 8. Transactions Table (1-to-Many with users)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  amount REAL NOT NULL,
  note TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  type TEXT NOT NULL DEFAULT 'PHONE' CHECK (type IN ('PHONE', 'CONTACT', 'QR', 'MANUAL', 'BANK')),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CHALLENGED', 'BLOCKED', 'FLAGGED')),
  decision TEXT NOT NULL DEFAULT 'ALLOW' CHECK (decision IN ('ALLOW', 'CHALLENGE', 'BLOCK')),
  safety_score INTEGER NOT NULL DEFAULT 90,
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reasons_json TEXT,
  technical_details_json TEXT,
  is_new_recipient INTEGER DEFAULT 0,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_user_timestamp ON transactions(user_id, timestamp DESC);

-- 9. Contacts Table (1-to-Many with users)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- 10. Alerts Table (1-to-Many with users)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read INTEGER NOT NULL DEFAULT 0,
  action_taken TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_timestamp ON alerts(user_id, timestamp DESC);

-- 11. Devices Table (1-to-Many with users)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  browser TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  is_trusted INTEGER NOT NULL DEFAULT 1,
  last_active TEXT NOT NULL,
  location TEXT,
  fingerprint TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

-- 12. Migrations Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
