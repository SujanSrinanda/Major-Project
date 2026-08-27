import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, userApi, getStoredToken, setStoredToken, onUnauthorized } from '../services/api';
import { UserProfile } from '../types';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  city?: string;
  profilePhoto?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  financialProfile: any | null;
  securityProfile: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  signup: (p: { fullName: string; email: string; phone: string; password: string }) => Promise<any>;
  sendOtp: (p: { channel: 'email' | 'phone'; target: string }) => Promise<any>;
  verifyOtp: (p: { channel: 'email' | 'phone'; target: string; otp: string }) => Promise<any>;
  login: (p: { identifier: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
  submitOnboarding: (payload: any) => Promise<any>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateProtectionLevel: (level: string) => Promise<void>;
  reloadUserSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [financialProfile, setFinancialProfile] = useState<any | null>(null);
  const [securityProfile, setSecurityProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setFinancialProfile(null);
    setSecurityProfile(null);
  }, []);

  const fetchCurrentSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      clearAuthState();
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setFinancialProfile(res.financialProfile || null);
        setSecurityProfile(res.securityProfile || null);

        setProfile({
          uid: res.user.id,
          name: res.user.fullName,
          email: res.user.email,
          phone: res.user.phone,
          balance: res.financialProfile?.spendingTarget !== undefined ? Number(res.financialProfile.spendingTarget) : undefined,
          safetyScore: undefined,
          protectionLevel: res.securityProfile?.protectionLevel || 'High Protection',
          notificationsEnabled: res.securityProfile?.securityAlertsEnabled ?? true,
          createdAt: new Date().toISOString(),
        });

        // Register / update device metadata asynchronously
        try {
          const userAgent = navigator.userAgent;
          let browser = 'Desktop Browser';
          if (userAgent.includes('Firefox')) browser = 'Firefox';
          else if (userAgent.includes('Chrome')) browser = 'Chrome';
          else if (userAgent.includes('Safari')) browser = 'Safari';
          else if (userAgent.includes('Edge')) browser = 'Edge';

          let os = 'Web';
          if (userAgent.includes('Win')) os = 'Windows';
          else if (userAgent.includes('Mac')) os = 'macOS';
          else if (userAgent.includes('Linux')) os = 'Linux';
          else if (userAgent.includes('Android')) os = 'Android';
          else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

          let fingerprint = localStorage.getItem('sentinelfin_device_fp');
          if (!fingerprint) {
            fingerprint = 'fp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
            localStorage.setItem('sentinelfin_device_fp', fingerprint);
          }

          userApi.registerDevice({ browser, os, fingerprint, location: 'Bengaluru, KA, India' }).catch(() => {});
        } catch (devErr) {
          // Device metadata error ignored
        }
      } else {
        setStoredToken(null);
        clearAuthState();
      }
    } catch (err) {
      console.warn('Session restoration note:', err);
      setStoredToken(null);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    fetchCurrentSession();

    // Global 401 listener
    const unsubscribe = onUnauthorized(() => {
      clearAuthState();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchCurrentSession, clearAuthState]);

  const signup = async (payload: { fullName: string; email: string; phone: string; password: string }) => {
    const res = await authApi.signup(payload);
    if (res.user) {
      setUser(res.user);
      setProfile({
        uid: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        phone: res.user.phone,
        balance: undefined,
        safetyScore: undefined,
        protectionLevel: 'High Protection',
        notificationsEnabled: true,
        createdAt: new Date().toISOString(),
      });
    }
    return res;
  };

  const sendOtp = async (payload: { channel: 'email' | 'phone'; target: string }) => {
    return authApi.sendOtp(payload);
  };

  const verifyOtp = async (payload: { channel: 'email' | 'phone'; target: string; otp: string }) => {
    const res = await authApi.verifyOtp(payload);
    if (res.user && user) {
      setUser({ ...user, ...res.user });
    }
    return res;
  };

  const login = async (payload: { identifier: string; password: string }) => {
    const res = await authApi.login(payload);
    if (res.user) {
      setUser(res.user);
      await fetchCurrentSession();
    }
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network error on logout
    } finally {
      setStoredToken(null);
      clearAuthState();
    }
  };

  const submitOnboarding = async (payload: any) => {
    const res = await authApi.submitOnboarding(payload);
    if (res.user) {
      setUser(res.user);
      await fetchCurrentSession();
    }
    return res;
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await userApi.updateProfile({
        name: data.name,
        phone: data.phone,
        protectionLevel: data.protectionLevel,
        notificationsEnabled: data.notificationsEnabled,
      });
      await fetchCurrentSession();
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const updateProtectionLevel = async (level: string) => {
    let normalized: 'Balanced' | 'High Protection' | 'Strict' = 'High Protection';
    const upper = level.toUpperCase();
    if (upper.includes('BALANC')) normalized = 'Balanced';
    else if (upper.includes('STRICT')) normalized = 'Strict';
    else normalized = 'High Protection';

    if (profile) {
      setProfile((prev) => (prev ? { ...prev, protectionLevel: normalized } : null));
    }
    if (securityProfile) {
      setSecurityProfile((prev: any) => (prev ? { ...prev, protectionLevel: normalized } : null));
    }

    try {
      await userApi.updateProfile({ protectionLevel: normalized });
      await fetchCurrentSession();
    } catch (err) {
      console.error('Update protection level error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        financialProfile,
        securityProfile,
        loading,
        isAuthenticated: !!user,
        onboardingCompleted: !!user?.onboardingCompleted,
        signup,
        sendOtp,
        verifyOtp,
        login,
        logout,
        submitOnboarding,
        updateProfileData,
        updateProtectionLevel,
        reloadUserSession: fetchCurrentSession,
        refreshSession: fetchCurrentSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
