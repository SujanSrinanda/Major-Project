import React from 'react';
import { Home, Send, History, ShieldCheck, User } from 'lucide-react';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onNavigate }) => {
  const navItems = [
    { label: 'Home', route: '/', icon: Home },
    { label: 'Pay', route: '/pay', icon: Send, isPrimary: true },
    { label: 'Activity', route: '/activity', icon: History },
    { label: 'Safety', route: '/safety', icon: ShieldCheck },
    { label: 'Profile', route: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5F1E8] border-t-2 border-black px-4 py-2 md:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route || (item.route !== '/' && currentRoute.startsWith(item.route));

          if (item.isPrimary) {
            return (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-center justify-center -mt-6 cursor-pointer"
              >
                <div className="w-14 h-14 bg-[#7C3AED] border-2 border-black rounded-full neo-shadow flex items-center justify-center text-white active:translate-y-1 transition-transform">
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black mt-1 text-black">PAY</span>
              </button>
            );
          }

          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-[#7C3AED] font-black' : 'text-black/70 hover:text-black font-semibold'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
