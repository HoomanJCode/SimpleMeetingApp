import { useState, FormEvent } from 'react';
import type { CreateMeetingInput } from '../../api/meetings';

interface MeetingFormProps {
  onSubmit: (data: CreateMeetingInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  initialData?: CreateMeetingInput;
}

export function MeetingForm({ onSubmit, isLoading, error, initialData }: MeetingFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dateTime, setDateTime] = useState(initialData?.dateTime || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [capacity, setCapacity] = useState(initialData?.capacity || 10);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description, dateTime, location, capacity });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          placeholder="React Meetup July"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-y"
          placeholder="Tell attendees what this meeting is about..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 2)}
            required
            min={2}
            max={10000}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          minLength={2}
          maxLength={300}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          placeholder="Tehran Coworking Hub"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? 'Creating...' : 'Create Meeting'}
        </button>
      </div>
    </form>
  );
}
