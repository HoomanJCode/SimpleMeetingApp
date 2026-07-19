import { useParams, useNavigate } from 'react-router-dom';
import { MeetingDetail } from '../components/meeting/MeetingDetail';
import { useMeeting, useJoinMeeting, useLeaveMeeting, useDeleteMeeting } from '../hooks/useMeetings';
import { useRealtime } from '../hooks/useRealtime';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import { SkeletonDetail } from '../components/ui/Skeleton';
import { getMeeting } from '../api/meetings';
import { useAuth } from '../auth/AuthContext';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { meeting, isLoading, error, setMeeting } = useMeeting(id);
  const { join, isLoading: isJoining } = useJoinMeeting();
  const { leave, isLoading: isLeaving } = useLeaveMeeting();
  const { remove, isLoading: isDeleting } = useDeleteMeeting();

  useDocumentTitle(meeting?.title || 'Meeting Details');

  // Real-time updates
  const { connectionState } = useRealtime(id, setMeeting);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <SkeletonDetail />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-6xl">🔍</p>
        <p className="text-lg text-gray-600 dark:text-gray-300">{error || 'Meeting not found'}</p>
      </div>
    );
  }

  const handleJoin = async () => {
    try {
      await join(id!);
      const updated = await getMeeting(id!);
      setMeeting(updated);
      toast('You joined the meeting!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to join meeting', 'error');
    }
  };

  const handleLeave = async () => {
    try {
      await leave(id!);
      const updated = await getMeeting(id!);
      setMeeting(updated);
      toast('You left the meeting.', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to leave meeting', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await remove(id!);
      toast('Meeting deleted.', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast(err.message || 'Failed to delete meeting', 'error');
    }
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
