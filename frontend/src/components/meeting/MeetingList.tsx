import { useState, useEffect, useCallback } from 'react';
import { MeetingCard } from './MeetingCard';
import { Spinner } from '../ui/Spinner';
import type { Meeting } from '../../types';

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
}

export function MeetingList({
  meetings,
  isLoading,
  error,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  onSearch,
}: MeetingListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      {onSearch && (
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && meetings.length === 0 && (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-gray-500 text-lg mb-1">No meetings found</p>
          <p className="text-gray-400 text-sm">Try adjusting your search or create a new meeting</p>
        </div>
      )}

      {/* Meeting grid */}
      {!isLoading && meetings.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 px-3">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
