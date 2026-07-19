import { useState, useCallback } from 'react';
import { createMeeting as apiCreateMeeting, type CreateMeetingInput } from '../api/meetings';
import type { Meeting } from '../types';

export function useCreateMeeting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: CreateMeetingInput): Promise<Meeting> => {
    setIsLoading(true);
    setError(null);
    try {
      const meeting = await apiCreateMeeting(data);
      return meeting;
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { create, isLoading, error };
}
