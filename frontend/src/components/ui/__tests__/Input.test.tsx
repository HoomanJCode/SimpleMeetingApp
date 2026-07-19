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
});
