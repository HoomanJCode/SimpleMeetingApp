import { useState, useEffect, FormEvent, useRef } from 'react';
import type { CreateMeetingInput } from '../../api/meetings';

export interface MeetingFormSubmitData extends CreateMeetingInput {
  coverPhotoFile?: File | null;
  coverPhotoRemoved?: boolean;
}

interface MeetingFormProps {
  onSubmit: (data: MeetingFormSubmitData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  initialData?: CreateMeetingInput;
  submitLabel?: string;
  onDirtyChange?: (dirty: boolean) => void;
  coverPhotoUrl?: string | null;
}

export function MeetingForm({
  onSubmit,
  isLoading,
  error,
  initialData,
  submitLabel = 'Create Meeting',
  onDirtyChange,
  coverPhotoUrl,
}: MeetingFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dateTime, setDateTime] = useState(initialData?.dateTime || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [capacity, setCapacity] = useState(initialData?.capacity || 10);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Step 1: Create (and revoke) a temporary object URL for the selected cover file.
  // This keeps memory clean when the file changes or the component unmounts.
  useEffect(() => {
    if (!coverFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  // Step 2: Decide which image to show:
  // - If the user removed the cover, show nothing.
  // - If a new file was selected, show its local preview.
  // - Otherwise show the existing cover URL (if any).
  const coverPreview = coverRemoved ? null : (previewUrl ?? coverPhotoUrl ?? null);

  // Step 3: Mark the form as dirty if any core field changed, a new cover file was chosen,
  // or an existing cover was removed. This drives the NavigationBlocker.
  const isDirty =
    title !== (initialData?.title || '') ||
    description !== (initialData?.description || '') ||
    dateTime !== (initialData?.dateTime || '') ||
    location !== (initialData?.location || '') ||
    capacity !== (initialData?.capacity || 10) ||
    coverFile !== null ||
    (coverPhotoUrl !== undefined && coverRemoved);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When a file is selected, store it and clear any previous removal flag.
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    setCoverRemoved(false);
  };

  const handleClear = () => {
    // When the user clicks "remove", drop the pending file and mark removal.
    setCoverFile(null);
    setCoverRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Guard against double-submission: the button is disabled when isLoading,
    // but keyboard-triggered submits (Enter) can still fire. A synchronous ref
    // flag catches rapid re-entry before React re-renders with the disabled state.
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    try {
      // Step 5: Send both the meeting fields and the cover photo state to the parent.
      await onSubmit({
        title,
        description,
        dateTime,
        location,
        capacity,
        coverPhotoFile: coverFile,
        coverPhotoRemoved: coverRemoved,
      });
    } finally {
      isSubmittingRef.current = false;
    }
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
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition dark:[color-scheme:dark]"
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

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Cover Photo</label>
        {coverPreview && (
          <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              src={coverPreview}
              alt="Cover preview"
              className="w-full h-48 sm:h-64 object-cover"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 bg-gray-900/70 hover:bg-gray-900/90 text-white rounded-full p-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
              aria-label="Remove cover photo"
              title="Remove cover photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{coverPreview ? 'Change cover photo' : 'Upload cover photo'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileChange}
              className="sr-only"
              data-testid="cover-photo-input"
            />
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF, WebP up to 5MB</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          data-testid="meeting-form-submit"
          className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
