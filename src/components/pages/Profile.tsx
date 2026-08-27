import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  LogOut,
  CheckCircle,
  Camera,
  MapPin,
  Smartphone,
  Save,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/api';
import { NeoButton } from '../common/NeoButton';

interface ProfileProps {
  onNavigate: (route: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, profile, financialProfile, securityProfile, logout, refreshSession } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || profile?.name || '');
  const [phone, setPhone] = useState(user?.phone || profile?.phone || '');
  const [city, setCity] = useState(user?.city || profile?.city || '');
  const [protectionLevel, setProtectionLevel] = useState(
    profile?.protectionLevel || securityProfile?.protectionLevel || 'High Protection'
  );
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);

  // Financial baseline parameters
  const [incomeRange, setIncomeRange] = useState(financialProfile?.incomeRange || '₹50,000–₹1,00,000');
  const [spendingTarget, setSpendingTarget] = useState(financialProfile?.spendingTarget?.toString() || '');
  const [savingsGoal, setSavingsGoal] = useState(financialProfile?.savingsGoal?.toString() || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file must be smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSavedSuccess(false);

      await userApi.updateProfile({
        name: fullName,
        phone,
        city,
        protectionLevel,
        profilePhoto: profilePhoto || undefined,
        incomeRange,
        spendingTarget: parseFloat(spendingTarget) || 30000,
        savingsGoal: parseFloat(savingsGoal) || 10000,
      });

      await refreshSession();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'SF';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          User Identity & Security Control
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-black leading-tight uppercase tracking-tighter">
          Account Profile
        </h1>
        <p className="text-sm font-semibold text-black/70 mt-1">
          Update real user information, profile avatar, and security shield settings.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="bg-white border-2 border-black p-6 neo-shadow space-y-6">
        {/* Profile Avatar Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 border-b-2 border-black pb-6">
          <div className="relative">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={fullName}
                className="w-20 h-20 rounded-full border-2 border-black object-cover neo-shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#7C3AED] text-white border-2 border-black font-black text-2xl flex items-center justify-center neo-shadow shrink-0">
                {getInitials(fullName)}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full border border-black cursor-pointer hover:bg-[#7C3AED] transition-colors">
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-xl font-black text-black uppercase">{fullName || 'Sentinel Member'}</h2>
            <p className="text-xs text-black/60 font-semibold">{user?.email || profile?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-800 px-2 py-0.5 rounded">
                <CheckCircle className="w-3 h-3" /> VERIFIED USER
              </span>
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => setProfilePhoto(null)}
                  className="text-[10px] font-bold text-red-600 hover:underline"
                >
                  Remove Custom Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="bg-emerald-50 border-2 border-black p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Profile changes saved and synchronized with Sentinel Core.</span>
          </div>
        )}

        {/* Editable Form Grid */}
        <div className="space-y-4">
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
                className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <User className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Email Address (Authentication Target)
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={user?.email || profile?.email || ''}
                className="w-full bg-[#E5DFD3] border-2 border-black p-3 pl-10 font-bold text-xs text-black/70 cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-black/40 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
                <Phone className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Primary City / Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
                <MapPin className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
              Threat Shield Protection Level
            </label>
            <div className="relative">
              <select
                value={protectionLevel}
                onChange={(e) => setProtectionLevel(e.target.value as any)}
                className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] appearance-none"
              >
                <option value="Balanced">Balanced — Standard transfers allowed; challenges high risk</option>
                <option value="High Protection">High Protection (Recommended) — Real-time AI intercept</option>
                <option value="Strict">Strict Mode — Maximum protection with mandatory 2FA</option>
              </select>
              <ShieldCheck className="w-4 h-4 text-[#7C3AED] absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Financial Profile Baseline */}
          <div className="p-4 bg-[#FAF7F2] border-2 border-black space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center justify-between">
              <span>Financial Baseline Configuration</span>
              <span className="text-[10px] text-[#7C3AED] font-black">SQLite Persisted</span>
            </h3>

            <div>
              <label className="block text-[11px] font-black uppercase text-black/70 mb-1">
                Estimated Monthly Income Range
              </label>
              <select
                value={incomeRange}
                onChange={(e) => setIncomeRange(e.target.value)}
                className="w-full bg-white border-2 border-black p-2.5 font-bold text-xs"
              >
                <option value="Under ₹25,000">Under ₹25,000</option>
                <option value="₹25,000–₹50,000">₹25,000–₹50,000</option>
                <option value="₹50,000–₹1,00,000">₹50,000–₹1,00,000</option>
                <option value="₹1,00,000–₹2,50,000">₹1,00,000–₹2,50,000</option>
                <option value="₹2,50,000+">₹2,50,000+</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">
                  Monthly Spending Target (₹)
                </label>
                <input
                  type="number"
                  value={spendingTarget}
                  onChange={(e) => setSpendingTarget(e.target.value)}
                  className="w-full bg-white border-2 border-black p-2.5 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">
                  Monthly Savings Goal (₹)
                </label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  className="w-full bg-white border-2 border-black p-2.5 font-bold text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Device Registration Quick Link */}
        <div className="p-4 bg-[#F5F1E8] border-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#7C3AED]" />
            <div>
              <span className="font-black text-xs uppercase block text-black">Registered Devices</span>
              <span className="text-[11px] font-semibold text-black/60">
                View session hardware and revoke untrusted devices.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/safety')}
            className="text-xs font-black uppercase tracking-wider text-[#7C3AED] hover:underline"
          >
            Manage Devices →
          </button>
        </div>

        {/* Save & Sign Out Bar */}
        <div className="pt-4 border-t-2 border-black flex items-center justify-between gap-4">
          <NeoButton
            type="button"
            variant="danger"
            size="md"
            onClick={logout}
            className="uppercase"
          >
            <LogOut className="w-4 h-4 inline mr-1" />
            Sign Out
          </NeoButton>

          <NeoButton
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            className="uppercase"
          >
            <Save className="w-4 h-4 inline mr-1" />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </NeoButton>
        </div>
      </form>
    </div>
  );
};
