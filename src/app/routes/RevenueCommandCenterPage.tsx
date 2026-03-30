import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  type ConfigurationPage,
  type RevenueExceptionFlagResponse,
  type RevenueReadinessSummaryResponse,
  fetchBranches,
  fetchRevenueExceptionFlags,
  fetchRevenueReadinessList,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  RevenueAuditCallout,
  RevenueModuleState,
  RevenuePanel,
  RevenueStatusBanner,
  RevenueWorkspaceGrid,
  RevenueWorkspaceShell,
} from '../components/RevenueReadinessWorkspaceFoundation';

const EMPTY_PAGE: ConfigurationPage<RevenueReadinessSummaryResponse> = {
  content: [],
  page: 0,
  size: 100,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_EXCEPTION_PAGE: ConfigurationPage<RevenueExceptionFlagResponse> = {
  content: [],
  page: 0,
  size: 100,
  totalElements: 0,
  totalPages: 0,
};

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

function branchLabel(branchNames: Map<string, string>, branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }
  return branchNames.get(branchId) ?? 'Unknown branch';
}

function humanizeToken(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
}

function auditActionLink(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function RevenueCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [readinessPage, setReadinessPage] =
    useState<ConfigurationPage<RevenueReadinessSummaryResponse>>(EMPTY_PAGE);
  const [exceptionPage, setExceptionPage] =
    useState<ConfigurationPage<RevenueExceptionFlagResponse>>(EMPTY_EXCEPTION_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const canViewWorkspace = canAccessPermission(profile, 'view_revenue_readiness_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const [branchList, readinessResponse, exceptionResponse] = await Promise.all([
          fetchBranches(authContext),
          fetchRevenueReadinessList({
            ...authContext,
            branchId: branchValue(branchId),
            page: 0,
            size: 100,
          }),
          fetchRevenueExceptionFlags({
            ...authContext,
            branchId: branchValue(branchId),
            page: 0,
            size: 100,
          }),
        ]);
        setBranches(branchList);
        setReadinessPage(readinessResponse);
        setExceptionPage(exceptionResponse);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the revenue summary right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, branchId, canViewWorkspace, state.status]);

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE14-10"
          title="Revenue summary is not available for this role."
          message="Only authorized finance and operations roles can open the coordinator-facing Epic 14 revenue summary."
          primaryLabel="Back to revenue readiness"
          primaryLink="/app/revenue-readiness"
        />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE14-10"
          title="This revenue summary is not available for your current scope."
          message="The backend denied this Epic 14 summary route for the current permission or branch scope."
          primaryLabel="Back to revenue readiness"
          primaryLink="/app/revenue-readiness"
        />
      </div>
    );
  }

  const blockedReadiness = readinessPage.content.filter((item) => item.readinessStatus === 'BLOCKED');
  const activeExceptions = exceptionPage.content.filter((item) => !item.clearedAt);
  const missingSignatureFlags = activeExceptions.filter(
    (item) => item.exceptionType === 'MISSING_SIGNATURE',
  );
  const completionFailureFlags = activeExceptions.filter(
    (item) =>
      item.exceptionType === 'INCOMPLETE_VISIT' ||
      item.exceptionType === 'MISSING_DOCUMENTATION',
  );
  const authorizationWarningFlags = activeExceptions.filter(
    (item) => item.exceptionType === 'AUTHORIZATION_ISSUE',
  );

  const firstBlockedVisit = blockedReadiness[0]?.visitOccurrenceId ?? null;
  const firstMissingSignatureVisit =
    missingSignatureFlags.find((item) => item.targetType === 'VISIT')?.targetId ?? null;
  const firstAuthorizationTarget =
    authorizationWarningFlags.find((item) => item.targetType !== 'VISIT')?.targetId ?? null;

  return (
    <RevenueWorkspaceShell
      eyebrow="Frontend Stories FE14-10 · FE14-11 · FE14-12 · FE14-13"
      title="Revenue command center"
      description="Coordinator-facing Epic 14 visibility keeps blocked visits, missing signatures, completion failures, and authorization pressure visible without turning the finance summary into a full detail workspace."
    >
      <RevenueWorkspaceGrid>
        <RevenuePanel
          title="Command-center filters"
          description="Branch filtering keeps the finance summary focused on the right operational scope."
        >
          <div className="revenue-filter-grid">
            <label className="field">
              <span>Branch</span>
              <select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </RevenuePanel>

        <RevenuePanel
          title="Revenue summary"
          description="These counts keep the highest-risk Epic 14 finance issues visible before anyone opens a detail or export route."
        >
          {loading ? <p className="session-note">Loading revenue summary...</p> : null}
          {error ? (
            <RevenueModuleState title="Revenue summary failed" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="revenue-summary-grid">
              <RevenueStatusBanner
                status={`${blockedReadiness.length} blocked readiness`}
                summary="Blocked visits should be resolved before payroll or invoice handoff."
                tone={blockedReadiness.length > 0 ? 'warning' : 'success'}
              />
              <RevenueStatusBanner
                status={`${missingSignatureFlags.length} missing signature`}
                summary="Signature issues often point back to Epic 7 EVV or visit-signoff gaps."
                tone={missingSignatureFlags.length > 0 ? 'warning' : 'success'}
              />
              <RevenueStatusBanner
                status={`${completionFailureFlags.length} completion failure`}
                summary="Incomplete or missing documentation remains visible as an upstream finance blocker."
                tone={completionFailureFlags.length > 0 ? 'warning' : 'success'}
              />
              <RevenueStatusBanner
                status={`${authorizationWarningFlags.length} authorization warning`}
                summary="Authorization pressure should be reviewed before exports are generated."
                tone={authorizationWarningFlags.length > 0 ? 'warning' : 'success'}
              />
            </div>
          ) : null}
        </RevenuePanel>

        <RevenuePanel
          title="Actionable lanes"
          description="Each lane routes coordinators into the exact Epic 14 surface they need rather than forcing a manual search from the top of the workspace."
        >
          {!loading && !error ? (
            <div className="revenue-command-list">
              <Link className="revenue-workspace-card revenue-workspace-card-available" to="/app/revenue-readiness">
                <strong>Open readiness queue</strong>
                <p>Review the full queue of blocked, warning, and ready visits.</p>
                <span>Open route</span>
              </Link>
              <Link className="revenue-workspace-card revenue-workspace-card-available" to="/app/revenue-readiness/exceptions">
                <strong>Open blocker lane</strong>
                <p>Review signature, completion, payer, and authorization blocker detail together.</p>
                <span>Open route</span>
              </Link>
              {firstBlockedVisit ? (
                <Link
                  className="revenue-workspace-card revenue-workspace-card-available"
                  to={`/app/revenue-readiness/visits/${firstBlockedVisit}`}
                >
                  <strong>Open first blocked visit</strong>
                  <p>Jump directly into the highest-urgency readiness detail route currently visible.</p>
                  <span>Open route</span>
                </Link>
              ) : null}
              {firstMissingSignatureVisit ? (
                <Link
                  className="revenue-workspace-card revenue-workspace-card-available"
                  to={`/app/revenue-readiness/visits/${firstMissingSignatureVisit}`}
                >
                  <strong>Open signature issue</strong>
                  <p>Route directly into a visit carrying an active missing-signature blocker.</p>
                  <span>Open route</span>
                </Link>
              ) : null}
              {firstAuthorizationTarget ? (
                <Link
                  className="revenue-workspace-card revenue-workspace-card-available"
                  to={`/app/revenue-readiness/authorizations/${firstAuthorizationTarget}`}
                >
                  <strong>Open authorization warning</strong>
                  <p>Review authorization usage posture for the first active authorization issue.</p>
                  <span>Open route</span>
                </Link>
              ) : null}
            </div>
          ) : null}
        </RevenuePanel>

        <RevenuePanel
          title="Minimal finance context"
          description="The command center keeps the visible context intentionally terse so the route remains privacy-aware while still useful for triage."
        >
          {!loading && !error && blockedReadiness.length === 0 && activeExceptions.length === 0 ? (
            <RevenueModuleState
              title="No revenue pressure items"
              description="The Epic 14 command center remains available even when there are no active blocked visits or blocker flags."
              variant="empty"
            />
          ) : null}
          {!loading && !error && (blockedReadiness.length > 0 || activeExceptions.length > 0) ? (
            <div className="revenue-command-grid">
              <div className="revenue-command-lane">
                <strong>Blocked visits</strong>
                <div className="revenue-command-list">
                  {blockedReadiness.slice(0, 4).map((item) => (
                    <Link
                      className="revenue-workspace-card revenue-workspace-card-available"
                      key={item.visitOccurrenceId}
                      to={`/app/revenue-readiness/visits/${item.visitOccurrenceId}`}
                    >
                      <strong>Visit {item.visitOccurrenceId}</strong>
                      <p>{item.payerName ?? 'Unlinked payer context'}</p>
                      <span>
                        {branchLabel(branchNames, item.branchId)} ·
                        {' '}
                        {formatDateTime(item.evaluatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="revenue-command-lane">
                <strong>Active blockers</strong>
                <div className="revenue-command-list">
                  {activeExceptions.slice(0, 4).map((item) => (
                    <article className="revenue-workspace-card revenue-workspace-card-available" key={item.id}>
                      <strong>{humanizeToken(item.exceptionType)}</strong>
                      <p>{item.summary}</p>
                      <span>
                        {item.targetType === 'VISIT' ? `Visit ${item.targetId}` : `Authorization ${item.targetId}`}
                        {' · '}
                        {humanizeToken(item.severity)}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </RevenuePanel>

        <RevenuePanel
          title="Audit-aware revenue operations"
          description="The command center keeps finance review concise, while authorized users can still jump into the audit trail for controlled Epic 14 actions."
        >
          <RevenueModuleState
            title="Controlled finance operations"
            description="Readiness recalculation, authorization refresh, and export generation are controlled backend operations. This summary keeps patient and payer context minimal while leaving the audit trail accessible when needed."
            variant="info"
          />
          {canViewAudit ? (
            <RevenueAuditCallout
              title="Revenue audit links"
              body="Use the audit workspace when you need to confirm who recalculated readiness, refreshed authorization usage, or generated an export."
              links={[
                {
                  to: auditActionLink('REVENUE_READINESS_RECALCULATED'),
                  label: 'Revenue readiness audit activity',
                },
                {
                  to: auditActionLink('REVENUE_EXPORT_GENERATED'),
                  label: 'Revenue export audit activity',
                },
              ]}
            />
          ) : null}
        </RevenuePanel>
      </RevenueWorkspaceGrid>
    </RevenueWorkspaceShell>
  );
}
