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
  const [showPassword, setShowPassword] = useState(false);
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
  const isLocalDev = useMemo(
    () => window.location.protocol === 'http:' || window.location.hostname === 'localhost',
    [],
  );

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
    <div className="login-layout">
      <section className="login-hero-panel">
        <div className="login-brand-lockup">
          <span className="login-brand-mark">MH</span>
          <div>
            <span className="eyebrow login-eyebrow">MavieHealth</span>
            <h1>Built for modern home health operations.</h1>
          </div>
        </div>
        <p className="login-hero-copy">
          Coordinate field care, documentation, compliance, readiness, and operational oversight in one secure platform.
        </p>
        <div className="login-value-grid">
          <article className="login-value-card">
            <strong>Secure access</strong>
            <p>Password policy, session controls, MFA, and audit-aware workflows are built into the product.</p>
          </article>
          <article className="login-value-card">
            <strong>Care delivery visibility</strong>
            <p>Scheduling, mobile execution, EVV, documentation, QA, and compliance stay connected.</p>
          </article>
          <article className="login-value-card">
            <strong>Operational readiness</strong>
            <p>Revenue readiness and analytics surface the downstream impact of upstream care operations.</p>
          </article>
        </div>
        <div className="login-trust-strip">
          <span>Role-based access</span>
          <span>Multi-factor capable</span>
          <span>Audit-aware actions</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-intro">
          <span className="eyebrow">Secure Sign In</span>
          <h2>Welcome back</h2>
          <p>
            Sign in with your agency email and password. If your organization requires multi-factor verification, you’ll continue there automatically.
          </p>
        </div>

        <form className="stack-form login-form-stack" onSubmit={handleSubmit}>
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
            <div className="login-password-row">
              <input
                autoComplete="current-password"
                className="input login-input"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="login-primary-actions">
            <button className="button login-submit-button" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="inline-links login-links">
            <Link className="text-link" to={`/forgot-password?email=${encodeURIComponent(email.trim())}`}>
              Forgot your password?
            </Link>
            <span className="login-link-divider" aria-hidden="true">
              •
            </span>
            <Link className="text-link" to="/accept-invitation">
              Accept invitation
            </Link>
          </div>

          {formError ? (
            <p className="alert">
              <strong>Sign-in failed.</strong> {formError}
            </p>
          ) : null}
        </form>

        <div className="login-support-card">
          <strong>Need help signing in?</strong>
          <p>
            Use your agency-issued credentials. If access was just granted, accept your invitation first. Contact your administrator if your access profile or branch scope looks wrong after sign in.
          </p>
        </div>

        {isLocalDev ? (
          <details className="login-dev-tools">
            <summary>Local development tools</summary>
            <div className="login-dev-tools-body">
              <label className="checkbox checkbox-light">
                <input
                  checked={persistDevSession}
                  onChange={(event) => setPersistDevSession(event.target.checked)}
                  type="checkbox"
                />
                <span>Store token fallback locally when secure cookies do not round-trip on localhost</span>
              </label>

              {state.error ? (
                <p className="alert">
                  Session bootstrap failed: <strong>{state.error}</strong>
                </p>
              ) : null}

              <div className="button-row login-dev-actions">
                <button className="button button-secondary" onClick={() => void refreshAuth()} type="button">
                  Retry existing session
                </button>
                <button className="button button-ghost" onClick={clearLocalAuthState} type="button">
                  Clear stored dev tokens
                </button>
              </div>
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
