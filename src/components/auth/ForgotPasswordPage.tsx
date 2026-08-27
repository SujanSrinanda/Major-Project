import React, { useState } from 'react';
import { Shield, KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { validatePassword } from '../../utils/passwordValidation';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface ForgotPasswordPageProps {
  onNavigate: (route: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [target, setTarget] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [devInfo, setDevInfo] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!target.trim()) {
      setError('Please enter your registered email or phone number.');
      return;
    }

    try {
      setLoading(true);
      const isEmail = target.includes('@');
      const res = await authApi.forgotPassword({
        target: target.trim(),
        channel: isEmail ? 'email' : 'phone',
      });
      if (res.success) {
        setSuccess('Reset code dispatched!');
        if (res.devInfo) setDevInfo(res.devInfo);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Error requesting reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || !newPassword) {
      setError('Please enter the code and new password.');
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Please choose a valid new password.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.resetPassword({
        target: target.trim(),
        otp: otp.trim(),
        newPassword,
      });
      if (res.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => onNavigate('/login'), 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#7C3AED] text-white border-2 border-black neo-shadow-sm rounded-xl mx-auto flex items-center justify-center mb-3">
          <KeyRound className="w-8 h-8" />
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          Account Recovery
        </span>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mt-1">
          Reset Password
        </h1>
        <p className="text-xs font-medium text-black/70 mt-1">
          Securely recover access to your SentinelFin account.
        </p>
      </div>

      <NeoCard className="bg-white p-6 space-y-6">
        {devInfo && (
          <div className="bg-purple-50 border-2 border-[#7C3AED] p-3 text-xs font-bold text-purple-900">
            {devInfo}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border-2 border-black p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Registered Email or Phone
              </label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. user@example.com or +91 98765 00000"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <NeoButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center uppercase"
              disabled={loading}
            >
              {loading ? 'Sending Code...' : 'Send Recovery Code →'}
            </NeoButton>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                6-Digit Recovery Code
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code or 123456"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                New Security Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <NeoButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center uppercase"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Sign In →'}
            </NeoButton>
          </form>
        )}

        <div className="pt-4 border-t-2 border-black/10 text-center text-xs font-bold text-black/70">
          Remembered your password?{' '}
          <button
            onClick={() => onNavigate('/login')}
            className="text-[#7C3AED] underline hover:text-purple-800 cursor-pointer font-black"
          >
            Back to Sign In →
          </button>
        </div>
      </NeoCard>
    </div>
  );
};
