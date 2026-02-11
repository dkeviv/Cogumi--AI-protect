import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 
  | 'critical'
  | 'high' 
  | 'medium'
  | 'low'
  | 'info'
  | 'running'
  | 'completed'
  | 'failed'
  | 'queued'
  | 'canceled'
  | 'stopped'
  | 'sandbox'
  | 'staging'
  | 'production'
  | 'default';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  // Severity
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200',
  
  // Status
  running: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  queued: 'bg-amber-100 text-amber-800 border-amber-200',
  canceled: 'bg-gray-100 text-gray-800 border-gray-200',
  stopped: 'bg-orange-100 text-orange-800 border-orange-200',
  
  // Environment
  sandbox: 'bg-blue-100 text-blue-800 border-blue-200',
  staging: 'bg-amber-100 text-amber-800 border-amber-200',
  production: 'bg-red-100 text-red-900 border-red-200',
  
  // Default
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function Badge({ variant = 'default', children, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
