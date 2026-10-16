'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 shadow-lg shadow-black/20',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
