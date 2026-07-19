import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MeetingForm } from '../components/meeting/MeetingForm';
import { useMeeting, useUpdateMeeting, useDeleteMeeting } from '../hooks/useMeetings';
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
  const { remove, isLoading: isDeleting } = useDeleteMeeting();
  const { toast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

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
      navigate(`/meetings/${id}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to update meeting';
      setError(msg);
      toast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await remove(id!);
      toast('Meeting deleted successfully!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast(err.message || 'Failed to delete meeting', 'error');
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
        <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
          Delete Meeting
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

      <NavigationBlocker when={isDirty} />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Meeting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300">Are you sure you want to delete this meeting? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
