import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, AlertCircle, CheckCircle2, RotateCw, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface VerifyOtpPageProps {
  onNavigate: (route: string) => void;
  target?: string;
  channel?: 'email' | 'phone';
}

export const VerifyOtpPage: React.FC<VerifyOtpPageProps> = ({
  onNavigate,
  target: initialTarget,
  channel: initialChannel = 'phone',
}) => {
  const { user, verifyOtp, sendOtp } = useAuth();
  const target = initialTarget || user?.phone || user?.email || '+91 98765 00000';
  const channel = initialChannel;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [devInfo, setDevInfo] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const copy = [...otp];
    copy[index] = val;
    setOtp(copy);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await verifyOtp({
        channel,
        target,
        otp: fullCode,
      });

      if (res.success) {
        setSuccessMsg('Verification successful!');
        setTimeout(() => {
          if (!user?.onboardingCompleted) {
            onNavigate('/onboarding');
          } else {
            onNavigate('/');
          }
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccessMsg('');
    try {
      setResending(true);
      const res = await sendOtp({ channel, target });
      if (res.success) {
        setSuccessMsg('A new verification code has been dispatched!');
        setCooldown(60);
        if (res.devInfo) {
          setDevInfo(res.devInfo);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#7C3AED] text-white border-2 border-black neo-shadow-sm rounded-xl mx-auto flex items-center justify-center mb-3">
          <KeyRound className="w-8 h-8" />
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          2FA / Single-Use OTP Verification
        </span>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mt-1">
          Verify Security Code
        </h1>
        <p className="text-xs font-medium text-black/70 mt-1">
          We sent a 6-digit verification code to <strong className="text-black">{target}</strong>
        </p>
      </div>

      <NeoCard className="bg-white p-6 space-y-6">
        {devInfo && (
          <div className="bg-purple-50 border-2 border-[#7C3AED] p-3 text-xs font-bold text-purple-900 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#7C3AED]" />
            <div>
              <span className="block font-black uppercase text-[10px] text-[#7C3AED]">Dev Environment Mode</span>
              <span className="font-semibold">{devInfo}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-2 border-black p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-3 text-center">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex items-center justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 text-center bg-[#F5F1E8] border-2 border-black font-black text-xl text-black focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              ))}
            </div>
          </div>

          <NeoButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center uppercase"
            disabled={submitting}
          >
            {submitting ? 'Verifying Code...' : 'Verify & Continue →'}
          </NeoButton>
        </form>

        <div className="pt-4 border-t-2 border-black/10 text-center space-y-2">
          <p className="text-xs font-semibold text-black/60">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className={`text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer ${
              cooldown > 0
                ? 'text-black/40 cursor-not-allowed'
                : 'text-[#7C3AED] hover:underline'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code Now'}
          </button>
        </div>
      </NeoCard>
    </div>
  );
};
