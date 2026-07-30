import { useParams, useNavigate } from 'react-router-dom';
import { MeetingDetail } from '../components/meeting/MeetingDetail';
import { useMeeting, useJoinMeeting, useLeaveMeeting, useCancelMeeting, useUploadMeetingPhoto, useDeleteMeetingPhoto } from '../hooks/useMeetings';
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
  const { meeting, isLoading, error, setMeeting } = useMeeting(id, user?.id);
  const { join, isLoading: isJoining } = useJoinMeeting();
  const { leave, isLoading: isLeaving } = useLeaveMeeting();
  const { cancel, isLoading: isCancelling } = useCancelMeeting();
  const { upload: uploadPhoto, isLoading: isUploadingPhoto } = useUploadMeetingPhoto();
  const { remove: deletePhoto, isLoading: isDeletingPhoto } = useDeleteMeetingPhoto();

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

  const handleCancel = async () => {
    try {
      const cancelled = await cancel(id!);
      setMeeting({ ...cancelled, participants: meeting?.participants ?? [] });
      toast('Meeting cancelled.', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to cancel meeting', 'error');
    }
  };

  const handleUploadPhoto = async (file: File) => {
    try {
      // Step 1: Upload the gallery photo to the backend.
      await uploadPhoto(id!, file);
      // Step 2: Refetch the full meeting to get the updated photo list.
      const updated = await getMeeting(id!);
      setMeeting(updated);
      toast('Photo uploaded.', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload photo', 'error');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Step 1: Delete the gallery photo from the backend.
      await deletePhoto(id!, photoId);
      // Step 2: Refetch the full meeting to reflect the removed photo.
      const updated = await getMeeting(id!);
      setMeeting(updated);
      toast('Photo deleted.', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to delete photo', 'error');
    }
  };

  return (
    <MeetingDetail
      meeting={meeting}
      connectionState={connectionState}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onCancel={handleCancel}
      isJoining={isJoining}
      isLeaving={isLeaving}
      isCancelling={isCancelling}
      isUploading={isUploadingPhoto || isDeletingPhoto}
      onUploadPhoto={handleUploadPhoto}
      onDeletePhoto={handleDeletePhoto}
    />
  );
}
