import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Modal } from './Modal';
import { Button } from './Button';

interface NavigationBlockerProps {
  when: boolean;
  message?: string;
}

export function NavigationBlocker({ when, message }: NavigationBlockerProps) {
  const [open, setOpen] = useState(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return when && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setOpen(true);
    }
  }, [blocker]);

  const handleConfirm = () => {
    setOpen(false);
    blocker.proceed?.();
  };

  const handleCancel = () => {
    setOpen(false);
    blocker.reset?.();
  };

  if (!when) return null;

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      title="Unsaved Changes"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel}>
            Stay
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Leave
          </Button>
        </>
      }
    >
      <p className="text-gray-600 dark:text-gray-300">
        {message ?? 'You have unsaved changes. Are you sure you want to leave this page?'}
      </p>
    </Modal>
  );
}
