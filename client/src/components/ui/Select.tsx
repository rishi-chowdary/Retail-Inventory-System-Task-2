'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-lg bg-slate-900/80 border text-slate-100 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer',
              error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700/80 hover:border-slate-600 focus:border-primary-500',
              className
            )
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
