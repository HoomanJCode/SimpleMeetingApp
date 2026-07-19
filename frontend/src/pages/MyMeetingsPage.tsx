import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyMeetings } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MeetingList } from '../components/meeting/MeetingList';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

export default function MyMeetingsPage() {
  useDocumentTitle('My Meetings');
  const [tab, setTab] = useState<'hosting' | 'attending'>('hosting');
  const { hosting, attending, isLoading, error } = useMyMeetings();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const meetings = tab === 'hosting' ? hosting : attending;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Meetings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit transition-colors">
        <button
          onClick={() => setTab('hosting')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'hosting' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Hosting ({hosting.length})
        </button>
        <button
          onClick={() => setTab('attending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'attending' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Attending ({attending.length})
        </button>
      </div>

      {/* Content */}
      {meetings.length === 0 && !isLoading && !error ? (
        <EmptyState
          title={tab === 'hosting' ? 'You are not hosting any meetings' : 'You are not attending any meetings'}
          description="Create or join a meeting to see it here."
          action={
            <Link
              to="/meetings/new"
              className="inline-block bg-primary-600 text-white px-5 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create a Meeting
            </Link>
          }
        />
      ) : (
        <MeetingList
          meetings={meetings}
          isLoading={false}
          error={error}
        />
      )}
    </div>
  );
}
