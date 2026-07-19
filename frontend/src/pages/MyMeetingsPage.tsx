import { useState } from 'react';
import { useMyMeetings } from '../hooks/useMeetings';
import { MeetingList } from '../components/meeting/MeetingList';
import { Spinner } from '../components/ui/Spinner';

export default function MyMeetingsPage() {
  const [tab, setTab] = useState<'hosting' | 'attending'>('hosting');
  const { hosting, attending, isLoading, error } = useMyMeetings();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Meetings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('hosting')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'hosting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hosting ({hosting.length})
        </button>
        <button
          onClick={() => setTab('attending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'attending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attending ({attending.length})
        </button>
      </div>

      {/* Content */}
      <MeetingList
        meetings={tab === 'hosting' ? hosting : attending}
        isLoading={false}
        error={error}
      />
    </div>
  );
}
