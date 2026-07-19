import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Find & Host Meetups
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
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
          <p className="text-gray-500">Sign in to create and join meetings</p>
        )}
      </div>

      {/* Meeting list placeholder */}
      <div className="text-center text-gray-500 py-8">
        <p>Meeting list will appear here</p>
      </div>
    </div>
  );
}
