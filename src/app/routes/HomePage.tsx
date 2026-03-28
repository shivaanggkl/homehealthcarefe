import { useAccess } from '../access/access-context';
import { APP_ROUTES, canAccessPermission } from '../access/access-control';
import { useAuth } from '../auth/auth-context';

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function HomePage() {
  const { state } = useAuth();
  const { profile } = useAccess();

  if (state.status !== 'authenticated') {
    return null;
  }

  const roleHeadline: Record<typeof profile.role, string> = {
    AGENCY_OWNER: 'Agency-wide security and operational controls are available from your home screen.',
    BRANCH_ADMIN: 'Branch administration tools and security preferences are prioritized for this role.',
    SCHEDULER_COORDINATOR: 'Scheduling-oriented access is branch-limited, with quick access to personal security tools.',
    CAREGIVER: 'Your home focuses on personal security and session controls while agency-admin tools stay hidden.',
    QA_CLINICAL_REVIEWER: 'Quality-review access is branch-scoped, with a limited operational home surface.',
    BILLING_BACK_OFFICE: 'Back-office access is focused on personal security and authenticated session management.',
    READ_ONLY_AUDITOR: 'Audit-oriented access keeps the home screen minimal and avoids management actions.',
  };

  const roleGuidance: Record<typeof profile.role, string> = {
    AGENCY_OWNER:
      'You land in consolidated security settings by default because this role can review and change agency-wide security posture.',
    BRANCH_ADMIN:
      'You land in admin notifications by default because this role typically needs operational alert visibility without agency-owner-only settings.',
    SCHEDULER_COORDINATOR:
      'You land on shared home because branch-limited operational roles do not get admin settings by default.',
    CAREGIVER:
      'You land in MFA settings by default because personal account security is the most relevant actionable area.',
    QA_CLINICAL_REVIEWER:
      'You land on shared home because your role is permission-limited and should not be pushed toward admin workflows.',
    BILLING_BACK_OFFICE:
      'You land on shared home because your role does not include security administration permissions.',
    READ_ONLY_AUDITOR:
      'You land on shared home because the role is intentionally read-oriented and restricted from management settings.',
  };

  const accessibleRoutes = APP_ROUTES.filter((route) => canAccessPermission(profile, route.permission));

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">FE-25 role home</span>
        <h2>{roleHeadline[profile.role]}</h2>
        <p>
          {roleGuidance[profile.role]} This home still uses the backend session contract, but the destination
          and available navigation now vary by the active role and permission profile.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>My landing behavior</h3>
          <p>FE-25 uses the active role profile to decide where `/app` redirects after login or reload.</p>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Current role</dt>
            <dd>{profile.roleLabel}</dd>
          </div>
          <div>
            <dt>Default landing route</dt>
            <dd>
              <code>{profile.defaultRoute}</code>
            </dd>
          </div>
          <div>
            <dt>Accessible navigation items</dt>
            <dd>{accessibleRoutes.length}</dd>
          </div>
          <div>
            <dt>Unauthorized state behavior</dt>
            <dd>Permission denied routes render `403` UI instead of falling through to `404`.</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Available destinations</h3>
          <p>These routes are currently allowed for the active role profile.</p>
        </div>
        <div className="session-list">
          {accessibleRoutes.map((route) => (
            <article className="session-card" key={route.path}>
              <div className="session-card-header">
                <div>
                  <h4>{route.navLabel}</h4>
                  <p>{route.description}</p>
                </div>
                <div className="session-badges">
                  <span className="session-badge session-badge-active">Allowed</span>
                </div>
              </div>
              <dl className="definition-list compact">
                <div>
                  <dt>Route</dt>
                  <dd>
                    <code>{route.path}</code>
                  </dd>
                </div>
                <div>
                  <dt>Permission</dt>
                  <dd>
                    <code>{route.permission}</code>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Session Snapshot</h3>
          <p>
            Directly reflects the current backend auth session contract that still underpins all role-based
            landing behavior.
          </p>
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
          <h3>Branch and permission profile</h3>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Branch scope</dt>
            <dd>{profile.branchScopeLabel}</dd>
          </div>
          <div>
            <dt>Assigned branches</dt>
            <dd>{profile.assignedBranchIds.length > 0 ? profile.assignedBranchIds.join(', ') : 'None'}</dd>
          </div>
          <div>
            <dt>Profile source</dt>
            <dd>{profile.source === 'override' ? 'Frontend override' : 'Safe fallback profile'}</dd>
          </div>
          <div>
            <dt>Why this matters</dt>
            <dd>Branch-limited and agency-wide roles now land in different places and see different nav states.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
