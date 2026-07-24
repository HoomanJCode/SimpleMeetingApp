import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge, statusBadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConnectionStatus } from './ConnectionStatus';
import { ParticipantList } from './ParticipantList';
import { useAuth } from '../../auth/AuthContext';
import { useRef, useState } from 'react';
import type { MeetingResponse, MeetingPhoto } from '../../types';

interface MeetingDetailProps {
  meeting: MeetingResponse;
  connectionState: 'connected' | 'polling' | 'disconnected';
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onCancel: () => Promise<void>;
  isJoining: boolean;
  isLeaving: boolean;
  isCancelling: boolean;
  isUploading?: boolean;
  onUploadPhoto?: (file: File) => void;
  onDeletePhoto?: (photoId: string) => void;
}

export function MeetingDetail({
  meeting,
  connectionState,
  onJoin,
  onLeave,
  onCancel,
  isJoining,
  isLeaving,
  isCancelling,
  isUploading,
  onUploadPhoto,
  onDeletePhoto,
}: MeetingDetailProps) {
  const { user } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const date = new Date(meeting.dateTime);
  const spotsLeft = meeting.capacity - (meeting.participantCount ?? 0);
  const isHost = user?.id === meeting.hostId;
  const isJoined = meeting.isJoined;
  const isFull = spotsLeft <= 0;
  const isPast = meeting.status === 'ended' || meeting.status === 'cancelled';

  const statusLabel = meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photos = meeting.photos ?? [];

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) onUploadPhoto(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cover photo */}
      {meeting.coverPhotoUrl ? (
        <div className="w-full h-56 sm:h-80 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          <img
            src={meeting.coverPhotoUrl}
            alt={meeting.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-32 sm:h-48 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/30 border border-dashed border-primary-300 dark:border-primary-700 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-primary-400 dark:text-primary-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">No cover photo</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={statusBadgeVariant(meeting.status)}>
              {statusLabel}
            </Badge>
            <ConnectionStatus state={connectionState} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{meeting.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isHost && !isPast && (
            <Link to={`/meetings/${meeting.id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
          )}
          {isHost && !isPast && (
            <Button variant="danger" size="sm" onClick={() => setShowCancelModal(true)} isLoading={isCancelling}>
              Cancel Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Host info */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <Avatar name={meeting.hostName ?? 'Unknown'} src={meeting.hostAvatarUrl} size="md" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hosted by</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.hostName}</p>
        </div>
      </div>

      {/* Meeting info grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-gray-600 dark:text-gray-300">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.location}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Capacity</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all"
                style={{ width: `${((meeting.participantCount ?? 0) / meeting.capacity) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {meeting.participantCount}/{meeting.capacity}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">About this meeting</h3>
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{meeting.description}</p>
      </div>

      {/* Photo gallery */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Photos</h3>
          {isHost && !isPast && onUploadPhoto && (
            <div className="flex items-center gap-2">
              <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add photo
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleGalleryFileChange}
                  className="sr-only"
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-sm">No photos yet.</p>
            {isHost && !isPast && (
              <p className="text-xs mt-1">Upload photos to share moments from this meeting.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo: MeetingPhoto) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {isHost && !isPast && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-gray-900/70 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete photo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join/Leave button */}
      {user && !isHost && !isPast && (
        <div className="flex justify-center">
          {isJoined ? (
            <Button variant="secondary" onClick={onLeave} isLoading={isLeaving}>
              Leave Meeting
            </Button>
          ) : (
            <Button onClick={onJoin} isLoading={isJoining} disabled={isFull}>
              {isFull ? 'Meeting Full' : 'Join Meeting'}
            </Button>
          )}
        </div>
      )}

      {/* Participants */}
      {meeting.participants && meeting.participants.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <ParticipantList participants={meeting.participants} hostId={meeting.hostId} />
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Meeting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Keep Meeting</Button>
            <Button variant="danger" onClick={async () => { await onCancel(); setShowCancelModal(false); }} isLoading={isCancelling}>Cancel Meeting</Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300">
          Are you sure you want to cancel &quot;{meeting.title}&quot;? Participants will be notified and the meeting will remain visible as cancelled.
        </p>
      </Modal>
    </div>
  );
}
