import { Link } from 'react-router-dom';
import { FrontendAccessProfile, FrontendPermission } from '../access/access-control';

export function UnauthorizedRouteState({
  title,
  message,
  permission,
  profile,
}: {
  title: string;
  message: string;
  permission: FrontendPermission;
  profile: FrontendAccessProfile;
}) {
  return (
    <div className="page-grid">
      <section className="hero-card unauthorized-hero">
        <span className="eyebrow">403</span>
        <h2>{title}</h2>
        <p>{message}</p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Permission denied</h3>
          <p>
            This page is intentionally different from the 404 route. The route exists, but the current
            access profile does not include the permission required to open it.
          </p>
        </div>

        <dl className="definition-list compact">
          <div>
            <dt>Current role</dt>
            <dd>{profile.roleLabel}</dd>
          </div>
          <div>
            <dt>Branch scope</dt>
            <dd>{profile.branchScopeLabel}</dd>
          </div>
          <div>
            <dt>Required permission</dt>
            <dd>
              <code>{permission}</code>
            </dd>
          </div>
          <div>
            <dt>Allowed landing page</dt>
            <dd>
              <code>{profile.defaultRoute}</code>
            </dd>
          </div>
        </dl>

        <div className="button-row">
          <Link className="button" to={profile.defaultRoute}>
            Go to my home
          </Link>
          <Link className="button button-secondary" to="/app/home">
            Open shared home
          </Link>
        </div>
      </section>
    </div>
  );
}
