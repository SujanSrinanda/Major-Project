import React, { useState } from 'react';
import { UserPlus, Search, UserCheck, ShieldCheck, AlertCircle, PhoneCall, Send, AlertTriangle, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { Contact } from '../../types';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface ContactsProps {
  onNavigate: (route: string) => void;
}

export const Contacts: React.FC<ContactsProps> = ({ onNavigate }) => {
  const {
    contacts,
    addContact,
    deleteContact,
    toggleFavoriteContact,
    loading,
    error,
    refreshData,
  } = useTransactions();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVpa, setNewVpa] = useState('');

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setAddError('');
      await addContact({
        name: newName,
        phone: newPhone,
        email: newVpa || undefined,
        isFavorite: false,
        isNew: true,
      });

      setNewName('');
      setNewPhone('');
      setNewVpa('');
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your contacts?`)) return;
    try {
      setDeletingId(id);
      await deleteContact(id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete contact.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Error notification banner if API loading fails */}
      {error && (
        <div className="bg-red-50 border-2 border-red-800 text-red-950 p-4 neo-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            <span className="text-xs font-bold">{error}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white border border-black rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
            Verified Directory
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-black leading-tight uppercase tracking-tighter">
            Frequent Contacts
          </h1>
          <p className="text-sm font-semibold text-black/70 mt-1">
            Manage your verified payment recipients and trust indicators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof window !== 'undefined' && 'contacts' in navigator && (
            <NeoButton
              variant="secondary"
              onClick={async () => {
                try {
                  if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
                    const selected = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true });
                    if (selected && selected.length > 0) {
                      for (const s of selected) {
                        if (s.name?.[0] && s.tel?.[0]) {
                          addContact({
                            name: s.name[0],
                            phone: s.tel[0],
                            email: s.email?.[0] || undefined,
                            isFavorite: false,
                            isNew: true,
                          });
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Contact picker error or cancellation
                }
              }}
              className="uppercase shrink-0"
            >
              Import Browser Contacts
            </NeoButton>
          )}

          <NeoButton
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="uppercase shrink-0"
          >
            + Add New Contact
          </NeoButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-2 border-black p-4 neo-shadow flex items-center gap-3">
        <Search className="w-5 h-5 text-black/50 shrink-0" />
        <input
          type="text"
          placeholder="Search contacts by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-bold text-sm focus:outline-none"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border-2 border-black p-5 neo-shadow animate-pulse h-36" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white border-2 border-black p-10 text-center neo-shadow space-y-3">
          <p className="font-bold text-black text-base">No contacts saved yet in your verified directory.</p>
          <p className="text-xs text-black/60 font-semibold max-w-sm mx-auto">
            Adding verified recipients speeds up payments and configures automated trust indicators.
          </p>
          <NeoButton
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="uppercase"
          >
            + Add First Contact
          </NeoButton>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-black p-8 text-center neo-shadow">
          <p className="font-bold text-black/60 text-sm">No contacts found matching "{search}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white border-2 border-black p-5 neo-shadow hover:neo-shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#7C3AED] text-white border-2 border-black font-black text-xl flex items-center justify-center shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-black">{c.name}</h3>
                    <p className="text-xs text-black/60 font-semibold">{c.phone}</p>
                    {c.email && (
                      <p className="text-[11px] text-[#7C3AED] font-bold mt-0.5 truncate max-w-[140px]">{c.email}</p>
                    )}
                  </div>
                </div>

                {c.isNew ? (
                  <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-800 px-2 py-0.5 rounded">
                    NEW RECIPIENT
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-800 px-2 py-0.5 rounded">
                    TRUSTED
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFavoriteContact(c.id)}
                    className={`p-1 border rounded transition-colors ${
                      c.isFavorite
                        ? 'bg-amber-100 border-amber-600 text-amber-700'
                        : 'bg-gray-100 border-black text-gray-500 hover:text-black'
                    }`}
                    title={c.isFavorite ? 'Unfavorite contact' : 'Favorite contact'}
                  >
                    <Star className={`w-3.5 h-3.5 ${c.isFavorite ? 'fill-amber-500' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    className="p-1 border border-black rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    title="Delete contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <NeoButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate(`/pay?phone=${encodeURIComponent(c.phone)}`)}
                  className="uppercase"
                >
                  Pay Now →
                </NeoButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black p-6 neo-shadow-xl max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-black text-lg text-black uppercase">Add Payment Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="font-black text-black hover:text-[#7C3AED] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-100 border-2 border-red-800 text-red-900 text-xs font-bold">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-black/80 mb-1">
                  Contact Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={newName}
                  disabled={isSubmitting}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-black rounded font-bold text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black/80 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98123 45678"
                  value={newPhone}
                  disabled={isSubmitting}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-black rounded font-bold text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black/80 mb-1">
                  Email / UPI ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. vikram@upi or vikram@gmail.com"
                  value={newVpa}
                  disabled={isSubmitting}
                  onChange={(e) => setNewVpa(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-black rounded font-bold text-sm disabled:opacity-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t-2 border-black">
                <NeoButton
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </NeoButton>
                <NeoButton type="submit" variant="primary" disabled={isSubmitting} className="uppercase">
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </NeoButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
