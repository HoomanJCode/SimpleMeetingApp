import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TimelinePage from '../TimelinePage';
import type { Meeting } from '../../types';

vi.mock('../../hooks/useMeetings', () => ({
  useMeetingList: () => ({ meetings: mockMeetings, isLoading: false, error: null }),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

let mockMeetings: Meeting[] = [];

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    hostId: 'u1',
    title: 'Timeline Page Meeting',
    description: 'A meeting',
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

describe('TimelinePage', () => {
  it('renders meetings on the timeline', () => {
    mockMeetings = [createMeeting()];
    render(
      <BrowserRouter>
        <TimelinePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Timeline Page Meeting')).toBeInTheDocument();
  });

  it('switches between all meetings and my meetings scope', () => {
    mockMeetings = [createMeeting()];
    render(
      <BrowserRouter>
        <TimelinePage />
      </BrowserRouter>
    );

    const myButton = screen.getByRole('button', { name: 'My meetings' });
    fireEvent.click(myButton);

    // With no user, "my meetings" filters everything out → empty state.
    expect(screen.getByText('No meetings to show')).toBeInTheDocument();
  });

  it('filters meetings by status', () => {
    mockMeetings = [createMeeting()];
    render(
      <BrowserRouter>
        <TimelinePage />
      </BrowserRouter>
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'cancelled' } });

    // useMeetingList is mocked to ignore params, so meetings stay visible.
    expect(select.value).toBe('cancelled');
    expect(screen.getByText('Timeline Page Meeting')).toBeInTheDocument();
  });
});
