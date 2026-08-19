import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useMeetingList } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MeetingTimeline } from '../components/timeline/MeetingTimeline';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function TimelinePage() {
  useDocumentTitle('Event Timeline');
  const { user } = useAuth();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [status, setStatus] = useState<string>('all');

  const params = useMemo(() => {
    const p: Record<string, string | number> = { limit: 100 };
    if (status !== 'all') p.status = status;
    return p;
  }, [status]);

  const { meetings, isLoading, error } = useMeetingList(params);

  // Filter client-side when the user wants to see only their own meetings.
  const filtered = useMemo(() => {
    if (scope === 'all') return meetings;
    if (!user) return [];
    return meetings.filter((m) => m.hostId === user.id || m.isJoined);
  }, [meetings, scope, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Timeline</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
          {(['all', 'mine'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                scope === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {value === 'all' ? 'All meetings' : 'My meetings'}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <MeetingTimeline meetings={filtered} isLoading={isLoading} error={error} />
    </div>
  );
}
