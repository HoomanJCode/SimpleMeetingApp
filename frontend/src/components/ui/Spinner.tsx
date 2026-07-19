interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 ${sizeClasses[size]}`}
    />
  );
}
