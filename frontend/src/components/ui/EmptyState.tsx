import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      {icon ? (
        <div className="text-5xl mb-4 text-gray-400 dark:text-gray-500">{icon}</div>
      ) : (
        <div className="text-5xl mb-4">📭</div>
      )}
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</p>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
