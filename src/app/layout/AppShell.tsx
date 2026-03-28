import { PropsWithChildren, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { SessionTimeoutWarning } from '../components/SessionTimeoutWarning';

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AppShell({ children }: PropsWithChildren) {
  const { state, clearLocalAuthState, refreshAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (state.status !== 'authenticated') {
    return null;
  }

  async function handleLogout() {
    setLogoutPending(true);
    setLogoutError(null);

    try {
      const result = await logout({
        redirectTo: '/login?loggedOut=1',
      });
      navigate(result.redirectTo, { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to logout right now.');
    } finally {
      setLogoutPending(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" to="/app">
          <span className="brand-mark">HHC</span>
          <div>
            <strong>HomeHealthCare</strong>
            <p>Secure operations console</p>
          </div>
        </Link>

        <nav className="nav">
          <NavLink className="nav-link" to="/app">
            Session Home
          </NavLink>
          <NavLink className="nav-link" to="/app/settings/password">
            Change Password
          </NavLink>
          <NavLink className="nav-link" to="/app/settings/mfa">
            MFA Settings
          </NavLink>
          <NavLink className="nav-link" to="/app/settings/sessions">
            Active Sessions
          </NavLink>
        </nav>

        <section className="sidebar-card">
          <span className="eyebrow">Auth Source</span>
          <strong>{state.authSource === 'storage' ? 'Local dev header mode' : 'Secure cookie mode'}</strong>
          <p>
            FE-01 restores session state from the backend on every reload and falls back to stored dev
            credentials when secure local cookies are unavailable.
          </p>
        </section>

        <section className="sidebar-card">
          <span className="eyebrow">Forced Logout</span>
          <strong>{formatTimestamp(state.session.forcedLogoutAt)}</strong>
          <p>{state.session.secondsUntilForcedLogout} seconds remaining in the current warning window.</p>
        </section>

        <div className="sidebar-actions">
          <button className="button button-secondary" onClick={() => void refreshAuth()} type="button">
            Recheck Session
          </button>
          <button
            className="button"
            disabled={logoutPending}
            onClick={() => void handleLogout()}
            type="button"
          >
            {logoutPending ? 'Signing out...' : 'Logout'}
          </button>
          <button className="button button-ghost" onClick={clearLocalAuthState} type="button">
            Clear Local State
          </button>
        </div>

        {logoutError ? <p className="alert sidebar-alert">{logoutError}</p> : null}
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Active User</span>
            <h1>Session-aware shell</h1>
          </div>
          <div className="topbar-meta">
            <div>
              <span className="meta-label">User ID</span>
              <code>{state.session.userId}</code>
            </div>
            <div>
              <span className="meta-label">Session ID</span>
              <code>{state.session.sessionId}</code>
            </div>
          </div>
        </header>
        <SessionTimeoutWarning />
        {children}
      </main>
    </div>
  );
}
