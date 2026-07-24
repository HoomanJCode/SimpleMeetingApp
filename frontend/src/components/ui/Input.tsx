import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

type InputFieldProps = BaseInputProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaFieldProps = BaseInputProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type FieldProps = InputFieldProps | TextareaFieldProps;

export function Input(props: FieldProps) {
  const { label, error, helperText, as, className = '', ...rest } = props;
  const id = useId();
  const errorId = useId();
  const helperId = useId();

  const baseClasses =
    'w-full border rounded-lg px-4 py-2.5 transition outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100';
  const errorClasses = error
    ? 'border-red-300 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 dark:border-gray-600';

  const describedBy = [error && errorId, helperText && !error && helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      {as === 'textarea' ? (
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${baseClasses} ${errorClasses} resize-y ${className}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${baseClasses} ${errorClasses} ${className}`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p id={errorId} className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}
