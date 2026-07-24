import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MeetingForm } from '../components/meeting/MeetingForm';
import { useMeeting, useUpdateMeeting, useCancelMeeting } from '../hooks/useMeetings';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useToast } from '../components/ui/Toast';
import { NavigationBlocker } from '../components/ui/NavigationBlocker';
import type { CreateMeetingInput } from '../api/meetings';

export default function EditMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { meeting, isLoading, error: loadError } = useMeeting(id);
  const { update, isLoading: isSaving } = useUpdateMeeting();
  const { cancel, isLoading: isCancelling } = useCancelMeeting();
  const { toast } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const submittedRef = useRef(false);

  useBeforeUnload(isDirty);
  useDocumentTitle(meeting ? `Edit ${meeting.title}` : 'Edit Meeting');

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (loadError || !meeting) {
    return <div className="text-center py-20 text-gray-600 dark:text-gray-300">Meeting not found</div>;
  }

  const handleSubmit = async (data: CreateMeetingInput) => {
    setError(null);
    try {
      await update(id!, data);
      toast('Meeting updated successfully!', 'success');
      submittedRef.current = true;
      setIsDirty(false);
      setTimeout(() => navigate(`/meetings/${id}`), 0);
    } catch (err: any) {
      const msg = err.message || 'Failed to update meeting';
      setError(msg);
      toast(msg, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await cancel(id!);
      toast('Meeting cancelled.', 'info');
      navigate(`/meetings/${id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to cancel meeting', 'error');
    }
  };

  const initialData: CreateMeetingInput = {
    title: meeting.title,
    description: meeting.description,
    dateTime: meeting.dateTime.slice(0, 16),
    location: meeting.location,
    capacity: meeting.capacity,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Meeting</h1>
        <Button variant="danger" size="sm" onClick={() => setShowCancelModal(true)}>
          Cancel Meeting
        </Button>
      </div>

      <MeetingForm
        onSubmit={handleSubmit}
        isLoading={isSaving}
        error={error}
        initialData={initialData}
        submitLabel="Save Changes"
        onDirtyChange={setIsDirty}
      />

      <NavigationBlocker when={isDirty && !submittedRef.current} />

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Meeting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Keep Meeting</Button>
            <Button variant="danger" onClick={handleCancel} isLoading={isCancelling}>Cancel Meeting</Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300">Are you sure you want to cancel this meeting? Participants will be notified.</p>
      </Modal>
    </div>
  );
}
