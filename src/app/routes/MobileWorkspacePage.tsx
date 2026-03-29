import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchMobileHome,
  fetchMobileRoute,
  fetchMobileVisitDetail,
  MobileHomeResponse,
  MobileRouteProjectionResponse,
  MobileVisitDetailResponse,
} from '../auth/session-api';
import {
  MobileActionFooter,
  MobileAppShell,
  MobileModuleState,
  MobileMutationFrame,
  MobilePanel,
  MobileSyncVisualState,
  MobileVisitCard,
  MobileVisitDetailLayout,
} from '../components/MobileWorkspaceFoundation';

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function summarizeAuthSource(kind: 'cookie' | 'storage') {
  return kind === 'storage' ? 'Local dev header mode' : 'Secure cookie mode';
}

function mobileAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function MobileWorkspacePage() {
  const { state, refreshAuth, logout } = useAuth();
  const { profile } = useAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const { visitId } = useParams<{ visitId: string }>();
  const [home, setHome] = useState<MobileHomeResponse | null>(null);
  const [routeProjection, setRouteProjection] = useState<MobileRouteProjectionResponse | null>(null);
  const [visitDetail, setVisitDetail] = useState<MobileVisitDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<MobileSyncVisualState>('idle');
  const [syncMessage, setSyncMessage] = useState('Field app is ready. Pull fresh data when you need it.');
  const [logoutPending, setLogoutPending] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const day = useMemo(() => toIsoDate(new Date()), []);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
    [],
  );

  const mobileHomePath = '/mobile';
  const inMessages = location.pathname === '/mobile/messages';
  const inAccount = location.pathname === '/mobile/account';
  const inVisit = Boolean(visitId);

  const nextVisit = home?.visits[0] ?? null;
  const currentVisit =
    home?.visits.find((item) => item.executionStatus === 'IN_PROGRESS') ?? nextVisit ?? null;
  const canExecuteVisits = canAccessPermission(profile, 'execute_mobile_visits');
  const canViewMessages = canAccessPermission(profile, 'view_mobile_messages');

  async function loadMobileData(mode: 'initial' | 'manual') {
    if (state.status !== 'authenticated') {
      return;
    }

    if (mode === 'manual') {
      setSyncState('syncing');
      setSyncMessage('Refreshing field data from the backend mobile APIs.');
    }

    setLoading(mode === 'initial');
    setError(null);

    try {
      const [homeResponse, routeResponse, detailResponse] = await Promise.all([
        fetchMobileHome({
          ...authContext,
          day,
          timezone,
        }),
        fetchMobileRoute({
          ...authContext,
          day,
          timezone,
        }),
        visitId
          ? fetchMobileVisitDetail({
              ...authContext,
              visitId,
            })
          : Promise.resolve(null),
      ]);

      setHome(homeResponse);
      setRouteProjection(routeResponse);
      setVisitDetail(detailResponse);
      setSyncState('synced');
      setSyncMessage(`Field data synced for ${homeResponse.day}.`);
    } catch (fetchError) {
      const message =
        fetchError instanceof ApiError
          ? fetchError.message
          : 'Unable to load the mobile field view right now.';
      setError(message);
      setSyncState('failed');
      setSyncMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMobileData('initial');
  }, [day, timezone, visitId, authContext.accessToken, authContext.sessionId, state.status]);

  async function handleLogout() {
    setLogoutPending(true);

    try {
      const result = await logout({
        redirectTo: '/mobile/login?loggedOut=1',
      });
      navigate(result.redirectTo, { replace: true });
    } finally {
      setLogoutPending(false);
    }
  }

  const headerAction = (
    <button className="button button-secondary" onClick={() => void loadMobileData('manual')} type="button">
      Refresh
    </button>
  );

  return (
    <MobileAppShell
      description="Caregiver-first field shell with one-tap routes into today, visit detail, messages, and account state."
      eyebrow="Epic 6 Mobile"
      headerAction={headerAction}
      navItems={[
        { to: '/mobile', label: 'Today' },
        { to: '/mobile/messages', label: 'Messages' },
        { to: '/mobile/account', label: 'Account' },
      ]}
      syncMessage={syncMessage}
      syncState={syncState}
      title="Field work"
    >
      {loading ? (
        <MobileModuleState
          description="Restoring the caregiver mobile shell and loading today's visits."
          title="Loading mobile workspace"
        />
      ) : error ? (
        <MobileModuleState
          description={error}
          title="Mobile data could not be loaded"
          variant="error"
        />
      ) : null}

      {!loading && !error && inMessages ? (
        canViewMessages ? (
          <MobileMutationFrame
            helper="The backend message APIs are live, but the full thread list and send-message workflow land in Phase C. Phase A keeps the route reachable so deep links fail cleanly instead of dumping the caregiver back to desktop screens."
            mode="read-only"
            syncMessage={syncMessage}
            syncState={syncState}
            title="Message center foundation"
          >
            <MobileActionFooter
              primaryDisabled
              primaryLabel="Thread list lands in Phase C"
              secondaryDisabled={syncState === 'syncing'}
              secondaryLabel="Recheck session"
              onSecondaryClick={() => void refreshAuth()}
            />
          </MobileMutationFrame>
        ) : (
          <MobileModuleState
            description="This caregiver profile does not currently include message-center access."
            title="Messages are not available for this role"
            variant="readonly"
          />
        )
      ) : null}

      {!loading && !error && inAccount && state.status === 'authenticated' ? (
        <div className="mobile-stack">
          <MobilePanel
            description="Mobile account state focuses on session trust, route-safe re-auth, and logout."
            title="Session bootstrap"
          >
            <dl className="mobile-summary-list">
              <div>
                <dt>Auth source</dt>
                <dd>{summarizeAuthSource(state.authSource)}</dd>
              </div>
              <div>
                <dt>Session ID</dt>
                <dd>
                  <code>{state.session.sessionId}</code>
                </dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd>
                  <code>{state.session.userId}</code>
                </dd>
              </div>
              <div>
                <dt>Forced logout</dt>
                <dd>{state.session.forcedLogoutAt}</dd>
              </div>
            </dl>
            <MobileActionFooter
              primaryLabel="Retry backend bootstrap"
              secondaryDisabled={logoutPending}
              secondaryLabel={logoutPending ? 'Signing out...' : 'Logout'}
              onPrimaryClick={() => void refreshAuth()}
              onSecondaryClick={() => void handleLogout()}
            />
          </MobilePanel>

          <MobilePanel
            description="The mobile app keeps privacy-sensitive chart data out of the shell and only shows visit-safe field context."
            title="Privacy-aware field behavior"
          >
            <p className="support-copy">
              Administrative record editing stays in the desktop app. This mobile shell only shows
              the minimum patient, route, and care context required for the assigned caregiver.
            </p>
            <p className="support-copy">
              Key execution changes are audited in the backend. Admin review lives in{' '}
              <Link className="text-link" to={mobileAuditHref('MOBILE_EXECUTION_STARTED')}>
                audit log
              </Link>
              .
            </p>
          </MobilePanel>
        </div>
      ) : null}

      {!loading && !error && inVisit && visitDetail ? (
        <div className="mobile-stack">
          <MobileVisitDetailLayout
            careInstructions={visitDetail.careInstructions}
            patientSummary={visitDetail.patientSummary}
          >
            <MobileMutationFrame
              helper="Phase A standardizes the action-footer, validation banner, and sync placement that later start/end, checklist, note, photo, and incident modules will all reuse."
              mode={canExecuteVisits ? 'editable' : 'read-only'}
              syncMessage={syncMessage}
              syncState={syncState}
              title="Visit action framework"
            >
              <MobileActionFooter
                primaryDisabled
                primaryLabel={
                  canExecuteVisits ? 'Start visit lands in Phase B' : 'Read-only mobile view'
                }
                secondaryLabel="Back to today"
                onSecondaryClick={() => navigate(mobileHomePath)}
              />
            </MobileMutationFrame>
          </MobileVisitDetailLayout>
        </div>
      ) : null}

      {!loading && !error && !inMessages && !inAccount && !inVisit ? (
        <div className="mobile-stack">
          <MobilePanel
            description="The mobile home gives the caregiver one place to see what is current, what is next, and where route order is coming from."
            title="Current focus"
            tone="accent"
          >
            {currentVisit ? (
              <MobileVisitCard
                emphasis="current"
                item={currentVisit}
                to={`/mobile/visits/${currentVisit.visitId}`}
              />
            ) : (
              <MobileModuleState
                description="No visits are currently assigned for this day."
                title="No field work scheduled"
                variant="empty"
              />
            )}
          </MobilePanel>

          <MobilePanel
            description="Today-work cards come from the backend mobile home API and stay ordered for quick handheld scanning."
            title="Today's visits"
          >
            <div className="mobile-visit-list">
              {home?.visits.length ? (
                home.visits.map((item) => (
                  <MobileVisitCard item={item} key={item.visitId} to={`/mobile/visits/${item.visitId}`} />
                ))
              ) : (
                <MobileModuleState
                  description="Assigned visits for the selected day will appear here."
                  title="No visits returned"
                  variant="empty"
                />
              )}
            </div>
          </MobilePanel>

          <MobilePanel
            description="Route order is shown in a practical field order without exposing raw routing-engine internals."
            title="Route order"
          >
            {routeProjection?.stops.length ? (
              <ol className="mobile-route-list">
                {routeProjection.stops.map((stop) => (
                  <li className="mobile-route-stop" key={stop.visitId}>
                    <div>
                      <strong>{stop.patientDisplaySummary}</strong>
                      <p>{stop.addressSummary ?? 'Address available in visit-safe summary only.'}</p>
                    </div>
                    <span className="mobile-route-order">#{stop.sortOrder}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <MobileModuleState
                description="Route projection will appear once the backend has ordered assigned visits for the caregiver."
                title="No route projection returned"
                variant="empty"
              />
            )}
          </MobilePanel>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
