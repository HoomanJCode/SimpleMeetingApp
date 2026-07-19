import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables click', () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders all variants with expected classes', () => {
    const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
    const expectedClasses: Record<typeof variants[number], string> = {
      primary: 'bg-primary-600',
      secondary: 'bg-white',
      danger: 'bg-red-600',
      ghost: 'bg-transparent',
    };
    variants.forEach((variant) => {
      const { container } = render(<Button variant={variant}>{variant}</Button>);
      expect(container.firstChild).toHaveClass(expectedClasses[variant]);
    });
  });

  it('renders all sizes with expected classes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const expectedClasses: Record<typeof sizes[number], string> = {
      sm: 'px-3',
      md: 'px-4',
      lg: 'px-6',
    };
    sizes.forEach((size) => {
      const { container } = render(<Button size={size}>{size}</Button>);
      expect(container.firstChild).toHaveClass(expectedClasses[size]);
    });
  });

  it('shows spinner and aria-busy when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
