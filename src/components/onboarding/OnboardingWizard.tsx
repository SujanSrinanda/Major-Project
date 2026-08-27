import React, { useState } from 'react';
import {
  Shield,
  User,
  MapPin,
  Wallet,
  PiggyBank,
  CheckCircle2,
  Bell,
  Smartphone,
  ShieldAlert,
  Users,
  Camera,
  Plus,
  Trash2,
  Info,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/api';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface OnboardingWizardProps {
  onNavigate: (route: string) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onNavigate }) => {
  const { user, submitOnboarding } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1 State: Profile
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [phone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);

  // Step 2 State: Financial Baseline
  const [incomeRange, setIncomeRange] = useState('₹50,000–₹1,00,000');
  const [spendingTarget, setSpendingTarget] = useState(35000);
  const [savingsGoal, setSavingsGoal] = useState(15000);

  // Step 3 State: Budget Setup
  const [monthlyLimit, setMonthlyLimit] = useState(45000);
  const [categories, setCategories] = useState([
    { category: 'Food & Dining', limit: 12000 },
    { category: 'Transport', limit: 6000 },
    { category: 'Bills & Utilities', limit: 10000 },
    { category: 'Shopping', limit: 8000 },
    { category: 'Entertainment', limit: 4000 },
    { category: 'Other', limit: 5000 },
  ]);

  // Step 4 State: Contact Permission & Selection
  const [importedContacts, setImportedContacts] = useState<
    { name: string; phone: string; email?: string }[]
  >([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [contactPickerError, setContactPickerError] = useState('');

  // Step 5 State: Security Preferences
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [newDeviceAlerts, setNewDeviceAlerts] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [protectionLevel, setProtectionLevel] = useState<'Balanced' | 'High Protection' | 'Strict'>(
    'High Protection'
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Contact Picker Feature Check
  const isContactPickerSupported =
    typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Please select an image smaller than 2MB.');
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

  const handleCategoryLimitChange = (index: number, val: number) => {
    const updated = [...categories];
    updated[index].limit = Math.max(0, val);
    setCategories(updated);
  };

  const handleRequestNativeContacts = async () => {
    try {
      setContactPickerError('');
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const parsed = contacts.map((c: any) => ({
            name: c.name?.[0] || 'Selected Contact',
            phone: c.tel?.[0] || '',
            email: c.email?.[0] || '',
          })).filter((c: any) => c.phone);
          setImportedContacts((prev) => [...prev, ...parsed]);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setContactPickerError('Browser contact picker unavailable or selection cancelled.');
      }
    }
  };

  const handleAddManualContact = () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      setContactPickerError('Please enter both a contact name and valid phone number.');
      return;
    }
    setImportedContacts((prev) => [
      ...prev,
      { name: manualName.trim(), phone: manualPhone.trim(), email: manualEmail.trim() },
    ]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setContactPickerError('');
  };

  const handleRemoveContact = (idx: number) => {
    setImportedContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFinishOnboarding = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Save imported contacts to server
      for (const contact of importedContacts) {
        try {
          await userApi.addContact({
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            isFavorite: false,
            isNew: true,
          });
        } catch (e) {
          // Contact duplicate or save error
        }
      }

      await submitOnboarding({
        personalInfo: { fullName, city, profilePhoto: profilePhoto || undefined },
        financialProfile: { incomeRange, spendingTarget, savingsGoal, currency: 'INR ₹' },
        budgetSetup: { monthlyLimit, categories },
        securityPreferences: {
          securityAlertsEnabled,
          newDeviceAlerts,
          transactionAlerts,
          protectionLevel,
        },
      });

      setStep(6); // Completion screen
    } catch (err: any) {
      setError(err.message || 'Error saving onboarding profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Initials Avatar Helper
  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'SF';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                STEP 1 OF 5 — YOUR PROFILE
              </span>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mt-1">
                Personal Identity & Location
              </h2>
              <p className="text-xs font-medium text-black/70 mt-1">
                Let's personalize your account identity and regional compliance baseline.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700">
                {error}
              </div>
            )}

            {/* Profile Photo Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F5F1E8] border-2 border-black p-4 neo-shadow-sm">
              <div className="relative">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full border-2 border-black object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#7C3AED] text-white border-2 border-black flex items-center justify-center font-black text-2xl neo-shadow-sm">
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

              <div className="text-center sm:text-left flex-1">
                <span className="text-xs font-black uppercase tracking-wider text-black block">
                  Profile Photo (Optional)
                </span>
                <p className="text-[11px] font-medium text-black/60 mt-0.5">
                  Upload your photo or use your local initials avatar ({getInitials(fullName)}).
                </p>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setProfilePhoto(null)}
                    className="text-[10px] font-bold text-red-600 hover:underline mt-1 block"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sujan Kumar"
                    className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  <User className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full bg-[#E5DFD3] border-2 border-black p-3 pl-10 font-bold text-xs text-black/70 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-black/40 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={phone}
                      className="w-full bg-[#E5DFD3] border-2 border-black p-3 pl-10 font-bold text-xs text-black/70 cursor-not-allowed"
                    />
                    <Phone className="w-4 h-4 text-black/40 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                  Primary Location / City
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru, KA"
                    className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  <MapPin className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <NeoButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  if (!fullName.trim()) {
                    setError('Full Name is required.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="uppercase"
              >
                Next: Financial Setup →
              </NeoButton>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                STEP 2 OF 5 — FINANCIAL SETUP
              </span>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mt-1">
                Income Brackets & Baseline
              </h2>
              <p className="text-xs font-medium text-black/70 mt-1">
                Helps SentinelFin AI calibrate unusual spending volume thresholds for your level.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                  Monthly Income Range
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Below ₹25,000',
                    '₹25,000–₹50,000',
                    '₹50,000–₹1,00,000',
                    '₹1,00,000+',
                  ].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setIncomeRange(range)}
                      className={`p-3 border-2 border-black text-left font-bold text-xs uppercase cursor-pointer transition-all ${
                        incomeRange === range
                          ? 'bg-[#7C3AED] text-white neo-shadow-sm'
                          : 'bg-white text-black hover:bg-[#F5F1E8]'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                    Typical Monthly Spending (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={spendingTarget}
                      onChange={(e) => setSpendingTarget(Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                    <Wallet className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                    Monthly Savings Goal (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={savingsGoal}
                      onChange={(e) => setSavingsGoal(Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-3 pl-10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                    <PiggyBank className="w-4 h-4 text-black/50 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <NeoButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(1)}
                className="uppercase"
              >
                ← Back
              </NeoButton>
              <NeoButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setStep(3)}
                className="uppercase"
              >
                Next: Budget Limits →
              </NeoButton>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                STEP 3 OF 5 — YOUR BUDGET
              </span>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mt-1">
                Set Monthly Spending Caps
              </h2>
              <p className="text-xs font-medium text-black/70 mt-1">
                Initializes the real-time budget envelope used across your dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#1A1A1A] text-white p-4 border-2 border-black neo-shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED] block">
                    Overall Spending Cap Limit
                  </span>
                  <span className="text-2xl font-black tracking-tight">
                    ₹{monthlyLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white text-black border-2 border-black p-1">
                  <span className="text-xs font-black px-1">₹</span>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    className="w-28 bg-transparent font-black text-sm text-right focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-black/80">
                  Category Spending Envelope Caps
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-[#F5F1E8] border-2 border-black p-3 flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-xs text-black">{cat.category}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-black">₹</span>
                        <input
                          type="number"
                          value={cat.limit}
                          onChange={(e) => handleCategoryLimitChange(idx, Number(e.target.value))}
                          className="w-20 bg-white border border-black p-1 font-bold text-xs text-right focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <NeoButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(2)}
                className="uppercase"
              >
                ← Back
              </NeoButton>
              <NeoButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setStep(4)}
                className="uppercase"
              >
                Next: Contact Permissions →
              </NeoButton>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                STEP 4 OF 5 — YOUR CONTACTS
              </span>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mt-1">
                Keep Your Payments Easy
              </h2>
              <p className="text-xs font-medium text-black/70 mt-1">
                Allow SentinelFin to access selected contacts so you can quickly send money to people you know.
              </p>
            </div>

            <div className="bg-[#F5F1E8] border-2 border-black p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#7C3AED] text-white border border-black rounded-lg">
                  <Info className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-black/80 space-y-1">
                  <p className="font-black uppercase text-black text-xs">
                    Explicit Browser Contact Access
                  </p>
                  <p>
                    We only access contacts you explicitly choose through your browser's contact picker. Your address book is never automatically uploaded in bulk.
                  </p>
                </div>
              </div>

              {/* Native Contact Picker Button if Supported */}
              {isContactPickerSupported ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRequestNativeContacts}
                    className="w-full bg-[#7C3AED] text-white border-2 border-black p-3 font-black text-xs uppercase tracking-wider neo-shadow-sm flex items-center justify-center gap-2 hover:bg-[#6D28D9] transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Select Contacts via Browser Picker
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-black text-xs font-bold text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Your current browser does not support the automatic Contact Picker API. Use the manual contact adder below.
                  </span>
                </div>
              )}

              {contactPickerError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2 border border-black">
                  {contactPickerError}
                </p>
              )}
            </div>

            {/* Manual Contact Entry Fallback */}
            <div className="border-2 border-black p-4 space-y-3 bg-white">
              <span className="text-xs font-black uppercase tracking-wider text-black block">
                Add Contact Manually
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="bg-[#F5F1E8] border border-black p-2 font-bold text-xs focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone (+91...)"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="bg-[#F5F1E8] border border-black p-2 font-bold text-xs focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="bg-[#F5F1E8] border border-black p-2 font-bold text-xs focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddManualContact}
                className="w-full bg-black text-white border border-black p-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-black/90"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Contact
              </button>
            </div>

            {/* Imported Contacts List */}
            {importedContacts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-black block">
                  Selected Contacts ({importedContacts.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-black/20 p-2 bg-[#F5F1E8]">
                  {importedContacts.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-black p-2 flex items-center justify-between text-xs font-bold"
                    >
                      <div>
                        <span className="text-black block font-black">{c.name}</span>
                        <span className="text-black/60 text-[10px]">{c.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <NeoButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(3)}
                className="uppercase"
              >
                ← Back
              </NeoButton>
              <NeoButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setStep(5)}
                className="uppercase"
              >
                Next: Security Settings →
              </NeoButton>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                STEP 5 OF 5 — THREAT PROTECTION
              </span>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mt-1">
                Security Settings & Guardrails
              </h2>
              <p className="text-xs font-medium text-black/70 mt-1">
                Choose your protection level and alert rules for real-time transaction intercept.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-black p-3 text-xs font-bold text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-2">
                  Protection Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'Balanced',
                      label: 'Balanced',
                      desc: 'Standard limits; challenges high-risk transfers.',
                    },
                    {
                      id: 'High Protection',
                      label: 'High Protection (Recommended)',
                      desc: 'AI anomaly checks, auto-blocks suspicious targets.',
                    },
                    {
                      id: 'Strict',
                      label: 'Strict Mode',
                      desc: 'Maximum security; prompts 2FA on all new targets.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProtectionLevel(item.id as any)}
                      className={`p-3 border-2 border-black text-left cursor-pointer transition-all ${
                        protectionLevel === item.id
                          ? 'bg-[#7C3AED] text-white neo-shadow-sm'
                          : 'bg-white text-black hover:bg-[#F5F1E8]'
                      }`}
                    >
                      <span className="font-black text-xs uppercase block">{item.label}</span>
                      <span
                        className={`text-[10px] font-medium block mt-1 leading-tight ${
                          protectionLevel === item.id ? 'text-white/80' : 'text-black/60'
                        }`}
                      >
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 bg-[#F5F1E8] border-2 border-black p-4">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#7C3AED]" />
                    <span className="font-bold text-xs text-black">Suspicious Payment Alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={securityAlertsEnabled}
                    onChange={(e) => setSecurityAlertsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#7C3AED]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1 border-t border-black/10">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#7C3AED]" />
                    <span className="font-bold text-xs text-black">New Device Sign-In Alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newDeviceAlerts}
                    onChange={(e) => setNewDeviceAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#7C3AED]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1 border-t border-black/10">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#7C3AED]" />
                    <span className="font-bold text-xs text-black">Blocked Payment Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={transactionAlerts}
                    onChange={(e) => setTransactionAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#7C3AED]"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <NeoButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(4)}
                className="uppercase"
              >
                ← Back
              </NeoButton>
              <NeoButton
                type="button"
                variant="primary"
                size="lg"
                onClick={handleFinishOnboarding}
                disabled={submitting}
                className="uppercase"
              >
                {submitting ? 'Arming Shield...' : 'Complete Setup →'}
              </NeoButton>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-500 text-white border-2 border-black neo-shadow rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Setup Complete & Shield Active
              </span>
              <h2 className="text-3xl font-black text-black uppercase tracking-tight mt-1">
                Welcome to SentinelFin, {fullName.split(' ')[0]}!
              </h2>
              <p className="text-sm font-semibold text-black/70 max-w-md mx-auto mt-2">
                Your profile, budget, device registration, and threat security preferences are active.
              </p>
            </div>

            <NeoButton
              type="button"
              variant="primary"
              size="lg"
              onClick={() => onNavigate('/')}
              className="uppercase text-base px-8 py-4"
            >
              Launch Dashboard →
            </NeoButton>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress Indicator */}
      {step < 6 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black/70 mb-2">
            <span>Setup Wizard</span>
            <span>Step {step} of 5</span>
          </div>
          <div className="w-full bg-[#E5DFD3] border-2 border-black h-4 neo-shadow-sm overflow-hidden p-0.5">
            <div
              className="bg-[#7C3AED] h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      <NeoCard className="bg-white p-6 md:p-8">{renderStepContent()}</NeoCard>
    </div>
  );
};
