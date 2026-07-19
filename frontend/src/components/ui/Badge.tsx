import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

export function statusBadgeVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'upcoming': return 'info';
    case 'ongoing': return 'success';
    case 'ended': return 'neutral';
    case 'cancelled': return 'error';
    default: return 'neutral';
  }
}
