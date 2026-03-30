import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type AnalyticsBacklogDrilldownResponse,
  type AnalyticsComplianceDrilldownResponse,
  type AnalyticsDashboardSummaryResponse,
  type AnalyticsReadinessDrilldownResponse,
  type AnalyticsUtilizationSummaryResponse,
  type BranchSummary,
  type ConfigurationPage,
  fetchAnalyticsBacklogDrilldown,
  fetchAnalyticsCaregiverUtilization,
  fetchAnalyticsComplianceDrilldown,
  fetchAnalyticsDashboardSummary,
  fetchAnalyticsRevenueDrilldown,
  fetchBranches,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  AnalyticsAuditCallout,
  AnalyticsModuleState,
  AnalyticsPanel,
  AnalyticsStatusBanner,
  AnalyticsWorkspaceGrid,
  AnalyticsWorkspaceShell,
} from '../components/AnalyticsWorkspaceFoundation';

const EMPTY_BACKLOG: ConfigurationPage<AnalyticsBacklogDrilldownResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_REVENUE: ConfigurationPage<AnalyticsReadinessDrilldownResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_COMPLIANCE: ConfigurationPage<AnalyticsComplianceDrilldownResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_UTILIZATION: ConfigurationPage<AnalyticsUtilizationSummaryResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

function currentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

function branchName(branches: BranchSummary[], branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }

  return branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
}

function analyticsAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function AnalyticsCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [summary, setSummary] = useState<AnalyticsDashboardSummaryResponse | null>(null);
  const [backlog, setBacklog] =
    useState<ConfigurationPage<AnalyticsBacklogDrilldownResponse>>(EMPTY_BACKLOG);
  const [revenue, setRevenue] =
    useState<ConfigurationPage<AnalyticsReadinessDrilldownResponse>>(EMPTY_REVENUE);
  const [compliance, setCompliance] =
    useState<ConfigurationPage<AnalyticsComplianceDrilldownResponse>>(EMPTY_COMPLIANCE);
  const [utilization, setUtilization] =
    useState<ConfigurationPage<AnalyticsUtilizationSummaryResponse>>(EMPTY_UTILIZATION);
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');
  const [snapshotDate, setSnapshotDate] = useState(currentDateValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const canViewWorkspace = canAccessPermission(profile, 'view_analytics_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');
  const canViewScheduling = canAccessPermission(profile, 'view_scheduling_workspace');
  const canViewReviewWorkspace = canAccessPermission(profile, 'view_review_workspace');
  const canViewRevenueWorkspace = canAccessPermission(profile, 'view_revenue_readiness_workspace');
  const canViewComplianceWorkspace = canAccessPermission(profile, 'view_compliance_workspace');

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setUnauthorized(false);

      try {
        const [branchList, summaryResponse, backlogResponse, utilizationResponse, revenueResponse, complianceResponse] =
          await Promise.all([
            fetchBranches(authContext),
            fetchAnalyticsDashboardSummary({
              ...authContext,
              branchId: branchValue(branchId),
              snapshotDate,
            }),
            fetchAnalyticsBacklogDrilldown({
              ...authContext,
              branchId: branchValue(branchId),
              snapshotDate,
              page: 0,
              size: 8,
            }),
            fetchAnalyticsCaregiverUtilization({
              ...authContext,
              branchId: branchValue(branchId),
              snapshotDate,
              page: 0,
              size: 8,
            }),
            fetchAnalyticsRevenueDrilldown({
              ...authContext,
              branchId: branchValue(branchId),
              snapshotDate,
              readinessStatus: 'ALL',
              page: 0,
              size: 8,
            }),
            fetchAnalyticsComplianceDrilldown({
              ...authContext,
              branchId: branchValue(branchId),
              readinessStatus: 'ALL',
              page: 0,
              size: 8,
            }),
          ]);

        setBranches(branchList);
        setSummary(summaryResponse);
        setBacklog(backlogResponse);
        setUtilization(utilizationResponse);
        setRevenue(revenueResponse);
        setCompliance(complianceResponse);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the analytics command center right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, branchId, canViewWorkspace, snapshotDate, state.status]);

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE15-10"
          title="Analytics command center is not available for this role."
          message="Only authorized leadership and operations roles can open the Epic 15 command-center summary."
          primaryLabel="Back to analytics"
          primaryLink="/app/analytics"
        />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE15-10"
          title="This analytics command center is not available for your current scope."
          message="The backend denied this Epic 15 summary route for the current permission or branch scope."
          primaryLabel="Back to analytics"
          primaryLink="/app/analytics"
        />
      </div>
    );
  }

  const dashboardSnapshot = summary?.dashboardSnapshot;
  const blockedRevenue = revenue.content.filter((item) => item.readinessStatus === 'BLOCKED');
  const warningRevenue = revenue.content.filter((item) => item.readinessStatus === 'WARNING');
  const nonCompliantPatients = compliance.content.filter(
    (item) => item.readinessStatus === 'NON_COMPLIANT',
  );
  const riskPatients = compliance.content.filter((item) => item.activeRiskReminderCount > 0);
  const overdueBacklog = backlog.content.filter((item) => item.overdue);
  const returnedBacklog = backlog.content.filter((item) => item.status === 'RETURNED_FOR_FIX');
  const highUtilization = utilization.content.filter(
    (item) => item.utilizationPosture === 'HIGH' || item.utilizationPosture === 'OVERLOADED',
  );

  return (
    <AnalyticsWorkspaceShell
      eyebrow="Frontend Stories FE15-10 · FE15-11 · FE15-12 · FE15-13"
      title="Analytics command center"
      description="Leadership-facing Epic 15 visibility keeps operational, backlog, utilization, revenue, and compliance signals easy to triage without reopening every detailed workspace."
    >
      <AnalyticsWorkspaceGrid>
        <AnalyticsPanel
          title="Command-center filters"
          description="Branch and snapshot-date filtering keep the summary focused on the correct operational window."
        >
          <div className="analytics-filter-grid">
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
            <label className="field">
              <span>Snapshot date</span>
              <input
                className="input"
                type="date"
                value={snapshotDate}
                onChange={(event) => setSnapshotDate(event.target.value)}
              />
            </label>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Leadership summary"
          description="The command center keeps the top operational and business signals visible before anyone opens a drilldown."
        >
          {loading ? <p className="session-note">Loading analytics command center...</p> : null}
          {error ? (
            <AnalyticsModuleState title="Analytics command center failed" description={error} variant="error" />
          ) : null}
          {!loading && !error && dashboardSnapshot ? (
            <div className="analytics-summary-grid">
              <AnalyticsStatusBanner
                status={`${dashboardSnapshot.todaysVisitCount} today’s visits`}
                summary="Current scheduled visit volume for the selected branch and date."
                tone="info"
              />
              <AnalyticsStatusBanner
                status={`${dashboardSnapshot.qaBacklogCount} QA backlog`}
                summary="Review backlog still requiring coordinator follow-up."
                tone={dashboardSnapshot.qaBacklogCount > 0 ? 'warning' : 'success'}
              />
              <AnalyticsStatusBanner
                status={`${highUtilization.length} utilization pressure`}
                summary="Caregiver rows currently carrying high or overloaded posture."
                tone={highUtilization.length > 0 ? 'warning' : 'success'}
              />
              <AnalyticsStatusBanner
                status={`${dashboardSnapshot.revenueBlockedCount} revenue blocked`}
                summary="Blocked readiness rows that still need Epic 14 follow-up."
                tone={dashboardSnapshot.revenueBlockedCount > 0 ? 'warning' : 'success'}
              />
              <AnalyticsStatusBanner
                status={`${dashboardSnapshot.complianceExceptionCount} compliance exceptions`}
                summary="Open patient compliance issues still visible from Epic 11."
                tone={dashboardSnapshot.complianceExceptionCount > 0 ? 'warning' : 'success'}
              />
            </div>
          ) : null}
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Actionable lanes"
          description="Each lane routes leadership into the right Epic 15 drilldown or source workspace without exposing unnecessary record detail."
        >
          {!loading && !error ? (
            <div className="analytics-command-grid">
              <Link className="analytics-detail-card analytics-command-link" to="/app/analytics/operational">
                <strong>Operational</strong>
                <p>
                  {dashboardSnapshot?.unfilledVisitCount ?? 0} unfilled · {dashboardSnapshot?.lateStartCount ?? 0} late ·{' '}
                  {dashboardSnapshot?.missedVisitCount ?? 0} missed
                </p>
                <span>Open operational drilldown</span>
              </Link>

              <Link className="analytics-detail-card analytics-command-link" to="/app/analytics">
                <strong>Backlog</strong>
                <p>
                  {overdueBacklog.length} overdue · {returnedBacklog.length} returned for fix
                </p>
                <span>Open dashboard backlog lane</span>
              </Link>

              <Link
                className="analytics-detail-card analytics-command-link"
                to="/app/analytics/caregiver-utilization"
              >
                <strong>Utilization</strong>
                <p>
                  {utilization.content.length} caregiver rows · {highUtilization.length} high-pressure rows
                </p>
                <span>Open caregiver utilization</span>
              </Link>

              <Link className="analytics-detail-card analytics-command-link" to="/app/analytics/readiness">
                <strong>Readiness</strong>
                <p>
                  {blockedRevenue.length} blocked revenue · {warningRevenue.length} warning revenue ·{' '}
                  {nonCompliantPatients.length} non-compliant patients
                </p>
                <span>Open revenue and compliance drilldown</span>
              </Link>
            </div>
          ) : null}
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Cross-workspace links"
          description="The command center keeps source routing explicit so leadership can step into the right operational workspace when needed."
        >
          {!loading && !error ? (
            <div className="analytics-command-grid">
              <article className="analytics-detail-card">
                <strong>Scheduling and QA</strong>
                <p>
                  {dashboardSnapshot?.documentationAgingCount ?? 0} documentation aging · {backlog.content.length} backlog rows
                </p>
                <div className="analytics-table-link-cluster">
                  <Link to="/app/analytics/operational">Epic 15 operational drilldown</Link>
                  {canViewScheduling ? <Link to="/app/scheduling">Epic 5 scheduling</Link> : null}
                  {canViewReviewWorkspace ? <Link to="/app/review/command-center">Epic 10 review</Link> : null}
                </div>
              </article>

              <article className="analytics-detail-card">
                <strong>Revenue and compliance</strong>
                <p>
                  {blockedRevenue.length} blocked revenue rows · {riskPatients.length} risk-driven compliance rows
                </p>
                <div className="analytics-table-link-cluster">
                  <Link to="/app/analytics/readiness">Epic 15 readiness drilldown</Link>
                  {canViewRevenueWorkspace ? <Link to="/app/revenue-readiness/command-center">Epic 14 revenue</Link> : null}
                  {canViewComplianceWorkspace ? (
                    <Link to="/app/compliance/command-center">Epic 11 compliance</Link>
                  ) : null}
                </div>
              </article>
            </div>
          ) : null}
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Audit and privacy context"
          description="This command center keeps patient, caregiver, payer, and branch detail minimal, while authorized users can still jump into matching audit activity for analytics refresh operations."
        >
          <AnalyticsModuleState
            title="Privacy-aware analytics summary"
            description="Leadership triage stays focused on branch counts, posture, and route decisions. It does not expose internal-only backend metadata or detailed patient and caregiver records unless the user intentionally opens the source workspace."
            variant="readonly"
          />
          {canViewAudit ? (
            <AnalyticsAuditCallout
              title="Analytics audit links"
              body="Snapshot generation, metric refresh, backlog refresh, utilization refresh, revenue refresh, and compliance refresh are controlled backend operations. Use the audit workspace when you need the full action trail."
              links={[
                {
                  to: analyticsAuditHref('ANALYTICS_METRIC_REFRESH_TRIGGERED'),
                  label: 'Refresh request audit activity',
                },
                {
                  to: analyticsAuditHref('ANALYTICS_DASHBOARD_SNAPSHOT_GENERATED'),
                  label: 'Dashboard snapshot audit activity',
                },
                {
                  to: analyticsAuditHref('ANALYTICS_QA_BACKLOG_SUMMARY_REFRESHED'),
                  label: 'Backlog audit activity',
                },
                {
                  to: analyticsAuditHref('ANALYTICS_REVENUE_READINESS_SUMMARY_REFRESHED'),
                  label: 'Revenue summary audit activity',
                },
              ]}
            />
          ) : null}
        </AnalyticsPanel>
      </AnalyticsWorkspaceGrid>
    </AnalyticsWorkspaceShell>
  );
}
