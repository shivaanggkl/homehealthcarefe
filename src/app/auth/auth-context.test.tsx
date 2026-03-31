import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('./session-api', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  completeMfaChallenge: vi.fn(),
  fetchSessionSnapshot: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentSession: vi.fn(),
  refreshAuthenticatedSession: vi.fn(),
}));

vi.mock('./session-storage', () => ({
  clearPendingMfaChallenge: vi.fn(),
  clearDevSessionCredentials: vi.fn(),
  loadDevSessionCredentials: vi.fn(),
  savePendingMfaChallenge: vi.fn(),
  saveDevSessionCredentials: vi.fn(),
}));

const { AuthProvider, useAuth } = await import('./auth-context');
const sessionApi = await import('./session-api');
const sessionStorage = await import('./session-storage');

function AuthStateProbe() {
  const { state } = useAuth();
  return <div>{state.status}</div>;
}

function renderAuthProvider(children?: ReactNode) {
  return render(<AuthProvider>{children ?? <AuthStateProbe />}</AuthProvider>);
}

describe('AuthProvider', () => {
  const authenticatedSnapshot = {
    sessionId: 'session-1',
    userId: 'user-1',
    idleTimeoutAt: '2026-03-30T16:30:00-05:00',
    absoluteTimeoutAt: '2026-03-30T22:00:00-05:00',
    forcedLogoutAt: '2026-03-30T16:32:00-05:00',
    warningRequired: false,
    secondsUntilForcedLogout: 1800,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.mocked(sessionStorage.loadDevSessionCredentials).mockReturnValue({
      accessToken: 'stored-access',
      refreshToken: 'stored-refresh',
      sessionId: 'session-1',
    });
    vi.mocked(sessionApi.fetchSessionSnapshot).mockResolvedValue({
      kind: 'authenticated',
      snapshot: authenticatedSnapshot,
      authSource: 'storage',
    });
    vi.mocked(sessionApi.refreshAuthenticatedSession).mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-2',
      accessToken: 'refreshed-access',
      accessTokenExpiresAt: '2026-03-30T16:20:00-05:00',
      refreshToken: 'refreshed-refresh',
      refreshTokenExpiresAt: '2026-04-29T16:00:00-05:00',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('automatically extends an active session while the user is interacting with the app', async () => {
    renderAuthProvider();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('authenticated')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    });

    expect(sessionApi.refreshAuthenticatedSession).toHaveBeenCalledTimes(1);
    expect(sessionStorage.saveDevSessionCredentials).toHaveBeenCalledWith({
      accessToken: 'refreshed-access',
      refreshToken: 'refreshed-refresh',
      sessionId: 'session-2',
    });
  });

  it('stops auto-extending after the recent-activity window passes with no further interaction', async () => {
    renderAuthProvider();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('authenticated')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(26 * 60 * 1000);
    });

    expect(sessionApi.refreshAuthenticatedSession).toHaveBeenCalledTimes(2);
  });
});
