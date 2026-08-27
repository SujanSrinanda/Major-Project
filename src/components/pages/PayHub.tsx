import React, { useState, useEffect } from 'react';
import { Send, QrCode, UserCheck, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, UserPlus, Camera, Scan } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { RiskEvaluationRequest, RiskEvaluationResponse, Contact } from '../../types';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';
import { NeoBadge } from '../common/NeoBadge';
import { BiometricAuthModal } from '../pay/BiometricAuthModal';

interface PayHubProps {
  onNavigate: (route: string) => void;
  onOpenQR: () => void;
  prefilledPhone?: string;
}

export const PayHub: React.FC<PayHubProps> = ({ onNavigate, onOpenQR, prefilledPhone }) => {
  const { contacts, evaluatePayment, confirmPayment, getContactByPhone } = useTransactions();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState(prefilledPhone || '');
  const [amount, setAmount] = useState<string>('500');
  const [note, setNote] = useState('');
  const [paymentType, setPaymentType] = useState<'PHONE' | 'QR' | 'CONTACT'>('PHONE');
  const [isNewRecipient, setIsNewRecipient] = useState<boolean>(false);

  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<RiskEvaluationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Auto detect if recipient phone matches existing contact
  useEffect(() => {
    if (prefilledPhone) {
      setRecipientPhone(prefilledPhone);
    }
  }, [prefilledPhone]);

  useEffect(() => {
    if (recipientPhone.length >= 8) {
      const matched = getContactByPhone(recipientPhone);
      if (matched) {
        setRecipientName(matched.name);
        setIsNewRecipient(matched.isNew);
      } else {
        setIsNewRecipient(true);
      }
    }
  }, [recipientPhone, getContactByPhone]);

  const handleSelectContact = (c: Contact) => {
    setRecipientName(c.name);
    setRecipientPhone(c.phone);
    setIsNewRecipient(c.isNew);
    setPaymentType('CONTACT');
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    const numericAmount = parseFloat(amount);
    if (!recipientName || !numericAmount || numericAmount <= 0) {
      setPayError('Please enter a valid recipient name and payment amount.');
      return;
    }

    setEvaluating(true);
    setEvaluation(null);

    const req: RiskEvaluationRequest = {
      recipientName,
      recipientPhone,
      amount: numericAmount,
      paymentType,
      note,
      isNewRecipient,
    };

    try {
      const result = await evaluatePayment(req);
      setEvaluation(result);
    } catch (err: any) {
      console.error('Error evaluating transaction:', err);
      setPayError(err.message || 'Payment evaluation failed. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleFinalizePayment = async () => {
    if (!evaluation) return;
    setSubmitting(true);
    setPayError(null);

    const numericAmount = parseFloat(amount);
    const req: RiskEvaluationRequest = {
      recipientName,
      recipientPhone,
      amount: numericAmount,
      paymentType,
      note,
      isNewRecipient,
    };

    try {
      const createdTx = await confirmPayment(req, evaluation);
      setSubmitting(false);
      onNavigate(`/activity/${createdTx.id}`);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setPayError(err.message || 'Payment processing failed on server. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {payError && (
        <div className="bg-red-50 border-2 border-red-800 text-red-950 p-4 neo-shadow flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            <span className="text-xs font-bold">{payError}</span>
          </div>
          <button
            onClick={() => setPayError(null)}
            className="text-red-900 font-black text-sm hover:underline cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Title */}
      <div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          Protected Payment Hub
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-black leading-tight uppercase tracking-tighter">
          Send Money Safely
        </h1>
        <p className="text-sm md:text-base font-semibold text-black/70 mt-1">
          Every payment is evaluated in real time against fraud, spoofing, and account takeover patterns.
        </p>
      </div>

      {/* Main Payment Form */}
      <div className="bg-white border-2 border-black p-6 neo-shadow space-y-6">
        <form onSubmit={handleEvaluate} className="space-y-5">
          {/* Quick Preset Amount Chips for Testing */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/70 mb-2">
              Demo Scenarios & Preset Amounts
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAmount('250');
                  setRecipientName('Coffee Shop');
                  setRecipientPhone('+91 98000 11111');
                  setIsNewRecipient(false);
                }}
                className={`px-3 py-1.5 border-2 border-black text-xs font-bold neo-shadow-sm transition-all cursor-pointer ${
                  amount === '250' ? 'bg-[#7C3AED] text-white' : 'bg-[#F5F1E8] text-black hover:bg-white'
                }`}
              >
                ₹250 (Safe Coffee)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAmount('15000');
                  setRecipientName('Ankit Patel');
                  setRecipientPhone('+91 97111 22334');
                  setIsNewRecipient(true);
                }}
                className={`px-3 py-1.5 border-2 border-black text-xs font-bold neo-shadow-sm transition-all cursor-pointer ${
                  amount === '15000' ? 'bg-[#7C3AED] text-white' : 'bg-[#F5F1E8] text-black hover:bg-white'
                }`}
              >
                ₹15,000 (Challenge Test)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAmount('85000');
                  setRecipientName('Unknown Wire');
                  setRecipientPhone('+91 99999 88888');
                  setIsNewRecipient(true);
                }}
                className={`px-3 py-1.5 border-2 border-black text-xs font-bold neo-shadow-sm transition-all cursor-pointer ${
                  amount === '85000' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-950 hover:bg-red-200'
                }`}
              >
                ₹85,000 (Blocked Threat)
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black/70 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('PHONE')}
                className={`p-3 border-2 border-black font-extrabold text-xs flex flex-col items-center gap-1 neo-shadow-sm cursor-pointer ${
                  paymentType === 'PHONE' ? 'bg-[#7C3AED] text-white' : 'bg-white text-black hover:bg-[#F5F1E8]'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Phone / UPI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('QR');
                  onOpenQR();
                }}
                className={`p-3 border-2 border-black font-extrabold text-xs flex flex-col items-center gap-1 neo-shadow-sm cursor-pointer ${
                  paymentType === 'QR' ? 'bg-[#7C3AED] text-white' : 'bg-white text-black hover:bg-[#F5F1E8]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Scan QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('CONTACT')}
                className={`p-3 border-2 border-black font-extrabold text-xs flex flex-col items-center gap-1 neo-shadow-sm cursor-pointer ${
                  paymentType === 'CONTACT' ? 'bg-[#7C3AED] text-white' : 'bg-white text-black hover:bg-[#F5F1E8]'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Saved Contact</span>
              </button>
            </div>
          </div>

          {/* Quick Select Saved Contact */}
          {contacts.length > 0 && (
            <div>
              <span className="text-xs font-bold text-black/60 block mb-1">Select from contacts:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectContact(c)}
                    className="px-3 py-1 bg-white border border-black rounded-full text-xs font-bold whitespace-nowrap hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipient Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Recipient Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Kumar or Store Name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-3 bg-white border-2 border-black rounded-md font-bold text-sm neo-shadow-sm focus:outline-none focus:neo-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Phone Number / VPA *
              </label>
              <input
                type="text"
                required
                placeholder="+91 98765 00000"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full p-3 bg-white border-2 border-black rounded-md font-bold text-sm neo-shadow-sm focus:outline-none focus:neo-shadow"
              />
            </div>
          </div>

          {/* Amount & Note */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-lg text-black">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 bg-white border-2 border-black rounded-md font-black text-lg text-black neo-shadow-sm focus:outline-none focus:neo-shadow"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-black/80 mb-1">
                Payment Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner split, Rent, Utility bill"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 bg-white border-2 border-black rounded-md font-bold text-sm neo-shadow-sm focus:outline-none focus:neo-shadow"
              />
            </div>
          </div>

          {/* Evaluate Action Button & Biometric Indicator */}
          <div className="pt-2 space-y-3">
            <NeoButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={evaluating}
              className="w-full uppercase text-lg"
            >
              {evaluating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Sentinel AI Security Evaluation...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Evaluate & Pay ₹{parseFloat(amount || '0').toLocaleString('en-IN')} →
                </span>
              )}
            </NeoButton>

            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-800 rounded neo-shadow-sm">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-xs font-black uppercase text-purple-950">
                  Camera Biometric Face ID Auth Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBiometricOpen(true)}
                className="text-xs font-black uppercase text-[#7C3AED] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Test Camera Face ID →
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Real-time Risk Assessment Result Modal / Panel */}
      {evaluation && (
        <div className="bg-white border-2 border-black p-6 neo-shadow-xl space-y-5 animate-in slide-in-from-bottom duration-300">
          {/* Header Status */}
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div className="flex items-center gap-3">
              <NeoBadge
                decision={evaluation.decision}
                riskLevel={evaluation.riskLevel}
                safetyScore={evaluation.safetyScore}
              />
              <div>
                <h3 className="font-black text-lg text-black uppercase tracking-tight">
                  {evaluation.userMessage}
                </h3>
                <span className="text-xs font-bold text-black/60">
                  Model Confidence: {evaluation.safetyScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Reasons Breakdown in Plain English */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-black/70 mb-2">
              Why this decision?
            </h4>
            <div className="space-y-2">
              {evaluation.humanReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-[#F5F1E8] border border-black p-2.5 rounded text-xs font-bold text-black">
                  <span className="text-[#7C3AED] shrink-0 font-black">▸</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical ML & Graph Details Toggle */}
          <details className="bg-purple-50 border border-purple-800 p-3 rounded">
            <summary className="font-bold text-xs text-purple-950 cursor-pointer flex items-center justify-between">
              <span>View AI Model & SHAP Technical Details</span>
              <span className="text-[10px] uppercase font-bold text-purple-700">Expand</span>
            </summary>
            <div className="mt-3 pt-3 border-t border-purple-200 text-xs space-y-2 font-mono">
              <p><strong>Model:</strong> {evaluation.technicalDetails.riskFusionModel}</p>
              <p><strong>Random Forest Score:</strong> {evaluation.technicalDetails.rfScore}</p>
              <p><strong>Isolation Forest Anomaly Score:</strong> {evaluation.technicalDetails.ifScore}</p>
              <p><strong>Knowledge Graph Risk:</strong> {evaluation.technicalDetails.graphRisk}</p>
              <div>
                <strong>SHAP Feature Contributions:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {evaluation.technicalDetails.shapFactors.map((sf, i) => (
                    <li key={i}>{sf.factor}: {sf.impact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>

          {/* Action Finalization */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-black">
            {evaluation.decision === 'BLOCK' ? (
              <div className="w-full bg-red-100 border-2 border-red-900 p-4 rounded text-center">
                <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-1" />
                <p className="font-black text-red-950 text-sm">PAYMENT BLOCKED BY SENTINEL</p>
                <p className="text-xs text-red-900 font-bold mt-1">
                  This transaction cannot be completed due to critical threat level.
                </p>
              </div>
            ) : evaluation.decision === 'CHALLENGE' ? (
              <div className="w-full space-y-3">
                <div className="bg-amber-100 border border-amber-900 p-3 rounded text-xs font-bold text-amber-950">
                  ⚠ Verification required. Please confirm you know the recipient personally.
                </div>
                <div className="flex items-center gap-3">
                  <NeoButton
                    variant="secondary"
                    className="flex-1 uppercase"
                    onClick={() => setEvaluation(null)}
                  >
                    Cancel
                  </NeoButton>
                  <NeoButton
                    variant="primary"
                    className="flex-1 uppercase flex items-center justify-center gap-2"
                    disabled={submitting}
                    onClick={() => setIsBiometricOpen(true)}
                  >
                    <Scan className="w-4 h-4" />
                    {submitting ? 'Verifying...' : 'Face ID & Send Money'}
                  </NeoButton>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-[#7C3AED]" />
                  ✓ Verified safe. Authorize with Camera Biometrics.
                </span>
                <NeoButton
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  onClick={() => setIsBiometricOpen(true)}
                  className="uppercase px-6 flex items-center gap-2 w-full sm:w-auto"
                >
                  <Camera className="w-4 h-4" />
                  {submitting ? 'Processing...' : 'Biometric Pay →'}
                </NeoButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Biometric Camera Authentication Screen Modal */}
      <BiometricAuthModal
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onSuccess={() => {
          setIsBiometricOpen(false);
          handleFinalizePayment();
        }}
        amount={parseFloat(amount || '0')}
        recipientName={recipientName || 'Recipient'}
      />
    </div>
  );
};
