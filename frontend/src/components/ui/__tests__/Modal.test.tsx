import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal isOpen title="Confirm" onClose={() => {}}>Are you sure?</Modal>);
    expect(screen.getByText(/are you sure\?/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} title="Confirm" onClose={() => {}}>Are you sure?</Modal>);
    expect(screen.queryByText(/are you sure\?/i)).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen title="Confirm" onClose={handleClose}>Content</Modal>);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
