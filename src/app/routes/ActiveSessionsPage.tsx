import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import {
  ApiError,
  fetchUserSessions,
  revokeUserSession,
  UserSessionSummary,
} from '../auth/session-api';
import { loadDevSessionCredentials } from '../auth/session-storage';

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ActiveSessionsPage() {
  const { state } = useAuth();
  const [sessions, setSessions] = useState<UserSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  if (state.status !== 'authenticated') {
    return null;
  }

  const activeSession = state.session;

  async function loadSessions() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const devSession = loadDevSessionCredentials();
      const loadedSessions = await fetchUserSessions({
        accessToken: devSession?.accessToken,
        sessionId: devSession?.sessionId ?? activeSession.sessionId,
      });
      setSessions(loadedSessions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load sessions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleRevoke(session: UserSessionSummary) {
    if (session.current) {
      setErrorMessage('The current session cannot be revoked from this screen.');
      return;
    }

    setRevokingSessionId(session.sessionId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const devSession = loadDevSessionCredentials();
      const result = await revokeUserSession({
        accessToken: devSession?.accessToken,
        sessionId: devSession?.sessionId ?? activeSession.sessionId,
        targetSessionId: session.sessionId,
      });

      setSessions((previous) =>
        previous.map((candidate) =>
          candidate.sessionId === result.sessionId
            ? {
                ...candidate,
                active: false,
                revokedAt: new Date().toISOString(),
                revocationReason: result.revocationReason,
              }
            : candidate,
        ),
      );
      setSuccessMessage('Session revoked successfully.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to revoke that session right now.');
      }
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-09</span>
        <h2>Review and revoke active sessions.</h2>
        <p>
          This settings screen lists current and recent sessions from the backend and lets the user revoke
          non-current sessions without a full page refresh.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Session inventory</h3>
          <p>
            Backed by <code>GET /api/auth/sessions</code> and{' '}
            <code>DELETE /api/auth/sessions/{'{sessionId}'}</code>.
          </p>
        </div>

        {successMessage ? <p className="success-note">{successMessage}</p> : null}
        {errorMessage ? (
          <p className="alert">
            <strong>Session action failed.</strong> {errorMessage}
          </p>
        ) : null}

        <div className="button-row">
          <button className="button button-secondary" onClick={() => void loadSessions()} type="button">
            Refresh sessions
          </button>
          <Link className="button button-secondary" to="/app">
            Back to session home
          </Link>
        </div>

        {loading ? (
          <div className="note-card">
            <strong>Loading sessions...</strong>
          </div>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <article
                className={`session-card ${session.current ? 'session-card-current' : ''}`}
                key={session.sessionId}
              >
                <div className="session-card-header">
                  <div>
                    <h4>
                      {session.current ? 'Current session' : session.active ? 'Active session' : 'Recent session'}
                    </h4>
                    <p>{session.current ? 'This browser session' : session.revocationReason ?? 'Stored device session'}</p>
                  </div>
                  <div className="session-badges">
                    {session.current ? <span className="session-badge">Current</span> : null}
                    <span
                      className={`session-badge ${
                        session.active ? 'session-badge-active' : 'session-badge-inactive'
                      }`}
                    >
                      {session.active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                </div>

                <dl className="definition-list compact">
                  <div>
                    <dt>Session ID</dt>
                    <dd>
                      <code>{session.sessionId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateTime(session.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Last activity</dt>
                    <dd>{formatDateTime(session.lastActivityAt)}</dd>
                  </div>
                  <div>
                    <dt>Absolute expiry</dt>
                    <dd>{formatDateTime(session.absoluteExpiresAt)}</dd>
                  </div>
                  <div>
                    <dt>Revoked at</dt>
                    <dd>{formatDateTime(session.revokedAt)}</dd>
                  </div>
                  <div>
                    <dt>Revocation reason</dt>
                    <dd>{session.revocationReason ?? 'Not revoked'}</dd>
                  </div>
                </dl>

                <div className="button-row">
                  <button
                    className="button"
                    disabled={session.current || !session.active || revokingSessionId === session.sessionId}
                    onClick={() => void handleRevoke(session)}
                    type="button"
                  >
                    {revokingSessionId === session.sessionId ? 'Revoking...' : 'Revoke session'}
                  </button>
                </div>

                {session.current ? (
                  <p className="session-note">The current session cannot be revoked from this screen.</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
