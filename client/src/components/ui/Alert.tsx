'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'error', message, onDismiss }) => {
  const styles = {
    error: 'bg-rose-950/60 border-rose-800 text-rose-300',
    success: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
    info: 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />
  };

  return (
    <div
      className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-sm ${styles[type]}`}
    >
      <div className="flex items-center gap-2.5">
        {icons[type]}
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs underline hover:no-underline opacity-80 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-xs text-slate-400 tracking-wide">{text}</p>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
      <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
        <Info size={24} />
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
