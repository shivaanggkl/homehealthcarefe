import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../auth/session-api';
import { useAuth } from '../auth/auth-context';

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SessionTimeoutWarning() {
  const { state, extendSession, logout } = useAuth();
  const navigate = useNavigate();
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [refreshPending, setRefreshPending] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timedOutRef = useRef(false);

  useEffect(() => {
    if (state.status !== 'authenticated' || !state.session.warningRequired) {
      setSecondsRemaining(0);
      setError(null);
      timedOutRef.current = false;
      return;
    }

    setSecondsRemaining(state.session.secondsUntilForcedLogout);
    timedOutRef.current = false;
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !state.session.warningRequired) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state]);

  useEffect(() => {
    if (
      state.status !== 'authenticated' ||
      !state.session.warningRequired ||
      secondsRemaining > 0 ||
      timedOutRef.current
    ) {
      return;
    }

    timedOutRef.current = true;
    setLogoutPending(true);
    setError(null);

    void logout({ redirectTo: '/login?timedOut=1' })
      .then((result) => {
        navigate(result.redirectTo, { replace: true });
      })
      .catch((logoutError) => {
        setError(
          logoutError instanceof Error
            ? logoutError.message
            : 'Your session expired, but logout cleanup could not complete cleanly.',
        );
      })
      .finally(() => {
        setLogoutPending(false);
      });
  }, [logout, navigate, secondsRemaining, state]);

  if (state.status !== 'authenticated' || !state.session.warningRequired) {
    return null;
  }

  async function handleStaySignedIn() {
    setRefreshPending(true);
    setError(null);

    try {
      await extendSession();
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) {
        const result = await logout({ redirectTo: '/login?timedOut=1' });
        navigate(result.redirectTo, { replace: true });
        return;
      }

      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to extend the session right now. Save your work and try again.',
      );
    } finally {
      setRefreshPending(false);
    }
  }

  async function handleLogoutNow() {
    setLogoutPending(true);
    setError(null);

    try {
      const result = await logout({ redirectTo: '/login?loggedOut=1' });
      navigate(result.redirectTo, { replace: true });
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to logout right now.');
    } finally {
      setLogoutPending(false);
    }
  }

  return (
    <section className="timeout-banner" aria-live="polite">
      <div className="timeout-banner-copy">
        <span className="eyebrow">FE-10 session warning</span>
        <h2>Your session is about to end.</h2>
        <p>
          Save your work or extend the current session before{' '}
          <strong>{formatTimestamp(state.session.forcedLogoutAt)}</strong>.
        </p>
      </div>

      <div className="timeout-countdown-card">
        <span className="timeout-countdown-value">{secondsRemaining}</span>
        <span className="timeout-countdown-label">seconds until forced logout</span>
      </div>

      <div className="timeout-banner-actions">
        <button
          className="button"
          disabled={refreshPending || logoutPending}
          onClick={() => void handleStaySignedIn()}
          type="button"
        >
          {refreshPending ? 'Refreshing session...' : 'Stay Signed In'}
        </button>
        <button
          className="button button-secondary"
          disabled={refreshPending || logoutPending}
          onClick={() => void handleLogoutNow()}
          type="button"
        >
          {logoutPending ? 'Closing session...' : 'Logout Now'}
        </button>
      </div>

      {error ? <p className="alert timeout-alert">{error}</p> : null}
    </section>
  );
}
