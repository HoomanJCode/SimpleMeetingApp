import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MeetingCalendar } from '../MeetingCalendar';
import type { Meeting } from '../../../types';

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    hostId: 'u1',
    title: 'Calendar Meeting',
    description: 'A calendar meeting',
    dateTime: '2027-06-15T18:00:00Z',
    location: 'Test Location',
    capacity: 20,
    status: 'upcoming',
    createdAt: '2027-06-01T00:00:00Z',
    updatedAt: '2027-06-01T00:00:00Z',
    hostName: 'Host User',
    hostAvatarUrl: null,
    participantCount: 5,
    ...overrides,
  };
}

describe('MeetingCalendar', () => {
  it('renders meetings on their date', () => {
    render(
      <BrowserRouter>
        <MeetingCalendar
          year={2027}
          month={5}
          meetings={[createMeeting()]}
          onMonthChange={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Calendar Meeting')).toBeInTheDocument();
  });

  it('shows a colored dot for the first tag of a meeting', () => {
    render(
      <BrowserRouter>
        <MeetingCalendar
          year={2027}
          month={5}
          meetings={[
            createMeeting({
              tags: [{ id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' }],
            }),
          ]}
          onMonthChange={vi.fn()}
        />
      </BrowserRouter>
    );

    // The dot is a small span colored with the tag's hex color.
    const dot = document.querySelector('span[style*="background-color"]');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.backgroundColor).toBe('rgb(59, 130, 246)');
  });
});
