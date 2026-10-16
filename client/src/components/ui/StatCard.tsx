'use client';

import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: {
    positive?: boolean;
    text: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend
}) => {
  return (
    <Card className="flex items-start justify-between relative overflow-hidden group hover:border-slate-700 transition-all duration-200">
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</p>
        <p className="text-2xl font-bold text-slate-100 tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        {trend && (
          <p
            className={`text-xs font-medium flex items-center gap-1 ${
              trend.positive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.text}
          </p>
        )}
      </div>
      <div className="p-3 bg-slate-800/80 rounded-xl text-primary-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </Card>
  );
};
