import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MeetingTimeline } from '../MeetingTimeline';
import type { Meeting } from '../../../types';

function renderTimeline(meetings: Meeting[], isLoading = false, error: string | null = null) {
  return render(
    <BrowserRouter>
      <MeetingTimeline meetings={meetings} isLoading={isLoading} error={error} />
    </BrowserRouter>
  );
}

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    hostId: 'u1',
    title: 'Timeline Meeting',
    description: 'A timeline meeting',
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

describe('MeetingTimeline', () => {
  it('shows the loading spinner while fetching', () => {
    renderTimeline([], true);
    // The Spinner renders a spinning div (animate-spin) with no text content.
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
    expect(screen.queryByText('No meetings to show')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no meetings', () => {
    renderTimeline([]);
    expect(screen.getByText('No meetings to show')).toBeInTheDocument();
  });

  it('renders meetings sorted chronologically with month milestones', () => {
    const meetings = [
      createMeeting({ id: 'm2', title: 'Later Meeting', dateTime: '2027-02-05T18:00:00Z' }),
      createMeeting({ id: 'm1', title: 'Earlier Meeting', dateTime: '2027-01-01T18:00:00Z' }),
    ];

    renderTimeline(meetings);

    // Both meetings render; chronological order is: Earlier before Later
    const titles = screen.getAllByText(/Meeting/);
    expect(titles[0]).toHaveTextContent('Earlier Meeting');
    expect(titles[1]).toHaveTextContent('Later Meeting');

    // Month milestones appear
    expect(screen.getByText('January 2027')).toBeInTheDocument();
    expect(screen.getByText('February 2027')).toBeInTheDocument();
  });

  it('shows the Today marker', () => {
    renderTimeline([createMeeting()]);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('links each meeting card to its detail page', () => {
    renderTimeline([createMeeting({ id: 'meeting-abc' })]);

    const link = screen.getByRole('link', { name: /Timeline Meeting/ });
    expect(link).toHaveAttribute('href', '/meetings/meeting-abc');
  });

  it('shows the error message when loading fails', () => {
    renderTimeline([], false, 'Failed to load meetings');
    expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();
  });

  it('displays tags on meeting cards', () => {
    renderTimeline([
      createMeeting({
        tags: [{ id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' }],
      }),
    ]);

    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
  });
});
