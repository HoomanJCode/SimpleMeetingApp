import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtime } from '../useRealtime';

// --- Mocks ---

const mockSocket = {
  on: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

const mockGetToken = vi.fn(() => 'test-token');

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

vi.mock('../../api/meetings', () => ({
  getMeeting: vi.fn(() => Promise.resolve({ id: 'm1', title: 'Updated' })),
}));

// Import after mocks
const { io } = await import('socket.io-client');
const { getMeeting } = await import('../../api/meetings');

describe('useRealtime', () => {
  const setMeeting = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore window.location if a test replaced it
    if (window.location !== originalLocation) {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
        writable: true,
      });
    }
  });

  // Immortalised before any test can mutate it
  const originalLocation = window.location;

  it('returns disconnected state when no meetingId is given', () => {
    const { result } = renderHook(() => useRealtime(undefined, setMeeting));
    expect(result.current.connectionState).toBe('disconnected');
    expect(io).not.toHaveBeenCalled();
  });

  it('connects to socket when meetingId is provided', () => {
    renderHook(() => useRealtime('m1', setMeeting));

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      auth: { token: 'test-token' },
      transports: ['websocket', 'polling'],
    });
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('meeting:updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('participant:joined', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('participant:left', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('meeting:deleted', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('meeting:cancelled', expect.any(Function));
  });

  it('sets connection state to connected on socket connect event', () => {
    const { result } = renderHook(() => useRealtime('m1', setMeeting));

    // Capture handlers
    const connectHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'connect',
    )?.[1];

    act(() => {
      connectHandler();
    });

    expect(result.current.connectionState).toBe('connected');
  });

  it('starts polling on connect_error', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRealtime('m1', setMeeting));

    const connectErrorHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'connect_error',
    )?.[1];

    act(() => {
      connectErrorHandler();
    });

    expect(result.current.connectionState).toBe('polling');

    // Polling should fetch meeting data every 5 seconds.
    // Use advanceTimersByTimeAsync so the async interval callback (which
    // does await import() + await getMeeting()) completes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(getMeeting).toHaveBeenCalledWith('m1');
    expect(setMeeting).toHaveBeenCalled();
  });

  it('sets state to polling on disconnect event (startPolling runs after setDisconnected)', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRealtime('m1', setMeeting));

    const disconnectHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'disconnect',
    )?.[1];

    act(() => {
      disconnectHandler();
    });

    // The handler calls setConnectionState('disconnected') then
    // startPolling() which calls setConnectionState('polling').
    // Inside act() both batch together → final state is 'polling'.
    expect(result.current.connectionState).toBe('polling');

    // Verify polling actually fetches data.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(getMeeting).toHaveBeenCalledWith('m1');
  });

  it('calls setMeeting on meeting:updated event', () => {
    renderHook(() => useRealtime('m1', setMeeting));

    const updatedHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'meeting:updated',
    )?.[1];

    const mockUpdated = { id: 'm1', title: 'New Title' };
    act(() => {
      updatedHandler(mockUpdated);
    });

    expect(setMeeting).toHaveBeenCalledWith(mockUpdated);
  });

  it('re-fetches meeting on participant:joined event', async () => {
    renderHook(() => useRealtime('m1', setMeeting));

    const joinedHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'participant:joined',
    )?.[1];

    await act(async () => {
      await joinedHandler();
    });

    expect(getMeeting).toHaveBeenCalledWith('m1');
    expect(setMeeting).toHaveBeenCalledWith({ id: 'm1', title: 'Updated' });
  });

  it('re-fetches meeting on participant:left event', async () => {
    renderHook(() => useRealtime('m1', setMeeting));

    const leftHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'participant:left',
    )?.[1];

    await act(async () => {
      await leftHandler();
    });

    expect(getMeeting).toHaveBeenCalledWith('m1');
    expect(setMeeting).toHaveBeenCalledWith({ id: 'm1', title: 'Updated' });
  });

  it('navigates away on meeting:deleted event', () => {
    // Replace window.location with a plain object so href assignment
    // doesn't cause actual navigation. Object.defineProperty is used
    // because delete throws in strict mode for non-configurable props.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' } as unknown as Location,
      writable: true,
    });

    renderHook(() => useRealtime('m1', setMeeting));

    const deletedHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'meeting:deleted',
    )?.[1];

    act(() => {
      deletedHandler();
    });

    expect(window.location.href).toBe('/');
    expect(setMeeting).not.toHaveBeenCalled();
  });

  it('re-fetches meeting on meeting:cancelled event', async () => {
    renderHook(() => useRealtime('m1', setMeeting));

    const cancelledHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'meeting:cancelled',
    )?.[1];

    await act(async () => {
      await cancelledHandler();
    });

    expect(getMeeting).toHaveBeenCalledWith('m1');
    expect(setMeeting).toHaveBeenCalledWith({ id: 'm1', title: 'Updated' });
  });

  it('unsubscribes and disconnects on unmount', () => {
    const { unmount } = renderHook(() => useRealtime('m1', setMeeting));

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('meeting:unsubscribe', { meetingId: 'm1' });
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
