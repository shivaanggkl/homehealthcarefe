import { useAuth } from '../auth/auth-context';

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function HomePage() {
  const { state } = useAuth();

  if (state.status !== 'authenticated') {
    return null;
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">FE-01 complete</span>
        <h2>Authenticated app startup is wired to the backend session model.</h2>
        <p>
          This shell boots from <code>GET /api/auth/session</code>, restores authenticated state after
          refresh, redirects unauthenticated users to the login route, and now drives the FE-10 timeout
          warning and session refresh experience.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Session Snapshot</h3>
          <p>Directly reflects the current backend auth session contract.</p>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Idle timeout</dt>
            <dd>{formatTimestamp(state.session.idleTimeoutAt)}</dd>
          </div>
          <div>
            <dt>Absolute timeout</dt>
            <dd>{formatTimestamp(state.session.absoluteTimeoutAt)}</dd>
          </div>
          <div>
            <dt>Forced logout</dt>
            <dd>{formatTimestamp(state.session.forcedLogoutAt)}</dd>
          </div>
          <div>
            <dt>Warning required</dt>
            <dd>{state.session.warningRequired ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Seconds until forced logout</dt>
            <dd>{state.session.secondsUntilForcedLogout}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>What FE-01 covers</h3>
        </div>
        <ul className="check-list">
          <li>Bootstraps current auth state on app load</li>
          <li>Supports secure cookie mode and local header-based dev mode</li>
          <li>Guards protected routes</li>
          <li>Handles revoked or expired sessions by moving back to unauthenticated state</li>
          <li>Exposes a reusable auth context for later login, logout, MFA, and settings flows</li>
        </ul>
      </section>
    </div>
  );
}
