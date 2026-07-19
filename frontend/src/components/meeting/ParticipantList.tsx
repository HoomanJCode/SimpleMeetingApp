import { Avatar } from '../ui/Avatar';
import type { Participant } from '../../types';

interface ParticipantListProps {
  participants: Participant[];
  hostId: string;
}

export function ParticipantList({ participants, hostId }: ParticipantListProps) {
  const displayCount = 10;
  const hasMore = participants.length > displayCount;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Participants ({participants.length})
      </h4>
      <div className="flex flex-wrap gap-3">
        {participants.slice(0, displayCount).map((p) => (
          <div key={p.id} className="flex items-center gap-2" title={p.joinedAt ? `Joined ${new Date(p.joinedAt).toLocaleDateString()}` : ''}>
            <Avatar name={p.name} src={p.avatarUrl} size="sm" />
            <span className="text-sm text-gray-700">
              {p.name}
              {p.id === hostId && (
                <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                  Host
                </span>
              )}
            </span>
          </div>
        ))}
        {hasMore && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500">+{participants.length - displayCount} more</span>
          </div>
        )}
      </div>
    </div>
  );
}
