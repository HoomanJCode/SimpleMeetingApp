import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MeetingCard } from '../MeetingCard';
import type { Meeting } from '../../../types';

function renderWithRouter(meeting: Meeting) {
  return render(
    <BrowserRouter>
      <MeetingCard meeting={meeting} />
    </BrowserRouter>
  );
}

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    hostId: 'u1',
    title: 'Test Meeting',
    description: 'A test meeting',
    dateTime: '2027-01-01T18:00:00Z',
    location: 'Test Location',
    capacity: 20,
    status: 'upcoming',
    createdAt: '2027-01-01T00:00:00Z',
    updatedAt: '2027-01-01T00:00:00Z',
    hostName: 'Host User',
    hostAvatarUrl: null,
    participantCount: 5,
    ...overrides,
  };
}

describe('MeetingCard', () => {
  it('renders meeting title and location', () => {
    renderWithRouter(createMeeting());

    expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    expect(screen.getByText('Test Location')).toBeInTheDocument();
  });

  it('shows participant count', () => {
    renderWithRouter(createMeeting({ participantCount: 12, capacity: 30 }));

    expect(screen.getByText('12/30')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    renderWithRouter(createMeeting({ status: 'cancelled' }));

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('shows host name and avatar', () => {
    renderWithRouter(createMeeting({ hostName: 'Alice Host' }));

    expect(screen.getByText('Alice Host')).toBeInTheDocument();
  });

  it('links to meeting detail page', () => {
    renderWithRouter(createMeeting({ id: 'meeting-123' }));

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/meetings/meeting-123');
  });

  it('highlights low spots left', () => {
    renderWithRouter(createMeeting({ participantCount: 18, capacity: 20 }));

    const count = screen.getByText('18/20');
    expect(count).toHaveClass('text-orange-600');
  });

  it('shows tag chips on the card', () => {
    renderWithRouter(
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

  it('limits tag chips to 3 and shows an overflow count', () => {
    const makeTag = (i: number) => ({ id: `tag-${i}`, name: `Tag ${i}`, color: '#3b82f6' });
    renderWithRouter(createMeeting({ tags: [makeTag(1), makeTag(2), makeTag(3), makeTag(4)] }));

    expect(screen.getByText('Tag 1')).toBeInTheDocument();
    expect(screen.getByText('Tag 3')).toBeInTheDocument();
    expect(screen.queryByText('Tag 4')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
