import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge, statusBadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConnectionStatus } from './ConnectionStatus';
import { ParticipantList } from './ParticipantList';
import { useAuth } from '../../auth/AuthContext';
import { useState } from 'react';
import type { MeetingResponse } from '../../types';

interface MeetingDetailProps {
  meeting: MeetingResponse;
  connectionState: 'connected' | 'polling' | 'disconnected';
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  isJoining: boolean;
  isLeaving: boolean;
  isDeleting: boolean;
}

export function MeetingDetail({
  meeting,
  connectionState,
  onJoin,
  onLeave,
  onDelete,
  isJoining,
  isLeaving,
  isDeleting,
}: MeetingDetailProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const date = new Date(meeting.dateTime);
  const spotsLeft = meeting.capacity - (meeting.participantCount ?? 0);
  const isHost = user?.id === meeting.hostId;
  const isJoined = meeting.isJoined;
  const isFull = spotsLeft <= 0;
  const isPast = meeting.status === 'ended' || meeting.status === 'cancelled';

  const statusLabel = meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          {isHost && (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)} isLoading={isDeleting}>
              Delete
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

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Meeting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} isLoading={isDeleting}>Delete</Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300">
          Are you sure you want to delete &quot;{meeting.title}&quot;? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
