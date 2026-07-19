import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <div className="text-center py-20 space-y-4">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300">Page not found</p>
      <Link to="/" className="inline-block text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
        Back to Home
      </Link>
    </div>
  );
}
