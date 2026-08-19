export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingStatus {
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
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
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  hostName?: string;
  hostAvatarUrl?: string | null;
  participantCount?: number;
  isJoined?: boolean;
  photos?: MeetingPhoto[];
  tags?: Tag[];
}

export interface MeetingPhoto {
  id: string;
  meetingId: string;
  url: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Participant {
  id: string;
  meetingId: string;
  userId: string;
  createdAt: string;
  // Joined fields
  userName?: string;
  userAvatarUrl?: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface MeetingFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
  fromDate?: string;
  toDate?: string;
  tagId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}
