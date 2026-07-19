import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge, statusBadgeVariant } from '../ui/Badge';
import type { Meeting } from '../../types';

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const date = new Date(meeting.dateTime);
  const spotsLeft = meeting.capacity - (meeting.participantCount ?? 0);

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <Badge variant={statusBadgeVariant(meeting.status)}>
          {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
        </Badge>
        <span className="text-xs text-gray-500">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
        {meeting.title}
      </h3>

      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{meeting.location}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-4">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Avatar name={meeting.hostName ?? 'Unknown'} src={meeting.hostAvatarUrl} size="sm" />
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{meeting.hostName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={spotsLeft <= 3 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
            {meeting.participantCount}/{meeting.capacity}
          </span>
        </div>
      </div>
    </Link>
  );
}
