import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Meeting } from '../../types';

interface MeetingCalendarProps {
  year: number;
  month: number; // 0-based month (0 = January)
  meetings: Meeting[];
  onMonthChange: (year: number, month: number) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MeetingCalendar({ year, month, meetings, onMonthChange }: MeetingCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const { daysInMonth, startOffset } = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDayOfMonth.getDate(),
      startOffset: firstDayOfMonth.getDay(),
    };
  }, [year, month]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    meetings.forEach((meeting) => {
      const date = new Date(meeting.dateTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const list = map.get(key) ?? [];
      list.push(meeting);
      map.set(key, list);
    });
    return map;
  }, [meetings]);

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const handlePreviousMonth = () => {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  };

  const handleNextMonth = () => {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  };

  const weekCount = Math.ceil((startOffset + daysInMonth) / 7);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the start of the month */}
        {Array.from({ length: startOffset }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="min-h-[100px] sm:min-h-[120px] bg-gray-50/50 dark:bg-gray-800/30 rounded-lg"
            aria-hidden="true"
          />
        ))}

        {/* Actual days */}
        {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
          const day = dayIndex + 1;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayMeetings = meetingsByDay.get(dateKey) ?? [];
          const todayHighlight = isToday(day);

          return (
            <div
              key={dateKey}
              className={`min-h-[100px] sm:min-h-[120px] p-2 rounded-lg border transition-colors ${
                todayHighlight
                  ? 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    todayHighlight
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </span>
              </div>

              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((meeting) => (
                  <Link
                    key={meeting.id}
                    to={`/meetings/${meeting.id}`}
                    className="block text-xs px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-900/50 truncate transition-colors"
                    title={meeting.title}
                  >
                    <span className="font-medium">
                      {new Date(meeting.dateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>{' '}
                    {meeting.title}
                  </Link>
                ))}
                {dayMeetings.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    +{dayMeetings.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty cells to complete the last week */}
        {Array.from({ length: weekCount * 7 - (startOffset + daysInMonth) }).map((_, index) => (
          <div
            key={`trailing-${index}`}
            className="min-h-[100px] sm:min-h-[120px] bg-gray-50/50 dark:bg-gray-800/30 rounded-lg"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
