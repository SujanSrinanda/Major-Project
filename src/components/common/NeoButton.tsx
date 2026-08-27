import React from 'react';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  let baseStyle = 'inline-flex items-center justify-center font-bold border-2 border-black rounded-md transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  let variantStyle = '';
  if (variant === 'primary') {
    variantStyle = 'bg-[#7C3AED] text-white neo-shadow hover:bg-[#6D28D9]';
  } else if (variant === 'secondary') {
    variantStyle = 'bg-white text-black neo-shadow hover:bg-[#F5F1E8]';
  } else if (variant === 'danger') {
    variantStyle = 'bg-[#EF4444] text-white neo-shadow hover:bg-[#DC2626]';
  } else if (variant === 'ghost') {
    variantStyle = 'bg-transparent border-transparent hover:bg-black/5 text-black';
  }

  let sizeStyle = '';
  if (size === 'sm') {
    sizeStyle = 'px-3 py-1.5 text-xs tracking-wide';
  } else if (size === 'md') {
    sizeStyle = 'px-5 py-2.5 text-sm md:text-base';
  } else if (size === 'lg') {
    sizeStyle = 'px-7 py-3.5 text-base md:text-lg font-extrabold';
  }

  return (
    <button
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
