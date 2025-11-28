
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'small';
  label: string;
  icon?: React.ReactNode;
  locked?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', label, icon, className, locked, ...props }) => {
  const baseStyles = "relative group font-bold uppercase tracking-wider transition-all duration-200 transform flex items-center justify-center gap-2 overflow-hidden";
  
  const variants = {
    primary: "px-8 py-3 text-sm bg-[#733DF2] hover:bg-[#8e5ef5] text-white shadow-[0_0_20px_rgba(115,61,242,0.5)] active:scale-95",
    secondary: "px-8 py-3 text-sm bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/40 active:scale-95",
    small: "px-3 py-2 text-xs border border-white/10 hover:border-white/50 bg-black/20 text-gray-300 hover:text-white"
  };

  const lockedStyles = "opacity-50 cursor-not-allowed grayscale";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${locked ? lockedStyles : 'hover:scale-105'} ${className || ''}`} 
      disabled={locked}
      {...props}
    >
      {!locked && (
        <div className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:animate-[shimmer_0.5s_infinite] skew-x-12" />
      )}
      
      {locked && (
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      
      {icon && <span className="relative z-10">{icon}</span>}
      <span className="relative z-10">{label}</span>
    </button>
  );
};

export default Button;
