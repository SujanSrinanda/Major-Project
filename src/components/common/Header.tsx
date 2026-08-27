import React, { useState } from 'react';
import { Shield, Bell, Search, User, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { NotificationDrawer } from './NotificationDrawer';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onSearchChange?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, onNavigate, onSearchChange }) => {
  const { user, profile } = useAuth();
  const { alerts } = useTransactions();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#F5F1E8] border-b-2 border-black px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-[#7C3AED] border-2 border-black rounded-lg neo-shadow flex items-center justify-center font-black text-white text-xl group-hover:rotate-6 transition-transform">
              ⚡
            </div>
            <div>
              <span className="text-xl md:text-2xl font-black tracking-tight text-black flex items-center gap-1">
                Sentinel<span className="text-[#7C3AED]">Fin</span>
              </span>
              <span className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-black/60 -mt-1">
                Personal Financial Safety
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50" />
              <input
                type="text"
                placeholder="Search payments, contacts, activities..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigate('/activity');
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border-2 border-black rounded-lg neo-shadow-sm text-sm font-medium focus:outline-none focus:neo-shadow"
              />
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 md:gap-2.5">
            {/* Network Connection Sync Status Badge */}
            <NetworkStatusIndicator />

            {/* Evaluator AI/Admin Insights button */}
            <button
              onClick={() => onNavigate('/insights')}
              title="View Sentinel Intelligence Pipeline"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-lg text-xs font-bold neo-shadow transition-all ${
                currentRoute === '/insights' || currentRoute === '/admin' ? 'bg-[#7C3AED] text-white' : 'bg-purple-100 text-purple-950 hover:bg-purple-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Sentinel Intelligence</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2.5 bg-white border-2 border-black rounded-lg neo-shadow hover:bg-[#F9F7F1] transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-black" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF521B] text-white text-[10px] font-black w-5 h-5 rounded-full border border-black flex items-center justify-center animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Profile Pill */}
            <button
              onClick={() => onNavigate('/profile')}
              className="flex items-center gap-2 p-1.5 md:pr-3 bg-white border-2 border-black rounded-lg neo-shadow hover:bg-[#F9F7F1] transition-all cursor-pointer"
            >
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.fullName || 'User'}
                  className="w-7 h-7 border border-black rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 bg-[#FF521B] border border-black rounded-full flex items-center justify-center text-white font-black text-xs">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : profile?.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden md:block text-xs font-bold text-black max-w-[100px] truncate">
                {user?.fullName || profile?.name || 'User'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification Drawer Component */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
