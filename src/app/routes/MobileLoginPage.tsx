import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../auth/session-api';
import { useAuth } from '../auth/auth-context';

export function MobileLoginPage() {
  const { state, refreshAuth, clearLocalAuthState, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [persistDevSession, setPersistDevSession] = useState(
    window.location.protocol === 'http:' || window.location.hostname === 'localhost',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestedPath = useMemo(() => {
    const routeState = location.state as { from?: string } | null;
    return routeState?.from ?? '/mobile';
  }, [location.state]);

  const timedOut = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get('timedOut') === '1';
  }, [location.search]);

  if (state.status === 'authenticated') {
    return <Navigate replace to={requestedPath} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const result = await login({
        email: email.trim(),
        password,
        persistDevSession,
      });

      if (result.kind === 'mfa-required') {
        navigate('/login/mfa', { replace: true });
        return;
      }

      navigate(requestedPath, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(
          error.status === 429
            ? 'Too many sign-in attempts. Wait a moment and retry.'
            : error.message,
        );
      } else {
        setFormError('Unable to reach the backend right now. Check connectivity and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mobile-auth-layout">
      <section className="mobile-auth-card">
        <span className="eyebrow">Epic 6 Mobile</span>
        <h1>Caregiver field sign in</h1>
        <p>
          This mobile entry uses the same secure auth contract as the admin app, but it routes
          directly into today&apos;s field work and shows session/bootstrap status in mobile-first
          language.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          {timedOut ? (
            <p className="alert">
              Your field session expired. Sign in again to continue visit work safely.
            </p>
          ) : null}

          <label className="field">
            <span>Work email</span>
            <input
              autoComplete="email"
              className="input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="caregiver@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              className="input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>

          <label className="checkbox">
            <input
              checked={persistDevSession}
              onChange={(event) => setPersistDevSession(event.target.checked)}
              type="checkbox"
            />
            <span>Keep localhost token fallback for mobile development</span>
          </label>

          <div className="button-row">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Open my field work'}
            </button>
            <button className="button button-secondary" onClick={() => void refreshAuth()} type="button">
              Retry session bootstrap
            </button>
          </div>

          <div className="inline-links">
            <Link className="text-link" to={`/forgot-password?email=${encodeURIComponent(email.trim())}`}>
              Forgot your password?
            </Link>
            <Link className="text-link" to="/login">
              Open desktop login
            </Link>
          </div>

          {formError ? (
            <p className="alert">
              <strong>Mobile sign-in failed.</strong> {formError}
            </p>
          ) : null}
        </form>

        <div className="mobile-inline-note">
          <strong>Bootstrap behavior</strong>
          <p>
            The app restores the backend session before showing protected field routes, and it
            makes expired or missing session state explicit instead of silently dropping the
            caregiver into a broken view.
          </p>
        </div>

        {state.error ? <p className="alert">Previous bootstrap error: {state.error}</p> : null}

        <button className="button button-ghost" onClick={clearLocalAuthState} type="button">
          Clear stored mobile dev session
        </button>
      </section>
    </div>
  );
}
