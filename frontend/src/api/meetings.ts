import { api } from './client';
import type { Meeting, MeetingResponse } from '../types';

export interface CreateMeetingInput {
  title: string;
  description: string;
  dateTime: string;
  location: string;
  capacity: number;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  dateTime?: string;
  location?: string;
  capacity?: number;
  status?: string;
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
