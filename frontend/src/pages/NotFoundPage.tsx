import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20 space-y-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-lg text-gray-600">Page not found</p>
      <Link to="/" className="inline-block text-primary-600 hover:text-primary-700 font-medium">
        Back to Home
      </Link>
    </div>
  );
}
