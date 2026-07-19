import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

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

  const baseClasses =
    'w-full border rounded-lg px-4 py-2.5 transition outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const errorClasses = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300';

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      {as === 'textarea' ? (
        <textarea
          className={`${baseClasses} ${errorClasses} resize-y ${className}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={`${baseClasses} ${errorClasses} ${className}`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-gray-500">{helperText}</p>}
    </div>
  );
}
