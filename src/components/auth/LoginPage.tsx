import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('demo@sentinelfin.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email/phone and password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login({ identifier, password });
      if (res.success) {
        if (!res.user?.onboardingCompleted) {
          onNavigate('/onboarding');
        } else {
          onNavigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIdentifier('demo@sentinelfin.com');
    setPassword('password123');
    setError('');
    try {
      setSubmitting(true);
      const res = await login({ identifier: 'demo@sentinelfin.com', password: 'password123' });
      if (res.success) {
        onNavigate('/');
      }
    } catch (err: any) {
      setError('Demo login error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#7C3AED] text-white border-2 border-black neo-shadow-sm rounded-xl mx-auto flex items-center justify-center mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          Protected Financial Core
        </span>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mt-1">
          Welcome to SentinelFin
        </h1>
        <p className="text-xs font-medium text-black/70 mt-1">
          Sign in to manage your money under real-time AI security.
        </p>
      </div>

      <NeoCard className="bg-white p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Email or Phone Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. user@example.com or +91 98765 00000"
              className="w-full bg-[#F5F1E8] border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black/80">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-[11px] font-bold text-[#7C3AED] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#F5F1E8] border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>

          <NeoButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center uppercase mt-2"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In to Dashboard →'}
          </NeoButton>
        </form>

        <div className="relative border-t-2 border-black/20 my-4 text-center">
          <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-black/60 relative -top-2.5">
            OR QUICK DEMO ACCESS
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={submitting}
          className="w-full bg-[#F5F1E8] hover:bg-[#e9e3d3] border-2 border-black p-3 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Quick Sign In as Demo Account (Sujan)</span>
        </button>

        <div className="pt-4 border-t-2 border-black/10 text-center text-xs font-bold text-black/70">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('/signup')}
            className="text-[#7C3AED] underline hover:text-purple-800 cursor-pointer ml-1 font-black"
          >
            Create an Account →
          </button>
        </div>
      </NeoCard>
    </div>
  );
};
