import { useState, useEffect, FormEvent } from 'react';
import type { CreateMeetingInput } from '../../api/meetings';

interface MeetingFormProps {
  onSubmit: (data: CreateMeetingInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  initialData?: CreateMeetingInput;
  submitLabel?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function MeetingForm({
  onSubmit,
  isLoading,
  error,
  initialData,
  submitLabel = 'Create Meeting',
  onDirtyChange,
}: MeetingFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dateTime, setDateTime] = useState(initialData?.dateTime || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [capacity, setCapacity] = useState(initialData?.capacity || 10);

  const isDirty =
    title !== (initialData?.title || '') ||
    description !== (initialData?.description || '') ||
    dateTime !== (initialData?.dateTime || '') ||
    location !== (initialData?.location || '') ||
    capacity !== (initialData?.capacity || 10);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description, dateTime, location, capacity });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Title *</label>
        <input
          id="meeting-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          placeholder="React Meetup July"
        />
      </div>

      <div>
        <label htmlFor="meeting-description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description *</label>
        <textarea
          id="meeting-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-y"
          placeholder="Tell attendees what this meeting is about..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="meeting-datetime" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Date & Time *</label>
          <input
            id="meeting-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="meeting-capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Capacity *</label>
          <input
            id="meeting-capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 2)}
            required
            max={10000}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>
      </div>

      <div>
        <label htmlFor="meeting-location" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Location *</label>
        <input
          id="meeting-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          minLength={2}
          maxLength={300}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          placeholder="Tehran Coworking Hub"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
