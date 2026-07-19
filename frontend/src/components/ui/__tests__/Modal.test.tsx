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

  it('has dialog role and is labelled by title', () => {
    render(<Modal isOpen title="Confirm" onClose={() => {}}>Content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen title="Confirm" onClose={handleClose}>Content</Modal>);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen title="Confirm" onClose={handleClose}>Content</Modal>);
    fireEvent.click(screen.getByRole('dialog').previousElementSibling as HTMLElement);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen title="Confirm" onClose={handleClose}>Content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('locks body overflow while open', () => {
    const { unmount } = render(<Modal isOpen title="Confirm" onClose={() => {}}>Content</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
