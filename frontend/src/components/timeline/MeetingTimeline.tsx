import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, statusBadgeVariant } from '../ui/Badge';
import { TagChip } from '../ui/TagChip';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import type { Meeting } from '../../types';

interface MeetingTimelineProps {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
}

type TimelineItem =
  | { type: 'month'; key: string; label: string }
  | { type: 'today'; key: string }
  | { type: 'meeting'; key: string; meeting: Meeting };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MeetingTimeline({ meetings, isLoading, error }: MeetingTimelineProps) {
  const items = useMemo<TimelineItem[]>(() => {
    const sorted = [...meetings].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
    const now = new Date();
    const result: TimelineItem[] = [];
    let lastMonthKey = '';
    let todayInserted = false;

    for (const meeting of sorted) {
      const date = new Date(meeting.dateTime);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      // Insert a month milestone when the month changes.
      if (monthKey !== lastMonthKey) {
        result.push({ type: 'month', key: `month-${monthKey}`, label: monthLabel(date) });
        lastMonthKey = monthKey;
      }

      // Insert the "You are here" marker before the first meeting on/after now.
      if (!todayInserted && now <= date) {
        result.push({ type: 'today', key: 'today' });
        todayInserted = true;
      }

      result.push({ type: 'meeting', key: meeting.id, meeting });
    }

    // If every meeting is in the past, the today marker goes at the end.
    if (!todayInserted) {
      result.push({ type: 'today', key: 'today' });
    }

    return result;
  }, [meetings]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No meetings to show"
        description="There are no meetings matching your current filters."
      />
    );
  }

  return (
    <div>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.key} className="flex gap-4">
            {/* Rail: dot + connecting line */}
            <div className="flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 mt-1 shrink-0 ${dotColor(item)}`} />
              {!isLast && <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 min-h-8" />}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${item.type === 'meeting' ? 'pb-6' : 'pb-6'}`}>
              {item.type === 'month' && (
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 pt-0.5">{item.label}</h3>
              )}

              {item.type === 'today' && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                    Today
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}

              {item.type === 'meeting' && <MeetingCard item={item.meeting} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dotColor(item: TimelineItem): string {
  switch (item.type) {
    case 'month':
      return 'bg-primary-600';
    case 'today':
      return 'bg-amber-500';
    case 'meeting':
      switch (item.meeting.status) {
        case 'upcoming': return 'bg-primary-500';
        case 'ongoing': return 'bg-green-500';
        case 'ended': return 'bg-gray-400';
        case 'cancelled': return 'bg-red-400';
        default: return 'bg-gray-400';
      }
  }
}

function MeetingCard({ item: meeting }: { item: Meeting }) {
  const date = new Date(meeting.dateTime);

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant={statusBadgeVariant(meeting.status)}>
              {capitalize(meeting.status)}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
            {meeting.title}
          </h4>

          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mt-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{meeting.location}</span>
          </div>

          {meeting.tags && meeting.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meeting.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {meeting.participantCount ?? 0}/{meeting.capacity}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">spots</p>
        </div>
      </div>
    </Link>
  );
}
