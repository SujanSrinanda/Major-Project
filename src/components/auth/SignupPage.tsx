import React, { useState } from 'react';
import { Shield, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validatePassword } from '../../utils/passwordValidation';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface SignupPageProps {
  onNavigate: (route: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Please provide a valid password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await signup({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      if (res.success) {
        // Redirect to OTP Verification page for phone
        onNavigate(`/verify?channel=phone&target=${encodeURIComponent(phone.trim())}`);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please check your inputs.');
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
          New User Registration
        </span>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mt-1">
          Create SentinelFin Account
        </h1>
        <p className="text-xs font-medium text-black/70 mt-1">
          Join the next-generation AI-protected financial network.
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
              Full Legal Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sujan Kumar"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 pl-10 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <User className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sujan@example.com"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 pl-10 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <Mail className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Mobile Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 pl-10 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <Phone className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Create Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#F5F1E8] border-2 border-black p-3 pl-10 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <Lock className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
            </div>
          </div>

          <NeoButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center uppercase mt-2"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Continue to Phone Verification →'}
          </NeoButton>
        </form>

        <div className="pt-4 border-t-2 border-black/10 text-center text-xs font-bold text-black/70">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('/login')}
            className="text-[#7C3AED] underline hover:text-purple-800 cursor-pointer ml-1 font-black"
          >
            Sign In Here →
          </button>
        </div>
      </NeoCard>
    </div>
  );
};
