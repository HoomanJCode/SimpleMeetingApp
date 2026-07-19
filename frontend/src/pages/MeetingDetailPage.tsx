import { useParams, useNavigate } from 'react-router-dom';
import { MeetingDetail } from '../components/meeting/MeetingDetail';
import { useMeeting, useJoinMeeting, useLeaveMeeting, useDeleteMeeting } from '../hooks/useMeetings';
import { useRealtime } from '../hooks/useRealtime';
import { Spinner } from '../components/ui/Spinner';
import { getMeeting } from '../api/meetings';
import { useAuth } from '../auth/AuthContext';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { meeting, isLoading, error, setMeeting } = useMeeting(id);
  const { join, isLoading: isJoining } = useJoinMeeting();
  const { leave, isLoading: isLeaving } = useLeaveMeeting();
  const { remove, isLoading: isDeleting } = useDeleteMeeting();

  // Real-time updates
  const { connectionState } = useRealtime(id, setMeeting);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (error || !meeting) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-6xl">🔍</p>
        <p className="text-lg text-gray-600">{error || 'Meeting not found'}</p>
      </div>
    );
  }

  const handleJoin = async () => {
    await join(id!);
    const updated = await getMeeting(id!);
    setMeeting(updated);
  };

  const handleLeave = async () => {
    await leave(id!);
    const updated = await getMeeting(id!);
    setMeeting(updated);
  };

  const handleDelete = async () => {
    await remove(id!);
    navigate('/', { replace: true });
  };

  return (
    <MeetingDetail
      meeting={meeting}
      connectionState={connectionState}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onDelete={handleDelete}
      isJoining={isJoining}
      isLeaving={isLeaving}
      isDeleting={isDeleting}
    />
  );
}
