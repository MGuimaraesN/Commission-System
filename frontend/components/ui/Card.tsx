import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'primary' | 'highlight'; 
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action, variant = 'default' }) => {
  const variantClasses = {
    default: "border-slate-200 dark:border-white/5",
    primary: "border-indigo-500/30 dark:border-indigo-400/30 shadow-[0_0_20px_-12px_rgba(99,102,241,0.3)]",
    highlight: "border-amber-500/30 dark:border-amber-400/30 shadow-[0_0_20px_-12px_rgba(245,158,11,0.2)]",
  };

  return (
    <div className={`
      relative bg-white dark:bg-slate-800/40 dark:backdrop-blur-xl 
      rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col 
      transition-all duration-300 ease-out
      hover:shadow-md dark:hover:shadow-3xl dark:hover:bg-slate-800/50
      ${variantClasses[variant]}
      ${className}
    `}>
      {/* Subtle shine effect at top (Dark mode only) */}
      <div className="hidden dark:block absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
      
      {(title || action) && (
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 flex-1 text-slate-700 dark:text-slate-200 relative">
        {children}
      </div>
    </div>
  );
};