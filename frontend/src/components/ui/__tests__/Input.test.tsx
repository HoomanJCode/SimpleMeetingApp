import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('handles user input', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: 'Alice' } });
    expect(input).toHaveValue('Alice');
  });

  it('renders textarea when as="textarea"', () => {
    render(<Input label="Description" as="textarea" />);
    expect(screen.getByLabelText(/description/i)).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('associates error and helper text via aria-describedby', () => {
    const { rerender } = render(<Input label="Email" helperText="We will never share your email" />);
    let input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-describedby');

    rerender(<Input label="Email" error="Invalid email" />);
    input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });
});
