import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeetingForm } from '../components/meeting/MeetingForm';
import { useCreateMeeting } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useToast } from '../components/ui/Toast';
import { NavigationBlocker } from '../components/ui/NavigationBlocker';
import type { CreateMeetingInput } from '../api/meetings';

export function CreateMeetingPage() {
  useDocumentTitle('Create a New Meeting');
  const navigate = useNavigate();
  const { create, isLoading, error } = useCreateMeeting();
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);

  useBeforeUnload(isDirty);

  const handleSubmit = async (data: CreateMeetingInput) => {
    try {
      const meeting = await create(data);
      toast('Meeting created successfully!', 'success');
      navigate(`/meetings/${meeting.id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to create meeting', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create a New Meeting</h1>
      <MeetingForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        onDirtyChange={setIsDirty}
      />
      <NavigationBlocker when={isDirty} />
    </div>
  );
}

export default CreateMeetingPage;
