import { MeetingForm } from '../components/meeting/MeetingForm';
import { useNavigate } from 'react-router-dom';
import { useCreateMeeting } from '../hooks/useMeetings';
import type { CreateMeetingInput } from '../api/meetings';

export function CreateMeetingPage() {
  const navigate = useNavigate();
  const { create, isLoading, error } = useCreateMeeting();

  const handleSubmit = async (data: CreateMeetingInput) => {
    const meeting = await create(data);
    navigate(`/meetings/${meeting.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Create a New Meeting</h1>
      <MeetingForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </div>
  );
}

export default CreateMeetingPage;
