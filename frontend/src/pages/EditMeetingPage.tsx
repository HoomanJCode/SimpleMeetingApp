import { useParams, useNavigate } from 'react-router-dom';
import { MeetingForm } from '../components/meeting/MeetingForm';
import { useMeeting, useUpdateMeeting, useDeleteMeeting } from '../hooks/useMeetings';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useState } from 'react';
import type { CreateMeetingInput } from '../api/meetings';

export default function EditMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { meeting, isLoading, error: loadError } = useMeeting(id);
  const { update, isLoading: isSaving } = useUpdateMeeting();
  const { remove, isLoading: isDeleting } = useDeleteMeeting();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (loadError || !meeting) {
    return <div className="text-center py-20 text-gray-600">Meeting not found</div>;
  }

  const handleSubmit = async (data: CreateMeetingInput) => {
    setError(null);
    try {
      await update(id!, data);
      navigate(`/meetings/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting');
    }
  };

  const handleDelete = async () => {
    await remove(id!);
    navigate('/', { replace: true });
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Meeting</h1>
        <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
          Delete Meeting
        </Button>
      </div>

      <MeetingForm onSubmit={handleSubmit} isLoading={isSaving} error={error} initialData={initialData} />

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
        <p className="text-gray-600">Are you sure you want to delete this meeting? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
