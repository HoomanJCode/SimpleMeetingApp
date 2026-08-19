import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MeetingDetail } from '../MeetingDetail';
import type { MeetingResponse } from '../../../types';

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Host User', email: 'host@test.com', avatarUrl: null } }),
}));

function createMeeting(overrides: Partial<MeetingResponse> = {}): MeetingResponse {
  return {
    id: 'm1',
    hostId: 'u1',
    title: 'Detail Meeting',
    description: 'A meeting detail',
    dateTime: '2027-01-01T18:00:00Z',
    location: 'Test Location',
    capacity: 20,
    status: 'upcoming',
    createdAt: '2027-01-01T00:00:00Z',
    updatedAt: '2027-01-01T00:00:00Z',
    hostName: 'Host User',
    hostAvatarUrl: null,
    participantCount: 1,
    isJoined: true,
    participants: [],
    ...overrides,
  };
}

function renderDetail(meeting: MeetingResponse) {
  return render(
    <BrowserRouter>
      <MeetingDetail
        meeting={meeting}
        connectionState="connected"
        onJoin={vi.fn()}
        onLeave={vi.fn()}
        onCancel={vi.fn()}
        isJoining={false}
        isLeaving={false}
        isCancelling={false}
      />
    </BrowserRouter>
  );
}

describe('MeetingDetail', () => {
  it('renders the meeting title and host', () => {
    renderDetail(createMeeting());

    expect(screen.getByText('Detail Meeting')).toBeInTheDocument();
    expect(screen.getByText('Host User')).toBeInTheDocument();
  });

  it('renders tag chips for the meeting', () => {
    renderDetail(
      createMeeting({
        tags: [
          { id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' },
          { id: 'tag-online', name: 'Online', color: '#8b5cf6' },
        ],
      })
    );

    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
