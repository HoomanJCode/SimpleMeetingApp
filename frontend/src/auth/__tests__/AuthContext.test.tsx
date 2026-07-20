import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { User } from '../../types';

// --- Mocks ---

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

vi.mock('../../api/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockUser)),
}));

const configureApiClientMock = vi.fn();
vi.mock('../../api/client', () => ({
  configureApiClient: (...args: any[]) => configureApiClientMock(...args),
}));

// Helper to render AuthProvider and consume context
function renderWithAuth() {
  let authState: ReturnType<typeof useAuth> | null = null;
  const TestConsumer = () => {
    authState = useAuth();
    return <div data-testid="consumer">{authState.isLoading ? 'loading' : authState.user ? `Hello ${authState.user.name}` : 'no user'}</div>;
  };
  const view = render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
  return { ...view, getAuthState: () => authState! };
}

describe('AuthContext', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;
  });

  afterEach(() => {
    if (window.location !== originalLocation) {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
        writable: true,
      });
    }
  });

  it('resolves to no user with loading=false when no refresh token is stored', async () => {
    const { getAuthState } = renderWithAuth();

    await waitFor(() => {
      expect(getAuthState().isLoading).toBe(false);
    });

    expect(getAuthState().user).toBeNull();
    expect(configureApiClientMock).toHaveBeenCalledTimes(1);
    // First arg to configureApiClient should be a function (getToken)
    expect(configureApiClientMock.mock.calls[0][0]).toBeInstanceOf(Function);
  });

  it('returns user when a refresh token exists and getCurrentUser succeeds', async () => {
    // Set a refresh token before mounting (module-level state)
    const { getCurrentUser } = await import('../../api/auth');

    // Mount with token already set
    const { getAuthState } = renderWithAuth();

    // Simulate that a refresh token was already in memory from a prior page load
    // Since we can't inject into the module-level variable, we test the flow
    // by calling setTokens before checking refreshUser behaviour.
    act(() => {
      getAuthState().setTokens({ accessToken: 'a', refreshToken: 'r' });
    });

    // Manually trigger refreshUser (as AuthCallbackPage would)
    await act(async () => {
      await getAuthState().refreshUser();
    });

    expect(getAuthState().user).toEqual(mockUser);
    expect(getCurrentUser).toHaveBeenCalled();
  });

  it('setTokens stores tokens and they are retrievable via getToken', () => {
    const { getAuthState } = renderWithAuth();

    act(() => {
      getAuthState().setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' });
    });

    expect(getAuthState().getToken()).toBe('test-access');
  });

  it('logout clears user and tokens', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' } as unknown as Location,
      writable: true,
    });

    const { getAuthState } = renderWithAuth();

    act(() => {
      getAuthState().setTokens({ accessToken: 'a', refreshToken: 'r' });
    });
    act(() => {
      getAuthState().logout();
    });

    expect(getAuthState().user).toBeNull();
    expect(getAuthState().getToken()).toBeNull();
    expect(window.location.href).toBe('/');
  });

  it('login redirects to /api/auth/google', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' } as unknown as Location,
      writable: true,
    });

    const { getAuthState } = renderWithAuth();
    act(() => {
      getAuthState().login();
    });

    expect(window.location.href).toBe('/api/auth/google');
  });

  it('refreshUser silently swallows errors', async () => {
    const { getCurrentUser } = await import('../../api/auth');
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('Network error'));

    const { getAuthState } = renderWithAuth();

    await act(async () => {
      // Should not throw
      await getAuthState().refreshUser();
    });

    // User should remain null (was null to begin with)
    expect(getAuthState().user).toBeNull();
  });

  it('throws when useAuth is called outside AuthProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const BadComponent = () => {
      useAuth();
      return null;
    };

    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
