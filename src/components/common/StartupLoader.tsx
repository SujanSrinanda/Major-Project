import React, { useEffect, useState } from 'react';
import { Shield, Zap, Lock } from 'lucide-react';

interface StartupLoaderProps {
  onComplete?: () => void;
  statusText?: string;
  duration?: number;
}

export const StartupLoader: React.FC<StartupLoaderProps> = ({
  statusText,
}) => {
  const [progress, setProgress] = useState(25);
  const [currentStepText, setCurrentStepText] = useState(
    statusText || 'Initializing Real-Time AI Threat Shield...'
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const next = prev + Math.floor(Math.random() * 15) + 5;
        return Math.min(95, next);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F1E8] flex flex-col items-center justify-center p-6 text-black select-none">
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Animated Brand Emblem */}
        <div className="relative">
          <div className="w-20 h-20 bg-[#7C3AED] text-white border-3 border-black neo-shadow rounded-2xl flex items-center justify-center animate-pulse">
            <Zap className="w-10 h-10 text-yellow-300 fill-yellow-300 transform -rotate-12" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-black text-white p-1.5 rounded-lg border border-black shadow">
            <Shield className="w-4 h-4 text-[#7C3AED]" />
          </div>
        </div>

        {/* Brand Name & Slogan */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black uppercase">
            SENTINEL<span className="text-[#7C3AED]">FIN</span>
          </h1>
          <p className="text-sm font-bold text-black/70 mt-1 tracking-wide">
            Your money. Better protected.
          </p>
        </div>

        {/* Security Progress Card */}
        <div className="w-full bg-white border-2 border-black p-4 neo-shadow-sm flex flex-col items-center space-y-3">
          <div className="w-full bg-[#E5DFD3] border border-black h-3 overflow-hidden p-0.5">
            <div
              className="bg-[#7C3AED] h-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[11px] font-black uppercase tracking-wider text-black">
            <span className="truncate max-w-[240px]">{currentStepText}</span>
            <span className="text-[#7C3AED] shrink-0 ml-2">{progress}%</span>
          </div>
        </div>

        {/* Micro Footer Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-black/60 uppercase tracking-widest">
          <Lock className="w-3 h-3 text-[#7C3AED]" />
          <span>256-Bit Encrypted Financial Environment</span>
        </div>
      </div>
    </div>
  );
};
