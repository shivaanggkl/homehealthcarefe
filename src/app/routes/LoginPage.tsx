import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../auth/session-api';
import { useAuth } from '../auth/auth-context';

export function LoginPage() {
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
    return routeState?.from ?? '/app';
  }, [location.state]);
  const logoutConfirmed = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get('loggedOut') === '1';
  }, [location.search]);
  const timedOut = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get('timedOut') === '1';
  }, [location.search]);

  if (state.status === 'authenticated') {
    return <Navigate to={requestedPath} replace />;
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
        if (error.status === 429) {
          setFormError('Too many login attempts. Wait a moment before trying again.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Unable to complete login right now. Check backend availability and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">Frontend Story FE-02</span>
        <h1>Sign in to HomeHealthCareFE</h1>
        <p>
          This screen is wired to the backend login contract and preserves the FE-01 session bootstrap model.
          Successful password login routes either into the protected app shell or into the MFA challenge path.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          {logoutConfirmed ? (
            <p className="success-note">You have been logged out and the current session is closed.</p>
          ) : null}
          {timedOut ? (
            <p className="alert">
              Your session expired due to inactivity or max session duration. Sign in again to continue.
            </p>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              className="input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
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
            <span>Store token fallback locally for plain localhost development</span>
          </label>

          <div className="button-row">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
            <button className="button button-secondary" onClick={() => void refreshAuth()} type="button">
              Retry Existing Session
            </button>
          </div>

          <div className="inline-links">
            <Link className="text-link" to={`/forgot-password?email=${encodeURIComponent(email.trim())}`}>
              Forgot your password?
            </Link>
          </div>

          {formError ? (
            <p className="alert">
              <strong>Sign-in failed.</strong> {formError}
            </p>
          ) : null}
        </form>

        <div className="info-block">
          <h2>Current behavior</h2>
          <ul className="check-list">
            <li>Posts email and password to <code>POST /api/auth/login</code></li>
            <li>Shows the backend generic invalid-credentials response without account leakage</li>
            <li>Handles rate limiting and temporary lockout with a distinct UI message</li>
            <li>Routes to app home or MFA challenge depending on backend response</li>
          </ul>
        </div>
      </section>

      <section className="auth-card">
        <h2>Backend contract used by FE-02</h2>
        <dl className="definition-list compact">
          <div>
            <dt>Login endpoint</dt>
            <dd>
              <code>POST /api/auth/login</code>
            </dd>
          </div>
          <div>
            <dt>Success branch</dt>
            <dd>
              Session tokens are returned and secure cookies are set by the backend
            </dd>
          </div>
          <div>
            <dt>MFA branch</dt>
            <dd>
              Backend returns <code>mfaRequired=true</code> and a login challenge token
            </dd>
          </div>
          <div>
            <dt>Fallback dev mode</dt>
            <dd>
              Access token and session id can be stored locally when secure cookies do not round-trip on localhost
            </dd>
          </div>
        </dl>

        {formError || state.error ? (
          <p className="alert">
            {formError ? (
              formError
            ) : (
              <>
                Session bootstrap failed: <strong>{state.error}</strong>
              </>
            )}
          </p>
        ) : null}

        <div className="button-row">
          <button className="button button-ghost" onClick={clearLocalAuthState} type="button">
            Clear Stored Dev Tokens
          </button>
        </div>
      </section>
    </div>
  );
}
