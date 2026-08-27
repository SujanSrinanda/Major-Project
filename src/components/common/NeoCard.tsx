import React from 'react';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  accentBorder?: boolean;
}

export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  className = '',
  onClick,
  accentBorder = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 border-black rounded-lg p-4 md:p-6 neo-shadow transition-all ${
        accentBorder ? 'border-l-8 border-l-[#FF521B]' : ''
      } ${onClick ? 'cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:neo-shadow-lg active:translate-x-0.5 active:translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
