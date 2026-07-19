import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMeetingList } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MeetingList } from '../components/meeting/MeetingList';

export function HomePage() {
  useDocumentTitle('Find & Host Tech Meetups');
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { meetings, pagination, isLoading, error } = useMeetingList({ page, search });

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-12 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl -mx-4 px-4 transition-colors">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Find & Host Tech Meetups
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Discover tech meetups, workshops, and networking events near you.
          Or create your own and bring the community together.
        </p>
        {user ? (
          <Link
            to="/meetings/new"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium text-lg"
          >
            Create a Meeting
          </Link>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Sign in to create and join meetings</p>
        )}
      </div>

      {/* Meeting list */}
      <MeetingList
        meetings={meetings}
        isLoading={isLoading}
        error={error}
        totalPages={pagination?.totalPages ?? 1}
        currentPage={pagination?.page ?? 1}
        onPageChange={setPage}
        onSearch={handleSearch}
      />
    </div>
  );
}
