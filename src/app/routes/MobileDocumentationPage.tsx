import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchMobileHome,
  fetchMobileVisitDetail,
  loadVisitDocumentationForVisit,
  type MobileVisitDetailResponse,
  type VisitDocumentationAggregate,
} from '../auth/session-api';
import { MobileAppShell, MobileModuleState, MobilePanel } from '../components/MobileWorkspaceFoundation';

export function MobileDocumentationPage() {
  const { state } = useAuth();
  const { visitId } = useParams<{ visitId: string }>();
  const [visitDetail, setVisitDetail] = useState<MobileVisitDetailResponse | null>(null);
  const [documentation, setDocumentation] = useState<VisitDocumentationAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !visitId) {
      return;
    }
    const resolvedVisitId = visitId;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [home, detail] = await Promise.all([
          fetchMobileHome({
            ...authContext,
            day: new Date().toISOString().slice(0, 10),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
          }),
          fetchMobileVisitDetail({
            ...authContext,
            visitId: resolvedVisitId,
          }),
        ]);
        setVisitDetail(detail);
        try {
          const documentationAggregate = await loadVisitDocumentationForVisit({
            ...authContext,
            visitOccurrenceId: resolvedVisitId,
          });
          setDocumentation(documentationAggregate);
        } catch (documentationError) {
          if (documentationError instanceof ApiError && documentationError.status === 404) {
            setDocumentation(null);
          } else {
            throw documentationError;
          }
        }
        if (!home.visits.some((item) => item.visitId === resolvedVisitId)) {
          setError('This visit is not currently present in the caregiver mobile assignment list.');
        }
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the mobile documentation route right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, state.status, visitId]);

  return (
    <MobileAppShell
      eyebrow="Epic 8 Documentation"
      title="Visit documentation"
      description="This new mobile route keeps documentation inside the visit workflow while using the shared Epic 8 draft/read-only route model."
      syncState="idle"
      syncMessage="Documentation route foundation uses live backend visit and documentation APIs."
      navItems={[
        { to: '/mobile', label: 'Today' },
        { to: visitId ? `/mobile/visits/${visitId}` : '/mobile', label: 'Visit' },
        { to: visitId ? `/mobile/visits/${visitId}/documentation` : '/mobile', label: 'Documentation' },
      ]}
    >
      <MobilePanel
        title={visitDetail?.patientSummary.patientDisplaySummary ?? 'Visit documentation'}
        description="Phase A establishes the route, shared state treatment, and backend wiring before the full field-entry experience arrives."
      >
        {loading ? <p className="session-note">Loading mobile documentation...</p> : null}
        {error ? <MobileModuleState title="Documentation route unavailable" description={error} variant="error" /> : null}
        {!loading && !error && !documentation ? (
          <MobileModuleState
            title="No documentation record yet"
            description="The caregiver-facing documentation route is now in place, but no Epic 8 record exists for this visit yet."
            variant="empty"
          />
        ) : null}
        {documentation ? (
          <div className="mobile-documentation-summary">
            <strong>{documentation.record.status}</strong>
            <p>
              {documentation.fieldResponses.length} field responses · {documentation.taskResponses.length} tasks ·{' '}
              {documentation.attachmentLinks.length} linked artifacts
            </p>
          </div>
        ) : null}
        <div className="button-row">
          {visitId ? (
            <Link className="button button-secondary" to={`/mobile/visits/${visitId}`}>
              Back to visit
            </Link>
          ) : null}
          {documentation ? (
            <Link
              className="button button-secondary"
              to={`/app/documentation/records/${documentation.record.id}/printable`}
            >
              Open printable summary
            </Link>
          ) : null}
        </div>
      </MobilePanel>
    </MobileAppShell>
  );
}
