import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type AnalyticsBacklogDrilldownResponse,
  type AnalyticsBranchPerformanceSummaryResponse,
  type AnalyticsComplianceDrilldownResponse,
  type AnalyticsDashboardSummaryResponse,
  type AnalyticsMetricType,
  type AnalyticsOperationalDrilldownResponse,
  type AnalyticsReadinessDrilldownResponse,
  type AnalyticsUtilizationSummaryResponse,
  type BranchSummary,
  type ComplianceReadinessStatus,
  type ConfigurationPage,
  type RevenueReadinessStatus,
  fetchAnalyticsBacklogDrilldown,
  fetchAnalyticsBranchPerformance,
  fetchAnalyticsCaregiverUtilization,
  fetchAnalyticsComplianceDrilldown,
  fetchAnalyticsDashboardSummary,
  fetchAnalyticsOperationalDrilldown,
  fetchAnalyticsRevenueDrilldown,
  fetchBranches,
  refreshAnalyticsDashboard,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  AnalyticsActionRow,
  AnalyticsAuditCallout,
  AnalyticsFilterBar,
  AnalyticsModuleState,
  AnalyticsMutationNotice,
  AnalyticsPanel,
  AnalyticsSectionNavigation,
  AnalyticsStatusBanner,
  AnalyticsTable,
  AnalyticsWorkspaceGrid,
  AnalyticsWorkspaceShell,
} from '../components/AnalyticsWorkspaceFoundation';

type RouteSection =
  | 'dashboard'
  | 'operational'
  | 'branch-performance'
  | 'caregiver-utilization'
  | 'readiness';

type MutationState = 'idle' | 'saving' | 'saved' | 'retry';

const EMPTY_BRANCH_PERFORMANCE: ConfigurationPage<AnalyticsBranchPerformanceSummaryResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_UTILIZATION: ConfigurationPage<AnalyticsUtilizationSummaryResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_OPERATIONAL: ConfigurationPage<AnalyticsOperationalDrilldownResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_REVENUE: ConfigurationPage<AnalyticsReadinessDrilldownResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_BACKLOG: ConfigurationPage<AnalyticsBacklogDrilldownResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_COMPLIANCE: ConfigurationPage<AnalyticsComplianceDrilldownResponse> = {
  content: [],
  page: 0,
  size: 25,
  totalElements: 0,
  totalPages: 0,
};

function currentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function routeSection(pathname: string): RouteSection {
  if (pathname.includes('/branch-performance')) {
    return 'branch-performance';
  }
  if (pathname.includes('/caregiver-utilization')) {
    return 'caregiver-utilization';
  }
  if (pathname.includes('/readiness')) {
    return 'readiness';
  }
  if (pathname.includes('/operational')) {
    return 'operational';
  }
  return 'dashboard';
}

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

function isAnalyticsMetric(value: string | null): value is AnalyticsMetricType {
  return (
    value === 'TODAYS_VISITS' ||
    value === 'UNFILLED_VISITS' ||
    value === 'LATE_STARTS' ||
    value === 'MISSED_VISITS' ||
    value === 'DOCUMENTATION_AGING' ||
    value === 'QA_BACKLOG' ||
    value === 'CAREGIVER_UTILIZATION' ||
    value === 'BRANCH_PERFORMANCE' ||
    value === 'REVENUE_READINESS' ||
    value === 'COMPLIANCE_EXCEPTIONS'
  );
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

function bannerTone(value: number) {
  return value > 0 ? 'warning' : 'success';
}

function branchName(branches: BranchSummary[], branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }

  return branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
}

function safeParseBuckets(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Record<string, number>;
    return Object.entries(parsed).map(([key, count]) => `${humanizeToken(key)} ${count}`);
  } catch {
    return [];
  }
}

function formatMinutes(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 || Number.isInteger(hours) ? 0 : 1)} hr`;
}

function analyticsAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function AnalyticsWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<AnalyticsDashboardSummaryResponse | null>(
    null,
  );
  const [branchPerformance, setBranchPerformance] =
    useState<ConfigurationPage<AnalyticsBranchPerformanceSummaryResponse>>(
      EMPTY_BRANCH_PERFORMANCE,
    );
  const [utilization, setUtilization] =
    useState<ConfigurationPage<AnalyticsUtilizationSummaryResponse>>(EMPTY_UTILIZATION);
  const [operational, setOperational] =
    useState<ConfigurationPage<AnalyticsOperationalDrilldownResponse>>(EMPTY_OPERATIONAL);
  const [revenue, setRevenue] =
    useState<ConfigurationPage<AnalyticsReadinessDrilldownResponse>>(EMPTY_REVENUE);
  const [backlog, setBacklog] =
    useState<ConfigurationPage<AnalyticsBacklogDrilldownResponse>>(EMPTY_BACKLOG);
  const [compliance, setCompliance] =
    useState<ConfigurationPage<AnalyticsComplianceDrilldownResponse>>(EMPTY_COMPLIANCE);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL');
  const [snapshotDate, setSnapshotDate] = useState(currentDateValue());
  const [operationalMetric, setOperationalMetric] =
    useState<AnalyticsMetricType>('MISSED_VISITS');
  const [revenueStatusFilter, setRevenueStatusFilter] =
    useState<RevenueReadinessStatus | 'ALL'>('ALL');
  const [complianceStatusFilter, setComplianceStatusFilter] =
    useState<ComplianceReadinessStatus | 'ALL'>('ALL');
  const [backlogStatusFilter, setBacklogStatusFilter] = useState<string | 'ALL'>('ALL');
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Epic 15 refresh and filter behavior uses one shared pending, success, and retry pattern.',
  );
  const [refreshNonce, setRefreshNonce] = useState(0);

  const section = routeSection(location.pathname);
  const canViewWorkspace = canAccessPermission(profile, 'view_analytics_workspace');
  const canRefresh = canAccessPermission(profile, 'refresh_dashboard_metrics');
  const canViewRevenueWorkspace = canAccessPermission(profile, 'view_revenue_readiness_workspace');
  const canViewComplianceWorkspace = canAccessPermission(profile, 'view_compliance_workspace');
  const canViewScheduling = canAccessPermission(profile, 'view_scheduling_workspace');
  const canViewDocumentationWorkspace = canAccessPermission(profile, 'view_documentation_workspace');
  const canViewReviewWorkspace = canAccessPermission(profile, 'view_review_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const navigationItems = [
    { href: '/app/analytics', label: 'Dashboard', active: section === 'dashboard' },
    {
      href: '/app/analytics/operational',
      label: 'Operational Drilldown',
      active: section === 'operational',
    },
    {
      href: '/app/analytics/branch-performance',
      label: 'Branch Performance',
      active: section === 'branch-performance',
    },
    {
      href: '/app/analytics/caregiver-utilization',
      label: 'Caregiver Utilization',
      active: section === 'caregiver-utilization',
    },
    {
      href: '/app/analytics/readiness',
      label: 'Revenue & Compliance',
      active: section === 'readiness',
    },
  ];

  useEffect(() => {
    const requestedBranch = searchParams.get('branchId');
    const requestedDate = searchParams.get('snapshotDate');
    const requestedMetric = searchParams.get('metricType');
    const requestedRevenueStatus = searchParams.get('revenueStatus');
    const requestedComplianceStatus = searchParams.get('complianceStatus');
    const requestedBacklogStatus = searchParams.get('backlogStatus');

    setBranchFilter(requestedBranch?.trim() ? requestedBranch.trim() : 'ALL');
    setSnapshotDate(requestedDate?.trim() ? requestedDate.trim() : currentDateValue());
    setOperationalMetric(
      isAnalyticsMetric(requestedMetric) &&
        (requestedMetric === 'TODAYS_VISITS' ||
          requestedMetric === 'UNFILLED_VISITS' ||
          requestedMetric === 'LATE_STARTS' ||
          requestedMetric === 'MISSED_VISITS')
        ? requestedMetric
        : 'MISSED_VISITS',
    );
    setRevenueStatusFilter(
      requestedRevenueStatus === 'READY' ||
        requestedRevenueStatus === 'WARNING' ||
        requestedRevenueStatus === 'BLOCKED'
        ? requestedRevenueStatus
        : 'ALL',
    );
    setComplianceStatusFilter(
      requestedComplianceStatus === 'READY' ||
        requestedComplianceStatus === 'WARNING' ||
        requestedComplianceStatus === 'NON_COMPLIANT'
        ? requestedComplianceStatus
        : 'ALL',
    );
    setBacklogStatusFilter(requestedBacklogStatus?.trim() ? requestedBacklogStatus.trim() : 'ALL');
  }, [searchParams]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setUnauthorized(false);

      try {
        const branchList = await fetchBranches(authContext);
        setBranches(branchList);

        if (section === 'dashboard') {
          const [summary, backlogResponse] = await Promise.all([
            fetchAnalyticsDashboardSummary({
              ...authContext,
              branchId: branchValue(branchFilter),
              snapshotDate,
            }),
            fetchAnalyticsBacklogDrilldown({
              ...authContext,
              branchId: branchValue(branchFilter),
              snapshotDate,
              status: backlogStatusFilter !== 'ALL' ? backlogStatusFilter : undefined,
              page: 0,
              size: 12,
            }),
          ]);
          setDashboardSummary(summary);
          setBacklog(backlogResponse);
        } else if (section === 'operational') {
          const response = await fetchAnalyticsOperationalDrilldown({
            ...authContext,
            branchId: branchValue(branchFilter),
            snapshotDate,
            metricType: operationalMetric,
            page: 0,
            size: 25,
          });
          setOperational(response);
        } else if (section === 'branch-performance') {
          const response = await fetchAnalyticsBranchPerformance({
            ...authContext,
            branchId: branchValue(branchFilter),
            snapshotDate,
            page: 0,
            size: 25,
          });
          setBranchPerformance(response);
        } else if (section === 'caregiver-utilization') {
          const response = await fetchAnalyticsCaregiverUtilization({
            ...authContext,
            branchId: branchValue(branchFilter),
            snapshotDate,
            page: 0,
            size: 25,
          });
          setUtilization(response);
        } else {
          const [revenueResponse, complianceResponse] = await Promise.all([
            fetchAnalyticsRevenueDrilldown({
              ...authContext,
              branchId: branchValue(branchFilter),
              snapshotDate,
              readinessStatus: revenueStatusFilter,
              page: 0,
              size: 25,
            }),
            fetchAnalyticsComplianceDrilldown({
              ...authContext,
              branchId: branchValue(branchFilter),
              readinessStatus: complianceStatusFilter,
              page: 0,
              size: 25,
            }),
          ]);
          setRevenue(revenueResponse);
          setCompliance(complianceResponse);
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the analytics workspace right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [
    authContext,
    backlogStatusFilter,
    branchFilter,
    canViewWorkspace,
    complianceStatusFilter,
    operationalMetric,
    refreshNonce,
    revenueStatusFilter,
    section,
    snapshotDate,
    state.status,
  ]);

  async function handleRefresh() {
    setMutationState('saving');
    setMutationMessage('Refreshing the Epic 15 dashboard snapshot and linked summaries.');

    try {
      const refreshed = await refreshAnalyticsDashboard({
        ...authContext,
        snapshotDate,
        branchId: branchValue(branchFilter),
        lateStartThresholdMinutes: 15,
        includeTrendSnapshots: true,
      });
      if (section === 'dashboard') {
        setDashboardSummary({
          dashboardSnapshot: refreshed.dashboardSnapshot,
          branchPerformanceSummaries: refreshed.branchPerformanceSummaries,
          backlogSummaries: refreshed.backlogSummaries,
          readinessComplianceSummaries: refreshed.readinessComplianceSummaries,
        });
      }
      setRefreshNonce((value) => value + 1);
      setMutationState('saved');
      setMutationMessage(
        'Analytics refresh completed, the workspace reloaded the latest backend snapshot, and the controlled operation was logged.',
      );
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Analytics refresh failed. Review the message and retry.',
      );
    }
  }

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE15-01"
          title="Analytics workspace is not available for this role."
          message="Only authorized leadership and operations roles can open Epic 15 analytics routes."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE15-01"
          title="This analytics route is not available for your current scope."
          message="The backend denied this Epic 15 route for the current permission or branch scope."
          primaryLabel="Back to analytics"
          primaryLink="/app/analytics"
        />
      </div>
    );
  }

  const dashboardMetrics = dashboardSummary?.dashboardSnapshot;

  return (
    <AnalyticsWorkspaceShell
      eyebrow="Frontend Stories FE15-01 · FE15-08 · FE15-09"
      title="Analytics workspace"
      description="Epic 15 brings the command-center dashboard, operational drilldowns, branch performance, caregiver utilization, and revenue or compliance summary visibility into one shared route framework."
    >
      <AnalyticsWorkspaceGrid>
        <AnalyticsPanel
          title="Workspace navigation"
          description="Route sections stay separate, but branch and date filters remain consistent across the Epic 15 analytics workspace."
        >
          <AnalyticsSectionNavigation items={navigationItems} />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Filters and refresh"
          description="Epic 15 uses one shared branch, date, and refresh pattern so dashboard and drilldown behavior stays predictable."
        >
          <AnalyticsFilterBar>
            <label className="field">
              <span>Branch</span>
              <select
                className="input"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
              >
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

            {section === 'operational' ? (
              <label className="field">
                <span>Operational metric</span>
                <select
                  className="input"
                  value={operationalMetric}
                  onChange={(event) =>
                    setOperationalMetric(event.target.value as AnalyticsMetricType)
                  }
                >
                  <option value="TODAYS_VISITS">Today&apos;s visits</option>
                  <option value="UNFILLED_VISITS">Unfilled visits</option>
                  <option value="LATE_STARTS">Late starts</option>
                  <option value="MISSED_VISITS">Missed visits</option>
                </select>
              </label>
            ) : null}

            {section === 'readiness' ? (
              <>
                <label className="field">
                  <span>Revenue status</span>
                  <select
                    className="input"
                    value={revenueStatusFilter}
                    onChange={(event) =>
                      setRevenueStatusFilter(event.target.value as RevenueReadinessStatus | 'ALL')
                    }
                  >
                    <option value="ALL">All</option>
                    <option value="READY">Ready</option>
                    <option value="WARNING">Warning</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </label>

                <label className="field">
                  <span>Compliance status</span>
                  <select
                    className="input"
                    value={complianceStatusFilter}
                    onChange={(event) =>
                      setComplianceStatusFilter(
                        event.target.value as ComplianceReadinessStatus | 'ALL',
                      )
                    }
                  >
                    <option value="ALL">All</option>
                    <option value="READY">Ready</option>
                    <option value="WARNING">Warning</option>
                    <option value="NON_COMPLIANT">Non-compliant</option>
                  </select>
                </label>
              </>
            ) : null}

            {section === 'dashboard' ? (
              <label className="field">
                <span>Backlog status</span>
                <select
                  className="input"
                  value={backlogStatusFilter}
                  onChange={(event) => setBacklogStatusFilter(event.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="OPEN">Open</option>
                  <option value="RETURNED_FOR_FIX">Returned for fix</option>
                  <option value="AWAITING_SIGNOFF">Awaiting signoff</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </label>
            ) : null}
          </AnalyticsFilterBar>

          <AnalyticsActionRow>
            <button
              className="button"
              disabled={!canRefresh || mutationState === 'saving'}
              onClick={() => void handleRefresh()}
              type="button"
            >
              {mutationState === 'saving' ? 'Refreshing…' : 'Refresh Snapshot'}
            </button>
            <AnalyticsMutationNotice
              title="Refresh behavior"
              description={
                canRefresh
                  ? mutationMessage
                  : 'This role can review analytics data but cannot trigger backend refresh operations.'
              }
              state={canRefresh ? mutationState : 'idle'}
            />
          </AnalyticsActionRow>
        </AnalyticsPanel>

        {error ? (
          <AnalyticsPanel title="Analytics load failure">
            <AnalyticsModuleState title="Analytics request failed" description={error} variant="error" />
          </AnalyticsPanel>
        ) : null}

        {section === 'dashboard' ? (
          <AnalyticsPanel
            title="Dashboard summary"
            description="Command-center cards keep the key Epic 15 counts visible before later story work adds deeper ranking and trend treatment."
          >
            {loading ? <p className="session-note">Loading analytics dashboard...</p> : null}
            {!loading && !dashboardMetrics ? (
              <AnalyticsModuleState
                title="No dashboard snapshot is available."
                description="Use the shared refresh action to request a backend snapshot for this branch and date."
                variant="empty"
              />
            ) : null}
            {dashboardMetrics ? (
              <>
                <div className="analytics-summary-grid">
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/operational?metricType=TODAYS_VISITS&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.todaysVisitCount} today’s visits`}
                  summary="The current scheduled visit load for the selected branch and date."
                  tone="info"
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/operational?metricType=UNFILLED_VISITS&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.unfilledVisitCount} unfilled`}
                  summary="Open or unassigned work that still needs staffing attention."
                  tone={bannerTone(dashboardMetrics.unfilledVisitCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/operational?metricType=LATE_STARTS&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.lateStartCount} late starts`}
                  summary="Visits whose actual start trailed the backend lateness threshold."
                  tone={bannerTone(dashboardMetrics.lateStartCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/operational?metricType=MISSED_VISITS&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.missedVisitCount} missed visits`}
                  summary="Missed-visit signals from Epic 7 EVV and visit verification."
                  tone={bannerTone(dashboardMetrics.missedVisitCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics?backlogStatus=OPEN&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.documentationAgingCount} documentation aging`}
                  summary="Documentation still missing or not yet submitted from prior work."
                  tone={bannerTone(dashboardMetrics.documentationAgingCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics?backlogStatus=OVERDUE&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.qaBacklogCount} QA backlog`}
                  summary="Pending review work still sitting in Epic 10 queues."
                  tone={bannerTone(dashboardMetrics.qaBacklogCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/readiness?revenueStatus=BLOCKED&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.revenueBlockedCount} revenue blocked`}
                  summary="Blocked readiness work coming from Epic 14 finance posture."
                  tone={bannerTone(dashboardMetrics.revenueBlockedCount)}
                />
                  </Link>
                  <Link
                    className="analytics-card-link"
                    to={`/app/analytics/readiness?complianceStatus=NON_COMPLIANT&branchId=${encodeURIComponent(branchFilter)}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                  >
                <AnalyticsStatusBanner
                  status={`${dashboardMetrics.complianceExceptionCount} compliance exceptions`}
                  summary="Compliance warnings and exceptions still active in Epic 11."
                  tone={bannerTone(dashboardMetrics.complianceExceptionCount)}
                />
                  </Link>
                </div>
                <div className="analytics-link-cluster">
                  <span className="session-note">
                    Snapshot generated {formatDateTime(dashboardMetrics.generatedAt)} for{' '}
                    {branchName(branches, dashboardMetrics.branchId)}.
                  </span>
                </div>
              </>
            ) : null}
          </AnalyticsPanel>
        ) : null}

        {section === 'dashboard' ? (
          <AnalyticsPanel
            title="Documentation aging and QA backlog"
            description="Epic 15 backlog visibility combines branch posture cards with live drilldown rows from documentation and review queues."
          >
            {loading ? <p className="session-note">Loading backlog posture and drilldown...</p> : null}
            {!loading && dashboardSummary?.backlogSummaries?.length ? (
              <div className="analytics-detail-grid">
                {dashboardSummary.backlogSummaries.map((item) => (
                  <article className="analytics-detail-card" key={item.id}>
                    <strong>{branchName(branches, item.branchId)}</strong>
                    <p>
                      {item.documentationAgingCount} aging, {item.pendingReviewCount} pending,{' '}
                      {item.returnedForFixCount} returned, {item.overdueReviewCount} overdue
                    </p>
                    <span>{humanizeToken(item.backlogPosture)}</span>
                    {safeParseBuckets(item.agingBucketsJson).length ? (
                      <small>{safeParseBuckets(item.agingBucketsJson).join(' · ')}</small>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
            {!loading ? (
              <AnalyticsTable
                columns={['Work item', 'Patient', 'Status', 'Due', 'Source']}
                emptyMessage="No backlog rows match the current branch, date, and status filters."
                rows={backlog.content.map((item) => [
                  canViewReviewWorkspace ? (
                    <Link to={`/app/review/items/${item.reviewWorkItemId}`}>{item.reviewWorkItemId}</Link>
                  ) : (
                    item.reviewWorkItemId
                  ),
                  item.patientId,
                  `${humanizeToken(item.status)}${item.priority ? ` · ${humanizeToken(item.priority)}` : ''}`,
                  item.dueAt ? `${formatDateTime(item.dueAt)}${item.overdue ? ' · Overdue' : ''}` : 'No due date',
                  <div className="analytics-table-link-cluster">
                    {canViewDocumentationWorkspace ? (
                      <Link to={`/app/documentation/status`}>Documentation</Link>
                    ) : (
                      <span>Documentation unavailable</span>
                    )}
                    {canViewReviewWorkspace ? (
                      <Link to={`/app/review/items/${item.reviewWorkItemId}`}>Review item</Link>
                    ) : (
                      <span>Review unavailable</span>
                    )}
                  </div>,
                ])}
              />
            ) : null}
          </AnalyticsPanel>
        ) : null}

        {section === 'dashboard' ? (
          <AnalyticsPanel
            title="Revenue and compliance summary"
            description="Branch-segmented readiness and compliance counts stay visible in the dashboard before deeper Epic 11 and Epic 14 follow-up."
          >
            {loading ? <p className="session-note">Loading revenue and compliance summaries...</p> : null}
            {!loading && dashboardSummary?.readinessComplianceSummaries?.length ? (
              <div className="analytics-detail-grid">
                {dashboardSummary.readinessComplianceSummaries.map((item) => (
                  <article className="analytics-detail-card" key={item.id}>
                    <strong>{branchName(branches, item.branchId)}</strong>
                    <p>
                      Revenue {item.revenueReadyCount} ready, {item.revenueWarningCount} warning,{' '}
                      {item.revenueBlockedCount} blocked
                    </p>
                    <p>
                      Compliance {item.complianceReadyCount} ready, {item.complianceWarningCount} warning,{' '}
                      {item.complianceExceptionCount} exceptions
                    </p>
                    <div className="analytics-table-link-cluster">
                      <Link
                        to={`/app/analytics/readiness?branchId=${encodeURIComponent(item.branchId ?? 'ALL')}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                      >
                        Open drilldown
                      </Link>
                      {canViewRevenueWorkspace ? <Link to="/app/revenue-readiness">Revenue workspace</Link> : null}
                      {canViewComplianceWorkspace ? <Link to="/app/compliance/command-center">Compliance workspace</Link> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !loading ? (
                <AnalyticsModuleState
                  title="No revenue or compliance summaries are available."
                  description="Refresh the dashboard snapshot to request new branch-segmented readiness and compliance counts."
                  variant="empty"
                />
              ) : null
            )}
          </AnalyticsPanel>
        ) : null}

        {section === 'operational' ? (
          <AnalyticsPanel
            title="Operational drilldown"
            description="This route takes a count and turns it into visit-level context with direct links back into scheduling where allowed."
          >
            {loading ? <p className="session-note">Loading operational drilldown...</p> : null}
            {!loading ? (
              <AnalyticsTable
                columns={['Visit', 'Branch', 'Caregiver', 'Planned Window', 'Status', 'Source']}
                emptyMessage="No operational records match the selected branch, date, and metric."
                rows={operational.content.map((item) => [
                  canViewScheduling ? (
                    <Link to={`/app/scheduling/visits/${item.visitOccurrenceId}`}>
                      {item.visitOccurrenceId}
                    </Link>
                  ) : (
                    item.visitOccurrenceId
                  ),
                  branchName(branches, item.branchId),
                  item.caregiverDisplayName ?? 'Unassigned',
                  `${formatDateTime(item.plannedStartAt)} - ${formatDateTime(item.plannedEndAt)}`,
                  `${humanizeToken(item.detailStatus)} (${humanizeToken(item.visitStatus)})`,
                  <div className="analytics-table-link-cluster">
                    {canViewScheduling ? (
                      <>
                        <Link to={`/app/scheduling/visits/${item.visitOccurrenceId}`}>Visit workspace</Link>
                        <Link to="/app/scheduling">Scheduling workspace</Link>
                      </>
                    ) : (
                      <span>Scheduling workspace unavailable</span>
                    )}
                  </div>,
                ])}
              />
            ) : null}
          </AnalyticsPanel>
        ) : null}

        {section === 'branch-performance' ? (
          <AnalyticsPanel
            title="Branch performance"
            description="Branch-level comparisons stay structured for ranking cards and later command-center views."
          >
            {loading ? <p className="session-note">Loading branch performance...</p> : null}
            {!loading ? (
              <AnalyticsTable
                columns={[
                  'Branch',
                  'Visits',
                  'Late',
                  'Unfilled',
                  'Missed',
                  'Documentation / QA',
                  'Posture',
                  'Actions',
                ]}
                emptyMessage="No branch performance records are available for the current filters."
                rows={branchPerformance.content.map((item) => [
                  branchName(branches, item.branchId),
                  item.todaysVisitCount,
                  item.lateStartCount,
                  item.unfilledVisitCount,
                  item.missedVisitCount,
                  `${item.documentationAgingCount} aging · ${item.qaBacklogCount} QA`,
                  `${humanizeToken(item.performancePosture)} · ${formatDateTime(item.evaluatedAt)}`,
                  <div className="analytics-table-link-cluster">
                    <Link
                      to={`/app/analytics/operational?branchId=${encodeURIComponent(item.branchId ?? 'ALL')}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                    >
                      Operational
                    </Link>
                    <Link
                      to={`/app/analytics/readiness?branchId=${encodeURIComponent(item.branchId ?? 'ALL')}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                    >
                      Readiness
                    </Link>
                  </div>,
                ])}
              />
            ) : null}
          </AnalyticsPanel>
        ) : null}

        {section === 'caregiver-utilization' ? (
          <AnalyticsPanel
            title="Caregiver utilization"
            description="Assigned counts, completed counts, and scheduled minutes stay in one shared utilization view."
          >
            {loading ? <p className="session-note">Loading caregiver utilization...</p> : null}
            {!loading ? (
              <AnalyticsTable
                columns={['Caregiver', 'Branch', 'Assigned', 'Completed', 'Scheduled', 'Completion', 'Posture']}
                emptyMessage="No caregiver utilization rows are available for the current filters."
                rows={utilization.content.map((item) => [
                  item.caregiverProfileId,
                  branchName(branches, item.branchId),
                  item.assignedVisitCount,
                  item.completedVisitCount,
                  `${item.scheduledMinutes} min (${formatMinutes(item.scheduledMinutes)})`,
                  item.assignedVisitCount > 0
                    ? `${Math.round((item.completedVisitCount / item.assignedVisitCount) * 100)}%`
                    : '0%',
                  `${humanizeToken(item.utilizationPosture)} · ${formatDateTime(item.evaluatedAt)}`,
                ])}
              />
            ) : null}
          </AnalyticsPanel>
        ) : null}

        {section === 'readiness' ? (
          <>
            <AnalyticsPanel
              title="Revenue-readiness drilldown"
              description="This summary route keeps blocked and warning revenue posture visible without duplicating the Epic 14 workspace."
            >
              {loading ? <p className="session-note">Loading revenue-readiness drilldown...</p> : null}
              {!loading && revenue.content.length ? (
                <div className="analytics-detail-grid">
                  <article className="analytics-detail-card">
                    <strong>{revenue.content.length} revenue rows</strong>
                    <p>
                      {revenue.content.filter((item) => item.readinessStatus === 'BLOCKED').length} blocked ·{' '}
                      {revenue.content.filter((item) => item.readinessStatus === 'WARNING').length} warning
                    </p>
                  </article>
                </div>
              ) : null}
              {!loading ? (
                <AnalyticsTable
                  columns={['Visit', 'Patient', 'Branch', 'Status', 'Exceptions', 'Warnings', 'Source']}
                  emptyMessage="No revenue-readiness rows match the current filters."
                  rows={revenue.content.map((item) => [
                    item.visitOccurrenceId,
                    item.patientId,
                    branchName(branches, item.branchId),
                    humanizeToken(item.readinessStatus),
                    item.exceptionCount,
                    item.warningCount,
                    <div className="analytics-table-link-cluster">
                      <Link to={`/app/analytics/readiness?revenueStatus=${encodeURIComponent(item.readinessStatus)}&branchId=${encodeURIComponent(item.branchId ?? 'ALL')}&snapshotDate=${encodeURIComponent(snapshotDate)}`}>
                        Filter peer rows
                      </Link>
                      {canViewRevenueWorkspace ? (
                        <Link to="/app/revenue-readiness">Revenue readiness</Link>
                      ) : (
                        <span>Revenue workspace unavailable</span>
                      )}
                    </div>,
                  ])}
                />
              ) : null}
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Compliance-exception drilldown"
              description="This summary route keeps patient-level compliance posture visible without recreating the Epic 11 workflow."
            >
              {loading ? <p className="session-note">Loading compliance drilldown...</p> : null}
              {!loading && compliance.content.length ? (
                <div className="analytics-detail-grid">
                  <article className="analytics-detail-card">
                    <strong>{compliance.content.length} compliance rows</strong>
                    <p>
                      {
                        compliance.content.filter((item) => item.readinessStatus === 'NON_COMPLIANT')
                          .length
                      }{' '}
                      non-compliant ·{' '}
                      {compliance.content.reduce(
                        (total, item) => total + item.activeRiskReminderCount,
                        0,
                      )}{' '}
                      active risk reminders
                    </p>
                  </article>
                </div>
              ) : null}
              {!loading ? (
                <AnalyticsTable
                  columns={['Patient', 'Branch', 'Readiness', 'Certification', 'Risk Reminders', 'Source']}
                  emptyMessage="No compliance rows match the current filters."
                  rows={compliance.content.map((item) => [
                    item.patientId,
                    branchName(branches, item.branchId),
                    `${humanizeToken(item.readinessStatus)} (${item.gapCount} gaps)`,
                    humanizeToken(item.certificationPeriodStatus),
                    item.activeRiskReminderCount,
                    <div className="analytics-table-link-cluster">
                      <Link
                        to={`/app/analytics/readiness?complianceStatus=${encodeURIComponent(item.readinessStatus)}&branchId=${encodeURIComponent(item.branchId ?? 'ALL')}&snapshotDate=${encodeURIComponent(snapshotDate)}`}
                      >
                        Filter peer rows
                      </Link>
                      {canViewComplianceWorkspace ? (
                        <Link to="/app/compliance/command-center">Compliance workspace</Link>
                      ) : (
                        <span>Compliance workspace unavailable</span>
                      )}
                    </div>,
                  ])}
                />
              ) : null}
            </AnalyticsPanel>
          </>
        ) : null}

        <AnalyticsPanel
          title="Audit and privacy context"
          description="Epic 15 keeps the command-center useful without exposing unnecessary source metadata, while authorized users can still jump into matching audit activity for controlled refresh operations."
        >
          <AnalyticsModuleState
            title="Privacy-aware summary treatment"
            description="This workspace stays focused on counts, branch context, posture, and actionable links. It avoids exposing internal backend metadata that is not needed for operational leadership triage."
            variant="readonly"
          />
          {canViewAudit ? (
            <AnalyticsAuditCallout
              title="Analytics audit links"
              body="Dashboard refresh, snapshot generation, branch performance refresh, utilization refresh, backlog refresh, and readiness refresh are controlled backend operations. Use the audit workspace when you need to confirm when those analytics were recalculated."
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
                  to: analyticsAuditHref('ANALYTICS_BRANCH_PERFORMANCE_REFRESHED'),
                  label: 'Branch performance audit activity',
                },
                {
                  to: analyticsAuditHref('ANALYTICS_COMPLIANCE_SUMMARY_REFRESHED'),
                  label: 'Compliance summary audit activity',
                },
              ]}
            />
          ) : null}
        </AnalyticsPanel>
      </AnalyticsWorkspaceGrid>
    </AnalyticsWorkspaceShell>
  );
}
