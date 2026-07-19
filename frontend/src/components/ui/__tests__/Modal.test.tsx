import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

function renderModal(overrides: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal isOpen title="Confirm" onClose={() => {}} {...overrides}>
      Are you sure?
    </Modal>
  );
}

describe('Modal', () => {
  beforeEach(() => {
    document.body.focus(); // reset activeElement
  });

  it('renders when open', () => {
    renderModal();
    expect(screen.getByText(/are you sure\?/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/are you sure\?/i)).not.toBeInTheDocument();
  });

  it('has dialog role and is labelled by title', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderModal({ onClose: handleClose });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    renderModal({ onClose: handleClose });
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const handleClose = vi.fn();
    renderModal({ onClose: handleClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('locks body overflow while open', () => {
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  describe('focus trap', () => {
    it('sets initial focus on the dialog when opened', () => {
      renderModal();
      expect(document.activeElement).toBe(screen.getByRole('dialog'));
    });

    it('prevents Tab escape when no focusable elements exist', () => {
      const handler = vi.fn();
      render(
        <Modal isOpen title="Confirm" onClose={handler}>
          <p data-testid="text">Just text</p>
        </Modal>
      );
      screen.getByRole('button', { name: /close/i }).remove();

      const dialog = screen.getByRole('dialog');
      dialog.focus();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      // handler calls preventDefault when no focusable elements
      expect(document.activeElement).toBe(dialog);
    });

    it('restores focus to the trigger element on close', () => {
      const trigger = document.createElement('button');
      trigger.id = 'modal-trigger';
      document.body.appendChild(trigger);
      trigger.focus();

      const { rerender } = render(
        <Modal isOpen title="Confirm" onClose={() => {}}>
          Content
        </Modal>
      );

      rerender(
        <Modal isOpen={false} title="Confirm" onClose={() => {}}>
          Content
        </Modal>
      );

      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it('wraps focus forward on Tab', () => {
      render(
        <Modal isOpen title="Confirm" onClose={() => {}}>
          <button data-testid="child">Child</button>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      const childButton = screen.getByTestId('child');

      // Spy on focus AFTER the initial focus setup (dialog gets focus on open)
      const closeFocusSpy = vi.spyOn(closeButton, 'focus');
      const childFocusSpy = vi.spyOn(childButton, 'focus');

      // Manually focus the last element (childButton)
      childButton.focus();
      childFocusSpy.mockClear();
      closeFocusSpy.mockClear();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      // Handler should wrap to first element (closeButton)
      expect(closeFocusSpy).toHaveBeenCalledTimes(1);
    });

    it('wraps focus backward on Shift+Tab', () => {
      render(
        <Modal isOpen title="Confirm" onClose={() => {}}>
          <button data-testid="child">Child</button>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      const childButton = screen.getByTestId('child');

      const closeFocusSpy = vi.spyOn(closeButton, 'focus');
      const childFocusSpy = vi.spyOn(childButton, 'focus');

      // Manually focus the first element (closeButton)
      closeButton.focus();
      childFocusSpy.mockClear();
      closeFocusSpy.mockClear();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

      // Handler should wrap to last element (childButton)
      expect(childFocusSpy).toHaveBeenCalledTimes(1);
    });

    it('cycles focus within a single focusable element', () => {
      renderModal();
      const closeButton = screen.getByRole('button', { name: /close/i });

      const closeFocusSpy = vi.spyOn(closeButton, 'focus');

      closeButton.focus();
      closeFocusSpy.mockClear();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(closeFocusSpy).toHaveBeenCalledTimes(1);
    });
  });
});
