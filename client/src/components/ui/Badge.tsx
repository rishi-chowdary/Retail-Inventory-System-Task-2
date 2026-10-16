'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className
}) => {
  const variants = {
    success: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60',
    warning: 'bg-amber-950/70 text-amber-400 border-amber-800/60',
    danger: 'bg-rose-950/70 text-rose-400 border-rose-800/60',
    info: 'bg-indigo-950/70 text-indigo-400 border-indigo-800/60',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60'
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide',
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
