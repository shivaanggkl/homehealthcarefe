import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  endMobileVisitExecution,
  fetchMobileHome,
  fetchMobileRoute,
  fetchMobileVisitDetail,
  MobileHomeResponse,
  MobileRouteProjectionResponse,
  MobileVisitDetailResponse,
  MobileVisitExecutionSession,
  startMobileVisitExecution,
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

type LocationCapture =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'captured'; latitude: number; longitude: number }
  | { status: 'unavailable'; reason: string };

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function nextActionLabel(
  executionSession: MobileVisitExecutionSession | null,
  canExecuteVisits: boolean,
  actionPending: boolean,
) {
  if (!canExecuteVisits) {
    return 'Read-only mobile view';
  }

  if (actionPending) {
    return executionSession?.executionStatus === 'IN_PROGRESS' ? 'Ending visit...' : 'Starting visit...';
  }

  if (executionSession?.executionStatus === 'IN_PROGRESS') {
    return 'End visit';
  }

  if (executionSession?.executionStatus === 'COMPLETED') {
    return 'Visit completed';
  }

  return 'Start visit';
}

async function requestGeolocation(): Promise<LocationCapture> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return {
      status: 'unavailable',
      reason: 'Location is not available on this device. You can continue and the backend will record a controlled field action without coordinates.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: 'captured',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) =>
        resolve({
          status: 'unavailable',
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied. Retry location capture or continue without coordinates.'
              : 'Location capture failed. Retry or continue without coordinates if field policy allows it.',
        }),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  });
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
  const [executionSession, setExecutionSession] = useState<MobileVisitExecutionSession | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [locationCapture, setLocationCapture] = useState<LocationCapture>({ status: 'idle' });

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

  const visits = home?.visits ?? [];
  const inProgressVisit = visits.find((item) => item.executionStatus === 'IN_PROGRESS') ?? null;
  const completedVisits = visits.filter((item) => item.executionStatus === 'COMPLETED');
  const notStartedVisits = visits.filter((item) => item.executionStatus !== 'COMPLETED');
  const nextVisit =
    notStartedVisits.find((item) => item.executionStatus !== 'IN_PROGRESS') ??
    notStartedVisits[0] ??
    null;
  const currentVisit = inProgressVisit ?? nextVisit ?? null;
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
      const matchedVisitSession =
        homeResponse.visits.find((item) => item.visitId === visitId)?.executionStatus ?? null;
      setExecutionSession((previous) => {
        if (!visitId || !matchedVisitSession) {
          return previous?.executionStatus === 'COMPLETED' || previous?.executionStatus === 'IN_PROGRESS'
            ? previous
            : null;
        }

        if (!previous) {
          return null;
        }

        return {
          ...previous,
          executionStatus: matchedVisitSession,
        };
      });
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

  useEffect(() => {
    setExecutionSession(null);
    setActionError(null);
    setActionSuccess(null);
    setLocationCapture({ status: 'idle' });
  }, [visitId]);

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

  async function handleVisitExecution(action: 'start' | 'end', allowWithoutLocation = false) {
    if (!visitId || !canExecuteVisits) {
      return;
    }

    setActionPending(true);
    setActionError(null);
    setActionSuccess(null);
    setSyncState('syncing');
    setSyncMessage(
      action === 'start'
        ? 'Starting visit and capturing field state.'
        : 'Ending visit and saving completion state.',
    );

    try {
      let capture = locationCapture;
      if (!allowWithoutLocation) {
        setLocationCapture({ status: 'requesting' });
        capture = await requestGeolocation();
        setLocationCapture(capture);
        if (capture.status === 'unavailable') {
          setSyncState('queued');
          setSyncMessage(capture.reason);
          setActionPending(false);
          return;
        }
      }

      if (action === 'start') {
        const session = await startMobileVisitExecution({
          ...authContext,
          visitId,
          startedAt: new Date().toISOString(),
          startedLatitude: capture.status === 'captured' ? capture.latitude : undefined,
          startedLongitude: capture.status === 'captured' ? capture.longitude : undefined,
          startSource: 'mobile_web',
          syncStatus: 'ACCEPTED',
        });
        setExecutionSession(session);
        setActionSuccess('Visit started. The field session is now active and recorded.');
      } else {
        const targetSessionId = executionSession?.id;
        if (!targetSessionId) {
          throw new Error('No active execution session is loaded for this visit.');
        }
        const session = await endMobileVisitExecution({
          ...authContext,
          executionSessionId: targetSessionId,
          endedAt: new Date().toISOString(),
          endedLatitude: capture.status === 'captured' ? capture.latitude : undefined,
          endedLongitude: capture.status === 'captured' ? capture.longitude : undefined,
          endSource: 'mobile_web',
          syncStatus: 'ACCEPTED',
        });
        setExecutionSession(session);
        setActionSuccess('Visit ended. Today-work and route state have been refreshed.');
      }

      await loadMobileData('manual');
    } catch (executionError) {
      const message =
        executionError instanceof ApiError
          ? executionError.message
          : executionError instanceof Error
            ? executionError.message
            : 'Unable to save the visit action right now.';
      setActionError(message);
      setSyncState('failed');
      setSyncMessage(message);
    } finally {
      setActionPending(false);
    }
  }

  const headerAction = (
    <button className="button button-secondary" onClick={() => void loadMobileData('manual')} type="button">
      Refresh
    </button>
  );

  const effectiveExecutionStatus =
    executionSession?.executionStatus ??
    visits.find((item) => item.visitId === visitId)?.executionStatus ??
    null;

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
            helper="The backend message APIs are live, but the full thread list and send-message workflow land in Phase C. Phase B keeps the mobile message route reachable while today-work and visit execution become real."
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
            <MobilePanel
              description="The visit detail keeps route timing, execution state, and next action in one mobile-safe workflow."
              title="Visit execution"
            >
              <dl className="mobile-summary-list">
                <div>
                  <dt>Status</dt>
                  <dd>{effectiveExecutionStatus ?? 'Not started'}</dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>
                    {effectiveExecutionStatus === 'IN_PROGRESS'
                      ? 'End visit when field work is complete'
                      : effectiveExecutionStatus === 'COMPLETED'
                        ? 'Review and continue to the next scheduled stop'
                        : 'Start visit with current field location'}
                  </dd>
                </div>
              </dl>
              {locationCapture.status === 'requesting' ? (
                <div className="mobile-inline-note">
                  <strong>Location capture in progress</strong>
                  <p>Requesting device location before saving the field action.</p>
                </div>
              ) : null}
              {locationCapture.status === 'unavailable' ? (
                <div className="mobile-inline-note">
                  <strong>Location capture needs attention</strong>
                  <p>{locationCapture.reason}</p>
                </div>
              ) : null}
              {locationCapture.status === 'captured' ? (
                <div className="mobile-inline-note">
                  <strong>Location captured</strong>
                  <p>
                    Latitude {locationCapture.latitude.toFixed(4)}, longitude{' '}
                    {locationCapture.longitude.toFixed(4)}.
                  </p>
                </div>
              ) : null}
              {actionSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{actionSuccess}</p>
                </div>
              ) : null}
              {actionError ? (
                <MobileModuleState
                  description={actionError}
                  title="Visit action failed"
                  variant="error"
                />
              ) : null}
            </MobilePanel>

            <MobileMutationFrame
              helper="Phase B uses the real execution APIs for start and end visit, keeps location capture visible, and refreshes the mobile board after every success."
              mode={canExecuteVisits ? 'editable' : 'read-only'}
              syncMessage={syncMessage}
              syncState={syncState}
              title="Visit action framework"
            >
              <MobileActionFooter
                primaryDisabled={
                  !canExecuteVisits ||
                  actionPending ||
                  effectiveExecutionStatus === 'COMPLETED'
                }
                primaryLabel={nextActionLabel(executionSession, canExecuteVisits, actionPending)}
                primaryTone={effectiveExecutionStatus === 'IN_PROGRESS' ? 'success' : 'default'}
                secondaryLabel={
                  locationCapture.status === 'unavailable' &&
                  canExecuteVisits &&
                  effectiveExecutionStatus !== 'COMPLETED'
                    ? 'Continue without location'
                    : 'Back to today'
                }
                secondaryDisabled={actionPending}
                onPrimaryClick={() =>
                  void handleVisitExecution(
                    effectiveExecutionStatus === 'IN_PROGRESS' ? 'end' : 'start',
                  )
                }
                onSecondaryClick={() =>
                  locationCapture.status === 'unavailable' &&
                  canExecuteVisits &&
                  effectiveExecutionStatus !== 'COMPLETED'
                    ? void handleVisitExecution(
                        effectiveExecutionStatus === 'IN_PROGRESS' ? 'end' : 'start',
                        true,
                      )
                    : navigate(mobileHomePath)
                }
              />
            </MobileMutationFrame>
          </MobileVisitDetailLayout>
        </div>
      ) : null}

      {!loading && !error && !inMessages && !inAccount && !inVisit ? (
        <div className="mobile-stack">
          <MobilePanel
            description="The mobile home highlights the current field action first, then the next stop, then what is already done."
            title="Current focus"
            tone="accent"
          >
            {currentVisit ? (
              <MobileVisitCard
                emphasis={inProgressVisit ? 'current' : 'upcoming'}
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
            <div className="mobile-inline-note">
              <strong>Quick action</strong>
              <p>
                {inProgressVisit
                  ? 'Continue the in-progress visit without searching through the full list.'
                  : nextVisit
                    ? 'Open the next scheduled visit directly from the mobile home.'
                    : 'No next visit is currently queued for this day.'}
              </p>
            </div>
            <MobileActionFooter
              primaryDisabled={!currentVisit}
              primaryLabel={
                inProgressVisit
                  ? 'Continue in-progress visit'
                  : nextVisit
                    ? 'Open next visit'
                    : 'No current visit'
              }
              secondaryDisabled={!canViewMessages}
              secondaryLabel={canViewMessages ? 'Messages' : undefined}
              onPrimaryClick={() =>
                currentVisit ? navigate(`/mobile/visits/${currentVisit.visitId}`) : undefined
              }
              onSecondaryClick={() => navigate('/mobile/messages')}
            />
          </MobilePanel>

          <MobilePanel
            description="Today-work cards come from the backend mobile home API and stay ordered for quick handheld scanning."
            title="Today's visits"
          >
            <div className="mobile-visit-list">
              {visits.length ? (
                visits.map((item) => {
                  const emphasis =
                    item.executionStatus === 'COMPLETED'
                      ? 'completed'
                      : item.executionStatus === 'IN_PROGRESS'
                        ? 'current'
                        : item.visitId === nextVisit?.visitId
                          ? 'upcoming'
                          : undefined;
                  return (
                    <MobileVisitCard
                      emphasis={emphasis}
                      item={item}
                      key={item.visitId}
                      to={`/mobile/visits/${item.visitId}`}
                    />
                  );
                })
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
                      <p>
                        {stop.addressSummary ?? 'Address available in visit-safe summary only.'}
                        {' · '}
                        {formatDateTime(stop.plannedStartAt)}
                      </p>
                    </div>
                    <span className="mobile-route-order">
                      {stop.executionStatus === 'COMPLETED'
                        ? 'Done'
                        : stop.executionStatus === 'IN_PROGRESS'
                          ? 'Now'
                          : `#${stop.sortOrder}`}
                    </span>
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

          <MobilePanel
            description="The home screen keeps completion context lightweight so the caregiver can focus on the next field action."
            title="Day summary"
          >
            <dl className="mobile-summary-list">
              <div>
                <dt>In progress</dt>
                <dd>{inProgressVisit ? 1 : 0}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{completedVisits.length}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{visits.length - completedVisits.length}</dd>
              </div>
            </dl>
          </MobilePanel>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
