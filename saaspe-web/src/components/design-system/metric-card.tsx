'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
    label?: string;
  };
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({ label, value, change, icon: Icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-md p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        {Icon && (
          <Icon className="h-5 w-5 text-slate-400 opacity-60" />
        )}
      </div>
      
      <div className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
        {value}
      </div>
      
      {change && (
        <div
          className={cn(
            'text-xs flex items-center gap-1',
            change.type === 'positive' && 'text-emerald-600',
            change.type === 'negative' && 'text-red-600',
            change.type === 'neutral' && 'text-slate-500'
          )}
        >
          <span>{change.value}</span>
          {change.label && <span>{change.label}</span>}
        </div>
      )}
    </div>
  );
}

