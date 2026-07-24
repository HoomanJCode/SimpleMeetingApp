import { api, getAccessToken } from './client';
import type { Meeting, MeetingResponse, MeetingPhoto } from '../types';

export interface CreateMeetingInput {
  title: string;
  description: string;
  dateTime: string;
  location: string;
  capacity: number;
  coverPhotoUrl?: string | null;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  dateTime?: string;
  location?: string;
  capacity?: number;
  status?: string;
  coverPhotoUrl?: string | null;
}

export interface MeetingListResponse {
  meetings: Meeting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getMeetings(params?: Record<string, string | number>): Promise<MeetingListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') searchParams.set(k, String(v));
    });
  }
  const qs = searchParams.toString();
  return api.get<MeetingListResponse>(`/meetings${qs ? `?${qs}` : ''}`);
}

export function getMeeting(id: string): Promise<MeetingResponse> {
  return api.get<MeetingResponse>(`/meetings/${id}`);
}

export function createMeeting(data: CreateMeetingInput): Promise<Meeting> {
  return api.post<Meeting>('/meetings', data);
}

export function updateMeeting(id: string, data: UpdateMeetingInput): Promise<Meeting> {
  return api.put<Meeting>(`/meetings/${id}`, data);
}

export function cancelMeeting(id: string): Promise<Meeting> {
  return api.post<Meeting>(`/meetings/${id}/cancel`);
}

export function joinMeeting(id: string): Promise<{ message: string; participantCount: number }> {
  return api.post(`/meetings/${id}/join`);
}

export function leaveMeeting(id: string): Promise<{ message: string; participantCount: number }> {
  return api.post(`/meetings/${id}/leave`);
}

export function getMyMeetings(): Promise<{ hosting: Meeting[]; attending: Meeting[] }> {
  return api.get('/meetings/my');
}

export async function uploadMeetingPhoto(meetingId: string, file: File): Promise<MeetingPhoto> {
  // Step 1: Build a multipart/form-data body so the backend can receive the file.
  const formData = new FormData();
  formData.append('photo', file);

  // Step 2: Attach the auth token manually because fetch() does not go through api.request().
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Step 3: Send the upload request to the meeting-specific photo endpoint.
  const res = await fetch(`/api/meetings/${meetingId}/photos`, {
    method: 'POST',
    headers,
    body: formData,
  });

  // Step 4: Throw a readable error if the server rejects the upload.
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to upload photo');
  }

  return res.json();
}

export function deleteMeetingPhoto(meetingId: string, photoId: string): Promise<void> {
  return api.delete(`/meetings/${meetingId}/photos/${photoId}`);
}
