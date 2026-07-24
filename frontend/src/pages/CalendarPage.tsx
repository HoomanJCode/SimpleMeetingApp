import { useState, useMemo, useCallback } from 'react';
import { useMeetingList } from '../hooks/useMeetings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MeetingCalendar } from '../components/calendar/MeetingCalendar';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

export default function CalendarPage() {
  useDocumentTitle('Meeting Calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute the first and last moments of the displayed month (inclusive buffer for neighboring days).
  const { fromDate, toDate } = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
      fromDate: start.toISOString(),
      toDate: end.toISOString(),
    };
  }, [year, month]);

  const params = useMemo(
    () => ({ fromDate, toDate, limit: 100 }),
    [fromDate, toDate]
  );

  const { meetings, pagination, isLoading, error } = useMeetingList(params);

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Meeting Calendar</h1>
        <button
          type="button"
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
        >
          Today
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {pagination && pagination.total > 100 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg text-sm">
          Showing the first 100 of {pagination.total} meetings this month. Use the list view to see all meetings.
        </div>
      )}

      {isLoading && !meetings.length ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : meetings.length === 0 && !isLoading ? (
        <EmptyState
          title="No meetings this month"
          description="There are no scheduled meetings for the selected month."
        />
      ) : (
        <MeetingCalendar
          year={year}
          month={month}
          meetings={meetings}
          onMonthChange={handleMonthChange}
        />
      )}
    </div>
  );
}
