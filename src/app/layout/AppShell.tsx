import { PropsWithChildren, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAccess } from '../access/access-context';
import { APP_ROUTES, canAccessPermission, NAV_SECTIONS } from '../access/access-control';
import { useAuth } from '../auth/auth-context';
import { AccessProfileCard } from '../components/AccessProfileCard';
import { BrandLogo } from '../components/BrandLogo';
import { SessionTimeoutWarning } from '../components/SessionTimeoutWarning';

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AppShell({ children }: PropsWithChildren) {
  const { state, clearLocalAuthState, refreshAuth, logout } = useAuth();
  const { profile } = useAccess();
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
          <BrandLogo className="brand-logo-shell" subtitle="Secure operations console" />
        </Link>

        <nav className="nav">
          {NAV_SECTIONS.map((section) => {
            const routes = APP_ROUTES.filter((route) => route.section === section.key);
            const hasVisibleRoute = routes.some(
              (route) =>
                canAccessPermission(profile, route.permission) || route.navBehavior === 'disabled',
            );

            if (!hasVisibleRoute) {
              return null;
            }

            return (
              <div className="nav-section" key={section.key}>
                <span className="nav-section-label">{section.label}</span>
                <div className="nav-section-links">
                  {routes.map((route) => {
                    const allowed = canAccessPermission(profile, route.permission);
                    const audienceTag =
                      route.audience === 'owner-only'
                        ? 'Owner'
                        : route.audience === 'admin'
                          ? 'Admin'
                          : null;

                    if (allowed) {
                      return (
                        <NavLink className="nav-link" key={route.path} to={route.path}>
                          <span>{route.navLabel}</span>
                          {audienceTag ? (
                            <span className={`nav-link-tag nav-link-tag-${route.audience}`}>
                              {audienceTag}
                            </span>
                          ) : null}
                        </NavLink>
                      );
                    }

                    if (route.navBehavior === 'disabled') {
                      return (
                        <span
                          aria-disabled="true"
                          className="nav-link nav-link-disabled"
                          key={route.path}
                          title={route.description}
                        >
                          <span>{route.navLabel}</span>
                          {audienceTag ? (
                            <span className={`nav-link-tag nav-link-tag-${route.audience}`}>
                              {audienceTag}
                            </span>
                          ) : null}
                        </span>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            );
          })}
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

        <section className="sidebar-card">
          <span className="eyebrow">Epic 2 Setup</span>
          <strong>Shared configuration foundation</strong>
          <p>
            Setup routes now live in one permission-aware section, ready for the Epic 2 admin
            modules to land on a consistent table and form framework.
          </p>
        </section>

        <AccessProfileCard />

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
