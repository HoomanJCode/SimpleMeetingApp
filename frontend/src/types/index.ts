export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Meeting {
  id: string;
  hostId: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  hostName?: string;
  hostAvatarUrl?: string | null;
  participantCount?: number;
  isJoined?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingResponse extends Meeting {
  participants: Participant[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
