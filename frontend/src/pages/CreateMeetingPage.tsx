import { useState, useRef } from 'react';
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
  const submittedRef = useRef(false); // set to true after successful create; blocks NavigationBlocker

  useBeforeUnload(isDirty);

  const handleSubmit = async (data: CreateMeetingInput) => {
    try {
      const meeting = await create(data);
      toast('Meeting created successfully!', 'success');
      submittedRef.current = true;
      setIsDirty(false);
      // Defer navigation to next tick so React processes state update + useBlocker effect first.
      // navigate() is synchronous and checks blockers immediately — before React re-renders
      // the NavigationBlocker with when=false. setTimeout(0) pushes navigation to the event
      // loop queue, giving React a chance to unmount/disarm the blocker.
      setTimeout(() => navigate(`/meetings/${meeting.id}`), 0);
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
      <NavigationBlocker when={isDirty && !submittedRef.current} />
    </div>
  );
}

export default CreateMeetingPage;
