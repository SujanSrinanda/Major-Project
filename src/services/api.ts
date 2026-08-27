import {
  RiskEvaluationRequest,
  RiskEvaluationResponse,
  Transaction,
  Contact,
  SecurityAlert,
  TrustedDevice,
} from '../types';

export type { TrustedDevice };

export class ApiError extends Error {
  status: number;
  retryAfter?: number;
  data?: any;

  constructor(message: string, status: number, retryAfter?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.data = data;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function triggerUnauthorized() {
  setStoredToken(null);
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // Prevent listener errors from breaking API execution
    }
  });
}

const TOKEN_KEY = 'sentinelfin_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    // Local storage handled
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.error || data.message || `HTTP ${response.status}: Request failed`;
    
    if (response.status === 401) {
      // Only trigger global auth reset if not an unauthenticated login attempt
      if (url !== '/api/auth/login') {
        triggerUnauthorized();
      }
      throw new ApiError(errorMessage, 401, undefined, data);
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      throw new ApiError(errorMessage, 429, isNaN(retryAfter as number) ? undefined : retryAfter, data);
    }

    throw new ApiError(errorMessage, response.status, undefined, data);
  }

  return data as T;
}

export const authApi = {
  async signup(payload: { fullName: string; email: string; phone: string; password: string }) {
    const data = await request<{
      success: boolean;
      token: string;
      user: any;
      devInfo?: string;
      message: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async sendOtp(payload: { channel: 'email' | 'phone'; target: string }) {
    return request<{
      success: boolean;
      message: string;
      expiresInSeconds?: number;
      cooldownRemainingSeconds?: number;
      devInfo?: string;
    }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyOtp(payload: { channel: 'email' | 'phone'; target: string; otp: string }) {
    return request<{
      success: boolean;
      message: string;
      user: any;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: { identifier: string; password: string; deviceFingerprint?: string }) {
    const data = await request<{
      success: boolean;
      token: string;
      user: any;
      message: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async getMe() {
    return request<{
      success: boolean;
      user: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        emailVerified: boolean;
        phoneVerified: boolean;
        onboardingCompleted: boolean;
        city?: string;
      };
      financialProfile?: any;
      securityProfile?: any;
      budget?: any;
    }>('/api/auth/me');
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Clean up token anyway
    } finally {
      setStoredToken(null);
    }
  },

  async forgotPassword(payload: { target: string; channel?: 'email' | 'phone' }) {
    return request<{ success: boolean; message: string; devInfo?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: { target: string; otp: string; newPassword: string }) {
    return request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitOnboarding(payload: {
    personalInfo?: { fullName: string; city: string };
    financialProfile?: { incomeRange: string; spendingTarget: number; savingsGoal: number; currency: string };
    budgetSetup?: { monthlyLimit: number; categories: { category: string; limit: number }[] };
    securityPreferences?: {
      securityAlertsEnabled: boolean;
      newDeviceAlerts: boolean;
      transactionAlerts: boolean;
      protectionLevel: string;
    };
  }) {
    return request<{
      success: boolean;
      message: string;
      user: any;
    }>('/api/users/me/onboarding', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

export const userApi = {
  async getProfile() {
    return request<any>('/api/users/me/profile');
  },

  async updateProfile(payload: any) {
    return request<any>('/api/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getBudgets() {
    return request<any>('/api/budgets');
  },

  async updateBudget(payload: any) {
    return request<any>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTransactions() {
    return request<Transaction[]>('/api/transactions');
  },

  async addTransaction(tx: Omit<Transaction, 'id'>) {
    return request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  },

  async getContacts() {
    return request<Contact[]>('/api/contacts');
  },

  async addContact(contact: Omit<Contact, 'id' | 'userId'>) {
    return request<Contact>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  },

  async updateContact(id: string, updates: Partial<Contact>) {
    return request(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteContact(id: string) {
    return request(`/api/contacts/${id}`, { method: 'DELETE' });
  },

  async getAlerts() {
    return request<SecurityAlert[]>('/api/alerts');
  },

  async updateAlert(id: string, updates: Partial<SecurityAlert>) {
    return request(`/api/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAlert(id: string) {
    return request(`/api/alerts/${id}`, { method: 'DELETE' });
  },

  async clearAllAlerts() {
    return request('/api/alerts', { method: 'DELETE' });
  },

  async getDevices() {
    return request<TrustedDevice[]>('/api/devices');
  },

  async registerDevice(deviceMeta: {
    browser?: string;
    os?: string;
    fingerprint?: string;
    location?: string;
  }) {
    return request<{ success: boolean; currentDevice: TrustedDevice; devices: TrustedDevice[] }>('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify(deviceMeta),
    });
  },

  async removeDevice(id: string) {
    return request(`/api/devices/${id}`, { method: 'DELETE' });
  },

  async evaluateTransactionRisk(reqData: RiskEvaluationRequest) {
    return request<RiskEvaluationResponse>('/api/evaluate-transaction', {
      method: 'POST',
      body: JSON.stringify(reqData),
    });
  },
};

export const neo4jApi = {
  async getStatus() {
    return request<{ configured: boolean; uri: string | null; database: string }>('/api/neo4j/status');
  },

  async verifyConnection(config?: { uri?: string; username?: string; password?: string; database?: string }) {
    return request<{ success: boolean; message: string; details?: any }>('/api/neo4j/verify', {
      method: 'POST',
      body: JSON.stringify(config || {}),
    });
  },

  async configureCredentials(config: { uri: string; username?: string; password: string; database?: string }) {
    return request<{ success: boolean; message: string; details?: any }>('/api/neo4j/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async getGraphData() {
    return request<{
      nodes: Array<{ id: string; label: string; name: string; type: string; phone?: string }>;
      edges: Array<{ id: string; source: string; target: string; label: string; amount?: number; riskLevel?: string }>;
      summary: { totalAccounts: number; totalTransactions: number; totalHighRisk: number; connected: boolean };
    }>('/api/neo4j/graph');
  },
};

