import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeetingForm } from '../components/meeting/MeetingForm';
import { useCreateMeeting, useUpdateMeeting, useUploadMeetingPhoto } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useToast } from '../components/ui/Toast';
import { NavigationBlocker } from '../components/ui/NavigationBlocker';
import type { CreateMeetingInput } from '../api/meetings';

export function CreateMeetingPage() {
  useDocumentTitle('Create a New Meeting');
  const navigate = useNavigate();
  const { create, isLoading, error } = useCreateMeeting();
  const { update } = useUpdateMeeting();
  const { upload } = useUploadMeetingPhoto();
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const submittedRef = useRef(false); // set to true after successful create; blocks NavigationBlocker

  useBeforeUnload(isDirty);

  const handleSubmit = async (data: CreateMeetingInput & { coverPhotoFile?: File | null; coverPhotoRemoved?: boolean }) => {
    try {
      // Step 1: Split the cover photo metadata from the meeting payload.
      // MeetingForm sends both the meeting fields and the cover photo state.
      const { coverPhotoFile, coverPhotoRemoved, ...meetingData } = data;

      // Step 2: Create the meeting first (without a cover photo URL).
      // We need the meeting to exist before we can upload a file to it.
      const meeting = await create(meetingData);

      // Step 3: If the user selected a cover photo, upload it to the new meeting.
      // The backend returns the public URL of the stored image.
      if (coverPhotoFile) {
        try {
          const photo = await upload(meeting.id, coverPhotoFile);
          // Step 4: Persist the uploaded photo URL as the meeting's coverPhotoUrl.
          await update(meeting.id, { coverPhotoUrl: photo.url });
        } catch (uploadErr: any) {
          // Graceful degradation: the meeting is already created; just warn the user
          // and let them add a cover later from the detail page.
          toast(uploadErr.message || 'Cover photo upload failed', 'error');
        }
      }

      // Step 5: Show success and disable the dirty-form blocker.
      toast('Meeting created successfully!', 'success');
      submittedRef.current = true;
      setIsDirty(false);
      // Step 6: Defer navigation to the next tick.
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
