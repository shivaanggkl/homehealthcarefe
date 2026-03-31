import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  type ConfigurationPage,
  type RevenueAuthorizationUsageSummaryResponse,
  type RevenueExceptionFlagResponse,
  type RevenueExceptionType,
  type RevenueExportPreviewResponse,
  type RevenueHistoryResponse,
  type RevenuePayerServiceSummaryResponse,
  type RevenueReadinessDetailResponse,
  type RevenueReadinessStatus,
  type RevenueReadinessSummaryResponse,
  fetchBranches,
  fetchRevenueAuthorizationUsageHistory,
  fetchRevenueAuthorizationUsageSummary,
  fetchRevenueExceptionFlags,
  fetchRevenueHistory,
  fetchRevenuePayerServiceSummary,
  fetchRevenueReadinessDetail,
  fetchRevenueReadinessList,
  generateInvoiceExport,
  generatePayrollExport,
  previewInvoiceExport,
  previewPayrollExport,
  recalculateRevenueAuthorizationUsage,
  recalculateRevenueReadiness,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  RevenueAuditCallout,
  RevenueModuleState,
  RevenueMutationNotice,
  RevenuePanel,
  RevenueSectionNavigation,
  RevenueStatusBanner,
  RevenueWorkspaceCards,
  RevenueWorkspaceGrid,
  RevenueWorkspaceShell,
} from '../components/RevenueReadinessWorkspaceFoundation';

type RouteSection =
  | 'overview'
  | 'detail'
  | 'exceptions'
  | 'payroll-export'
  | 'invoice-export'
  | 'authorization';

type MutationState = 'idle' | 'saving' | 'saved' | 'retry';

type ReadinessFilter = RevenueReadinessStatus | 'ALL';
type ExceptionFilter = RevenueExceptionType | 'ALL';

const EMPTY_PAGE: ConfigurationPage<RevenueReadinessSummaryResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

const EMPTY_EXCEPTION_PAGE: ConfigurationPage<RevenueExceptionFlagResponse> = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

function routeSection(pathname: string): RouteSection {
  if (pathname.includes('/exceptions')) {
    return 'exceptions';
  }
  if (pathname.includes('/payroll-export')) {
    return 'payroll-export';
  }
  if (pathname.includes('/invoice-export')) {
    return 'invoice-export';
  }
  if (pathname.includes('/authorizations/')) {
    return 'authorization';
  }
  if (pathname.includes('/visits/')) {
    return 'detail';
  }
  return 'overview';
}

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

function branchLabelValue(branchNames: Map<string, string>, branchId: string | null | undefined) {
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

function statusTone(value: string | null | undefined): 'info' | 'success' | 'warning' | 'readonly' {
  if (!value) {
    return 'readonly';
  }
  if (value === 'READY' || value === 'PASS' || value === 'GENERATED') {
    return 'success';
  }
  if (value === 'WARNING' || value === 'BLOCKED' || value === 'FAIL') {
    return 'warning';
  }
  return 'info';
}

function exportStatusSummary(value: boolean, blockedReason: string | null | undefined) {
  if (value) {
    return 'Preview is exportable with the current backend readiness state.';
  }
  return blockedReason ?? 'This preview is currently blocked by Epic 14 readiness rules.';
}

function usagePostureSummary(
  usage: RevenueAuthorizationUsageSummaryResponse | null | undefined,
) {
  if (!usage) {
    return 'Authorization usage is not linked to this readiness record.';
  }
  if (usage.usagePosture === 'OVER_LIMIT') {
    return 'Units are over limit and should be treated as a finance blocker.';
  }
  if (usage.usagePosture === 'NEAR_LIMIT') {
    return 'Units are nearing limit and should be watched before export handoff.';
  }
  return 'Units currently remain inside the authorized range.';
}

function auditQuery(targetId: string) {
  return `/app/admin/audit?targetId=${encodeURIComponent(targetId)}`;
}

export function RevenueReadinessWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const { visitId, authorizationId } = useParams();

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [readinessPage, setReadinessPage] =
    useState<ConfigurationPage<RevenueReadinessSummaryResponse>>(EMPTY_PAGE);
  const [exceptionPage, setExceptionPage] =
    useState<ConfigurationPage<RevenueExceptionFlagResponse>>(EMPTY_EXCEPTION_PAGE);
  const [detail, setDetail] = useState<RevenueReadinessDetailResponse | null>(null);
  const [payerServiceSummary, setPayerServiceSummary] =
    useState<RevenuePayerServiceSummaryResponse | null>(null);
  const [authorizationUsage, setAuthorizationUsage] =
    useState<RevenueAuthorizationUsageSummaryResponse | null>(null);
  const [history, setHistory] = useState<RevenueHistoryResponse | null>(null);
  const [authorizationHistoryCount, setAuthorizationHistoryCount] = useState(0);
  const [payrollPreview, setPayrollPreview] = useState<RevenueExportPreviewResponse | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<RevenueExportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('ALL');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('ALL');
  const [payerFilter, setPayerFilter] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Revenue refresh and export actions use one shared pending, success, and retry pattern.',
  );
  const [refreshNonce, setRefreshNonce] = useState(0);

  const currentSection = routeSection(location.pathname);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canViewWorkspace = canAccessPermission(profile, 'view_revenue_readiness_workspace');
  const canRecalculate = canAccessPermission(profile, 'recalculate_revenue_readiness');
  const canGenerateExports = canAccessPermission(profile, 'generate_revenue_exports');
  const canViewUsage = canAccessPermission(profile, 'view_authorization_usage_summaries');
  const canViewPayer = canAccessPermission(profile, 'view_payer_service_summaries');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');
  const effectiveVisitId = visitId ?? selectedVisitId;
  const selectedSummary =
    readinessPage.content.find((item) => item.visitOccurrenceId === effectiveVisitId) ?? null;
  const readinessIndex = useMemo(
    () => new Map(readinessPage.content.map((item) => [item.visitOccurrenceId, item])),
    [readinessPage.content],
  );
  const branchLabel = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );
  const selectedHistoryFlags = history?.exceptionFlags ?? [];
  const activeHistoryFlags = selectedHistoryFlags.filter((item) => !item.clearedAt);

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
            branchId: branchValue(branchFilter),
            readinessStatus: readinessFilter,
            exceptionType: exceptionFilter,
            payer: payerFilter.trim() || undefined,
            page: 0,
            size: 25,
          }),
          currentSection === 'exceptions'
            ? fetchRevenueExceptionFlags({
                ...authContext,
                branchId: branchValue(branchFilter),
                exceptionType: exceptionFilter,
                payer: payerFilter.trim() || undefined,
                page: 0,
                size: 25,
              })
            : Promise.resolve(EMPTY_EXCEPTION_PAGE),
        ]);
        setBranches(branchList);
        setReadinessPage(readinessResponse);
        setExceptionPage(exceptionResponse);
        if (!visitId && !selectedVisitId && readinessResponse.content.length > 0) {
          setSelectedVisitId(readinessResponse.content[0].visitOccurrenceId);
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the revenue-readiness workspace right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [
    authContext,
    branchFilter,
    canViewWorkspace,
    currentSection,
    exceptionFilter,
    payerFilter,
    readinessFilter,
    refreshNonce,
    selectedVisitId,
    state.status,
    visitId,
  ]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function loadContext() {
      setError(null);
      try {
        if (currentSection === 'detail' && visitId) {
          const [detailResponse, historyResponse, payerResponse] = await Promise.all([
            fetchRevenueReadinessDetail({ ...authContext, visitOccurrenceId: visitId }),
            fetchRevenueHistory({ ...authContext, visitOccurrenceId: visitId }),
            canViewPayer
              ? fetchRevenuePayerServiceSummary({ ...authContext, visitOccurrenceId: visitId })
              : Promise.resolve(null),
          ]);
          setDetail(detailResponse);
          setHistory(historyResponse);
          setPayerServiceSummary(payerResponse);
          setAuthorizationUsage(detailResponse.authorizationUsage);
          setPayrollPreview(null);
          setInvoicePreview(null);
          return;
        }

        if ((currentSection === 'payroll-export' || currentSection === 'invoice-export') && effectiveVisitId) {
          const [detailResponse, previewResponse] = await Promise.all([
            fetchRevenueReadinessDetail({ ...authContext, visitOccurrenceId: effectiveVisitId }),
            currentSection === 'payroll-export'
              ? previewPayrollExport({ ...authContext, visitOccurrenceId: effectiveVisitId })
              : previewInvoiceExport({ ...authContext, visitOccurrenceId: effectiveVisitId }),
          ]);
          setDetail(detailResponse);
          setAuthorizationUsage(detailResponse.authorizationUsage);
          setPayerServiceSummary(detailResponse.payerServiceSummary);
          setHistory(null);
          setPayrollPreview(currentSection === 'payroll-export' ? previewResponse : null);
          setInvoicePreview(currentSection === 'invoice-export' ? previewResponse : null);
          return;
        }

        if (currentSection === 'authorization' && authorizationId) {
          if (!canViewUsage) {
            setAuthorizationUsage(null);
            setAuthorizationHistoryCount(0);
            return;
          }
          const [usageResponse, usageHistory] = await Promise.all([
            fetchRevenueAuthorizationUsageSummary({ ...authContext, authorizationId }),
            fetchRevenueAuthorizationUsageHistory({ ...authContext, authorizationId }),
          ]);
          setAuthorizationUsage(usageResponse);
          setAuthorizationHistoryCount(usageHistory.length);
          setDetail(null);
          setHistory(null);
          setPayrollPreview(null);
          setInvoicePreview(null);
          return;
        }

        setDetail(null);
        setHistory(null);
        setPayerServiceSummary(null);
        setAuthorizationUsage(null);
        setAuthorizationHistoryCount(0);
        setPayrollPreview(null);
        setInvoicePreview(null);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the selected revenue-readiness context.',
          );
        }
      }
    }

    void loadContext();
  }, [
    authContext,
    authorizationId,
    canViewPayer,
    canViewUsage,
    canViewWorkspace,
    currentSection,
    effectiveVisitId,
    refreshNonce,
    state.status,
    visitId,
  ]);

  async function runMutation(action: () => Promise<void>, successMessage: string, failureMessage: string) {
    setMutationState('saving');
    setMutationMessage('Sending the Epic 14 mutation to the backend and waiting for the refreshed result.');
    try {
      await action();
      setMutationState('saved');
      setMutationMessage(successMessage);
      setRefreshNonce((value) => value + 1);
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError ? requestError.message : failureMessage,
      );
    }
  }

  function handleRecalculateVisit() {
    if (!detail?.summary.visitOccurrenceId || !canRecalculate) {
      return;
    }
    void runMutation(
      async () => {
        await recalculateRevenueReadiness({
          ...authContext,
          visitOccurrenceId: detail.summary.visitOccurrenceId,
          evaluatedAt: new Date().toISOString(),
        });
      },
      'Revenue-readiness status was recalculated, logged, and the workspace is refreshing with the backend result.',
      'Revenue-readiness recalculation could not be completed.',
    );
  }

  function handleRecalculateAuthorization() {
    if (!authorizationId || !canRecalculate || !canViewUsage) {
      return;
    }
    void runMutation(
      async () => {
        await recalculateRevenueAuthorizationUsage({
          ...authContext,
          authorizationId,
          evaluatedAt: new Date().toISOString(),
        });
      },
      'Authorization usage was recalculated, logged, and the updated unit posture is reloading.',
      'Authorization usage recalculation could not be completed.',
    );
  }

  function handleGeneratePayroll() {
    if (!effectiveVisitId || !canGenerateExports) {
      return;
    }
    if (!window.confirm('Generate the payroll export row for the selected visit?')) {
      return;
    }
    void runMutation(
      async () => {
        await generatePayrollExport({
          ...authContext,
          visitOccurrenceId: effectiveVisitId,
          allowBlocked: false,
          generatedAt: new Date().toISOString(),
        });
      },
      'Payroll export generation completed, was logged as a controlled operation, and the preview is refreshing with the backend result.',
      'Payroll export generation failed.',
    );
  }

  function handleGenerateInvoice() {
    if (!effectiveVisitId || !canGenerateExports) {
      return;
    }
    if (!window.confirm('Generate the invoice export row for the selected visit?')) {
      return;
    }
    void runMutation(
      async () => {
        await generateInvoiceExport({
          ...authContext,
          visitOccurrenceId: effectiveVisitId,
          allowBlocked: false,
          generatedAt: new Date().toISOString(),
        });
      },
      'Invoice export generation completed, was logged as a controlled operation, and the preview is refreshing with the backend result.',
      'Invoice export generation failed.',
    );
  }

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE14-01"
          title="Revenue-readiness workspace is not available for this role."
          message="Only authorized finance and operational roles can open the Epic 14 revenue-readiness workspace."
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
          eyebrow="Frontend Story FE14-01"
          title="This revenue route is not available for your current scope."
          message="The backend denied the requested Epic 14 route for the current permission or branch scope."
          primaryLabel="Back to revenue readiness"
          primaryLink="/app/revenue-readiness"
        />
      </div>
    );
  }

  const navLinks = [
    { path: '/app/revenue-readiness', label: 'Readiness list', state: 'available' as const },
    { path: '/app/revenue-readiness/exceptions', label: 'Exceptions', state: 'available' as const },
    {
      path: '/app/revenue-readiness/payroll-export',
      label: 'Payroll export',
      state: canGenerateExports ? ('available' as const) : ('read-only' as const),
    },
    {
      path: '/app/revenue-readiness/invoice-export',
      label: 'Invoice export',
      state: canGenerateExports ? ('available' as const) : ('read-only' as const),
    },
    {
      path:
        detail?.authorizationUsage?.authorizationId || authorizationId
          ? `/app/revenue-readiness/authorizations/${detail?.authorizationUsage?.authorizationId ?? authorizationId}`
          : '/app/revenue-readiness',
      label: 'Authorization usage',
      state: canViewUsage ? ('available' as const) : ('read-only' as const),
    },
    {
      path: '/app/revenue-readiness/command-center',
      label: 'Revenue summary',
      state: 'available' as const,
    },
  ];

  const workspaceCards = [
    {
      path: '/app/revenue-readiness',
      label: 'Readiness queue',
      description: 'Review blocked, warning, and ready visits before finance handoff.',
      state: 'available' as const,
    },
    {
      path: '/app/revenue-readiness/exceptions',
      label: 'Exception flags',
      description: 'Open the blocker lane for signature, documentation, payer, and authorization issues.',
      state: 'available' as const,
    },
    {
      path: '/app/revenue-readiness/payroll-export',
      label: 'Payroll preview',
      description: 'Use the shared preview and generation flow for payroll-ready visit output.',
      state: canGenerateExports ? ('available' as const) : ('read-only' as const),
    },
    {
      path: '/app/revenue-readiness/invoice-export',
      label: 'Invoice preview',
      description: 'Use the shared preview and generation flow for invoice-ready visit output.',
      state: canGenerateExports ? ('available' as const) : ('read-only' as const),
    },
    {
      path: '/app/revenue-readiness/command-center',
      label: 'Revenue summary',
      description: 'Open the coordinator-facing Epic 14 summary for blocked visits, signature issues, and authorization pressure.',
      state: 'available' as const,
    },
  ];

  return (
    <RevenueWorkspaceShell
      eyebrow="Frontend Stories FE14-01 · FE14-08 · FE14-09"
      title="Revenue readiness"
      description="Epic 14 keeps visit readiness, blocker visibility, export preview, and authorization usage in one privacy-aware finance workspace."
    >
      <RevenueWorkspaceGrid>
        <RevenuePanel
          title="Epic 14 navigation"
          description="The shared revenue-readiness shell keeps list, detail, blocker, export, and authorization routes predictable."
        >
          <RevenueSectionNavigation links={navLinks} />
          <RevenueWorkspaceCards cards={workspaceCards} />
        </RevenuePanel>

        <RevenuePanel
          title="Queue filters"
          description="Branch, readiness, exception, and payer filters keep finance follow-up scoped without rebuilding the query by hand."
        >
          <div className="revenue-filter-grid">
            <label className="field">
              <span>Branch</span>
              <select className="input" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Readiness</span>
              <select
                className="input"
                value={readinessFilter}
                onChange={(event) => setReadinessFilter(event.target.value as ReadinessFilter)}
              >
                <option value="ALL">All readiness states</option>
                <option value="READY">Ready</option>
                <option value="WARNING">Warning</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </label>
            <label className="field">
              <span>Exception type</span>
              <select
                className="input"
                value={exceptionFilter}
                onChange={(event) => setExceptionFilter(event.target.value as ExceptionFilter)}
              >
                <option value="ALL">All exception types</option>
                <option value="INCOMPLETE_VISIT">Incomplete visit</option>
                <option value="MISSING_DOCUMENTATION">Missing documentation</option>
                <option value="MISSING_SIGNATURE">Missing signature</option>
                <option value="PAYER_SERVICE_MISMATCH">Payer/service mismatch</option>
                <option value="AUTHORIZATION_ISSUE">Authorization issue</option>
              </select>
            </label>
            <label className="field">
              <span>Payer</span>
              <input
                className="input"
                placeholder="Filter by payer"
                value={payerFilter}
                onChange={(event) => setPayerFilter(event.target.value)}
              />
            </label>
          </div>
          <RevenueMutationNotice message={mutationMessage} state={mutationState} />
        </RevenuePanel>

        <RevenuePanel
          title="Workspace summary"
          description="The shared revenue-readiness route keeps the queue, route-specific detail, and mutation feedback in one place."
        >
          {loading ? <p className="session-note">Loading revenue-readiness workspace...</p> : null}
          {error ? <RevenueModuleState title="Revenue-readiness load failed" description={error} variant="error" /> : null}
          {!loading && !error ? (
            <div className="revenue-summary-grid">
              <div className="revenue-summary-card">
                <strong>{readinessPage.totalElements}</strong>
                <span>Queue items</span>
              </div>
              <div className="revenue-summary-card">
                <strong>{readinessPage.content.filter((item) => item.readinessStatus === 'BLOCKED').length}</strong>
                <span>Blocked visits</span>
              </div>
              <div className="revenue-summary-card">
                <strong>{readinessPage.content.filter((item) => item.readinessStatus === 'WARNING').length}</strong>
                <span>Warning visits</span>
              </div>
              <div className="revenue-summary-card">
                <strong>{exceptionPage.totalElements}</strong>
                <span>Exception flags</span>
              </div>
            </div>
          ) : null}
        </RevenuePanel>

        {currentSection === 'overview' ? (
          <RevenuePanel
            title="Readiness list"
            description="The queue shows operationally useful visit context plus direct links into detail, patient, scheduling, and documentation routes."
          >
            {readinessPage.content.length === 0 && !loading ? (
              <RevenueModuleState
                title="No revenue-ready visits matched the filters"
                description="Adjust the branch, readiness, exception, or payer filters to widen the Epic 14 queue."
                variant="empty"
              />
            ) : (
              <div className="revenue-queue-list">
                {readinessPage.content.map((item) => (
                  <article className="revenue-queue-card" key={item.visitOccurrenceId}>
                    <div className="revenue-queue-card-header">
                      <div>
                        <h4>{item.payerName ?? 'Unlinked payer context'}</h4>
                        <p>Visit {item.visitOccurrenceId}</p>
                      </div>
                      <RevenueStatusBanner
                        status={humanizeToken(item.readinessStatus)}
                        summary={`${item.exceptionCount} exceptions · ${item.warningCount} warnings`}
                        tone={statusTone(item.readinessStatus)}
                      />
                    </div>
                    <div className="revenue-inline-meta">
                      <span>Patient {item.patientId}</span>
                      <span>Branch {branchLabelValue(branchLabel, item.branchId)}</span>
                      <span>Evaluated {formatDateTime(item.evaluatedAt)}</span>
                    </div>
                    <div className="revenue-action-row">
                      <Link className="button button-secondary" to={`/app/revenue-readiness/visits/${item.visitOccurrenceId}`}>
                        Open detail
                      </Link>
                      <Link className="button button-secondary" to={`/app/scheduling/visits/${item.visitOccurrenceId}`}>
                        Open visit
                      </Link>
                      <Link className="button button-secondary" to={`/app/documentation/visits/${item.visitOccurrenceId}`}>
                        Open documentation
                      </Link>
                      <Link className="button button-secondary" to={`/app/patients/${item.patientId}`}>
                        Open patient
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </RevenuePanel>
        ) : null}

        {currentSection === 'detail' ? (
          <RevenuePanel
            title="Readiness detail"
            description="Visit-level readiness detail brings completion, signature, payer, export, and history context together before handoff."
          >
            {!detail ? (
              <RevenueModuleState
                title="No readiness detail is loaded"
                description="Open a revenue-readiness visit route to inspect validation and export context."
                variant="readonly"
              />
            ) : (
              <div className="revenue-detail-stack">
                <RevenueStatusBanner
                  status={humanizeToken(detail.summary.readinessStatus)}
                  summary={`Completion ${humanizeToken(detail.completionValidation?.outcome)} · Signature ${humanizeToken(detail.signatureValidation?.outcome)}`}
                  tone={statusTone(detail.summary.readinessStatus)}
                />
                <dl className="revenue-data-list">
                  <div>
                    <dt>Visit</dt>
                    <dd>{detail.summary.visitOccurrenceId}</dd>
                  </div>
                  <div>
                    <dt>Patient</dt>
                    <dd>{detail.summary.patientId}</dd>
                  </div>
                  <div>
                    <dt>Payer</dt>
                    <dd>{detail.summary.payerName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Service line</dt>
                    <dd>{payerServiceSummary?.serviceLineName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{branchLabelValue(branchLabel, detail.summary.branchId)}</dd>
                  </div>
                  <div>
                    <dt>Export state</dt>
                    <dd>{humanizeToken(detail.exportLifecycleStatus)}</dd>
                  </div>
                  <div>
                    <dt>Exceptions</dt>
                    <dd>{detail.summary.exceptionCount}</dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>{detail.summary.warningCount}</dd>
                  </div>
                  <div>
                    <dt>Evaluated at</dt>
                    <dd>{formatDateTime(detail.summary.evaluatedAt)}</dd>
                  </div>
                </dl>
                <div className="revenue-validation-grid">
                  <RevenueStatusBanner
                    status={`Completion ${humanizeToken(detail.completionValidation?.outcome)}`}
                    summary={`${detail.completionValidation?.summary ?? 'No completion validation is available.'} ${
                      detail.completionValidation?.reasonCode
                        ? `Reason: ${humanizeToken(detail.completionValidation.reasonCode)}.`
                        : ''
                    }`}
                    tone={statusTone(detail.completionValidation?.outcome)}
                  />
                  <RevenueStatusBanner
                    status={`Signature ${humanizeToken(detail.signatureValidation?.outcome)}`}
                    summary={`${detail.signatureValidation?.summary ?? 'No signature validation is available.'} ${
                      detail.signatureValidation?.reasonCode
                        ? `Reason: ${humanizeToken(detail.signatureValidation.reasonCode)}.`
                        : ''
                    }`}
                    tone={statusTone(detail.signatureValidation?.outcome)}
                  />
                </div>
                {canViewPayer && payerServiceSummary ? (
                  <div className="revenue-detail-subsection">
                    <h4>Payer and service summary</h4>
                    <dl className="revenue-data-list">
                      <div>
                        <dt>Payer</dt>
                        <dd>{payerServiceSummary.payerName ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Authorization</dt>
                        <dd>{payerServiceSummary.authorizationNumber ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Service line</dt>
                        <dd>{payerServiceSummary.serviceLineName ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Service line code</dt>
                        <dd>{payerServiceSummary.serviceLineCode ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Branch</dt>
                        <dd>{branchLabelValue(branchLabel, payerServiceSummary.branchId)}</dd>
                      </div>
                      <div>
                        <dt>Policy number</dt>
                        <dd>{payerServiceSummary.memberPolicyNumber ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Primary payer</dt>
                        <dd>{payerServiceSummary.primaryPayer ? 'Yes' : 'No'}</dd>
                      </div>
                      <div>
                        <dt>Summarized at</dt>
                        <dd>{formatDateTime(payerServiceSummary.summarizedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
                <div className="revenue-detail-subsection">
                  <h4>Authorization usage posture</h4>
                  {detail.authorizationUsage ? (
                    <>
                      <RevenueStatusBanner
                        status={humanizeToken(detail.authorizationUsage.usagePosture)}
                        summary={usagePostureSummary(detail.authorizationUsage)}
                        tone={statusTone(detail.authorizationUsage.usagePosture)}
                      />
                      <dl className="revenue-data-list">
                        <div>
                          <dt>Authorization</dt>
                          <dd>{detail.authorizationUsage.authorizationId}</dd>
                        </div>
                        <div>
                          <dt>Authorized units</dt>
                          <dd>{detail.authorizationUsage.authorizedUnits ?? 'Not available'}</dd>
                        </div>
                        <div>
                          <dt>Used units</dt>
                          <dd>{detail.authorizationUsage.usedUnits}</dd>
                        </div>
                        <div>
                          <dt>Remaining units</dt>
                          <dd>{detail.authorizationUsage.remainingUnits ?? 'Not available'}</dd>
                        </div>
                        <div>
                          <dt>Counted visits</dt>
                          <dd>{detail.authorizationUsage.countedVisitCount}</dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <RevenueModuleState
                      title="No authorization usage is linked"
                      description="This readiness record currently does not have authorization-usage context."
                      variant="readonly"
                    />
                  )}
                </div>
                <div className="revenue-detail-subsection">
                  <h4>Active blocker summary</h4>
                  {activeHistoryFlags.length === 0 ? (
                    <RevenueModuleState
                      title="No active blockers are linked right now"
                      description="This readiness record does not currently carry any active Epic 14 exception flags."
                      variant="empty"
                    />
                  ) : (
                    <div className="revenue-blocker-list">
                      {activeHistoryFlags.map((flag) => (
                        <div className="revenue-blocker-item" key={flag.id}>
                          <strong>{humanizeToken(flag.exceptionType)}</strong>
                          <span>{flag.summary}</span>
                          <small>
                            {humanizeToken(flag.severity)} · detected {formatDateTime(flag.detectedAt)}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="revenue-action-row">
                  <button className="button" disabled={!canRecalculate || mutationState === 'saving'} onClick={handleRecalculateVisit} type="button">
                    Recalculate readiness
                  </button>
                  {detail.authorizationUsage?.authorizationId ? (
                    <Link className="button button-secondary" to={`/app/revenue-readiness/authorizations/${detail.authorizationUsage.authorizationId}`}>
                      Open authorization usage
                    </Link>
                  ) : null}
                  <Link className="button button-secondary" to={`/app/scheduling/visits/${detail.summary.visitOccurrenceId}`}>
                    Schedule context
                  </Link>
                  <Link className="button button-secondary" to={`/app/documentation/visits/${detail.summary.visitOccurrenceId}`}>
                    Visit documentation
                  </Link>
                  <Link className="button button-secondary" to={`/app/patients/${detail.summary.patientId}`}>
                    Patient context
                  </Link>
                </div>
                {history ? (
                  <RevenueModuleState
                    title="History loaded"
                    description={`This visit currently has ${history.exceptionFlags.length} exception flags, ${history.payrollExports.length} payroll rows, ${history.invoiceExports.length} invoice rows, and ${history.auditEvents.length} audit-linked events.`}
                    variant="info"
                  />
                ) : null}
              </div>
            )}
          </RevenuePanel>
        ) : null}

        {currentSection === 'exceptions' ? (
          <RevenuePanel
            title="Revenue exceptions"
            description="The blocker lane keeps reason summaries and route-back context visible before export generation is attempted."
          >
            {exceptionPage.content.length === 0 && !loading ? (
              <RevenueModuleState
                title="No revenue exceptions matched the filters"
                description="The current Epic 14 blocker lane is empty for this query."
                variant="empty"
              />
            ) : (
              <div className="revenue-queue-list">
                {exceptionPage.content.map((item) => (
                  <article className="revenue-queue-card" key={item.id}>
                    <div className="revenue-queue-card-header">
                      <div>
                        <h4>{humanizeToken(item.exceptionType)}</h4>
                        <p>{item.summary}</p>
                      </div>
                      <RevenueStatusBanner
                        status={humanizeToken(item.severity)}
                        summary={humanizeToken(item.reasonCode)}
                        tone={statusTone(item.severity)}
                      />
                    </div>
                    <div className="revenue-inline-meta">
                      <span>{item.targetType === 'VISIT' ? 'Visit-linked blocker' : 'Authorization-linked blocker'}</span>
                      <span>Target {item.targetId}</span>
                      <span>Branch {branchLabelValue(branchLabel, item.branchId)}</span>
                      <span>Detected {formatDateTime(item.detectedAt)}</span>
                      <span>{item.clearedAt ? `Cleared ${formatDateTime(item.clearedAt)}` : 'Active'}</span>
                    </div>
                    {item.targetType === 'VISIT' ? (() => {
                      const relatedReadiness = readinessIndex.get(item.targetId) ?? null;
                      return relatedReadiness ? (
                        <dl className="revenue-data-list">
                          <div>
                            <dt>Visit</dt>
                            <dd>{relatedReadiness.visitOccurrenceId}</dd>
                          </div>
                          <div>
                            <dt>Patient</dt>
                            <dd>{relatedReadiness.patientId}</dd>
                          </div>
                          <div>
                            <dt>Payer</dt>
                            <dd>{relatedReadiness.payerName ?? 'Not linked'}</dd>
                          </div>
                          <div>
                            <dt>Readiness</dt>
                            <dd>{humanizeToken(relatedReadiness.readinessStatus)}</dd>
                          </div>
                        </dl>
                      ) : (
                        <RevenueModuleState
                          title="Related readiness context"
                          description={`Visit ${item.targetId} carries ${humanizeToken(item.exceptionType)} but is outside the current readiness query window.`}
                          variant="info"
                        />
                      );
                    })() : (
                      <RevenueModuleState
                        title="Related authorization context"
                        description={`Authorization target ${item.targetId} is currently flagged with ${humanizeToken(item.exceptionType)}.`}
                        variant="info"
                      />
                    )}
                    {item.targetType === 'VISIT' ? (
                      <div className="revenue-action-row">
                        <Link className="button button-secondary" to={`/app/revenue-readiness/visits/${item.targetId}`}>
                          Open readiness detail
                        </Link>
                        <Link className="button button-secondary" to={`/app/scheduling/visits/${item.targetId}`}>
                          Open schedule visit
                        </Link>
                      </div>
                    ) : (
                      <div className="revenue-action-row">
                        <Link className="button button-secondary" to={`/app/revenue-readiness/authorizations/${item.targetId}`}>
                          Open authorization usage
                        </Link>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </RevenuePanel>
        ) : null}

        {currentSection === 'payroll-export' || currentSection === 'invoice-export' ? (
          <RevenuePanel
            title={currentSection === 'payroll-export' ? 'Payroll export preview' : 'Invoice export preview'}
            description="The shared Epic 14 export flow shows exportability, readiness, and preview details before generation is confirmed."
          >
            <label className="field">
              <span>Selected visit</span>
              <select
                className="input"
                value={effectiveVisitId ?? ''}
                onChange={(event) => setSelectedVisitId(event.target.value || null)}
              >
                {readinessPage.content.length === 0 ? (
                  <option value="">No visits available</option>
                ) : null}
                {readinessPage.content.map((item) => (
                  <option key={item.visitOccurrenceId} value={item.visitOccurrenceId}>
                    {item.visitOccurrenceId} · {item.payerName ?? 'No payer'} · {item.readinessStatus}
                  </option>
                ))}
              </select>
            </label>
            {!effectiveVisitId ? (
              <RevenueModuleState
                title="No visit selected"
                description="Choose a readiness item to load export preview context."
                variant="readonly"
              />
            ) : null}
            {currentSection === 'payroll-export' && payrollPreview ? (
              <div className="revenue-detail-stack">
                <RevenueStatusBanner
                  status={humanizeToken(payrollPreview.readinessStatus)}
                  summary={exportStatusSummary(payrollPreview.exportable, payrollPreview.blockedReason)}
                  tone={statusTone(payrollPreview.readinessStatus)}
                />
                {detail ? (
                  <div className="revenue-validation-grid">
                    <RevenueStatusBanner
                      status={`Completion ${humanizeToken(detail.completionValidation?.outcome)}`}
                      summary={detail.completionValidation?.summary ?? 'No completion validation is available.'}
                      tone={statusTone(detail.completionValidation?.outcome)}
                    />
                    <RevenueStatusBanner
                      status={`Signature ${humanizeToken(detail.signatureValidation?.outcome)}`}
                      summary={detail.signatureValidation?.summary ?? 'No signature validation is available.'}
                      tone={statusTone(detail.signatureValidation?.outcome)}
                    />
                  </div>
                ) : null}
                <dl className="revenue-data-list">
                  <div>
                    <dt>Visit</dt>
                    <dd>{effectiveVisitId}</dd>
                  </div>
                  <div>
                    <dt>Patient</dt>
                    <dd>{detail?.summary.patientId ?? 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Minutes</dt>
                    <dd>{payrollPreview.unitsOrMinutes}</dd>
                  </div>
                  <div>
                    <dt>Readiness</dt>
                    <dd>{humanizeToken(payrollPreview.readinessStatus)}</dd>
                  </div>
                  <div>
                    <dt>Payer</dt>
                    <dd>{payrollPreview.payerName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Caregiver profile</dt>
                    <dd>{payrollPreview.caregiverProfileId ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Service line</dt>
                    <dd>{detail?.payerServiceSummary?.serviceLineName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{branchLabelValue(branchLabel, detail?.summary.branchId)}</dd>
                  </div>
                  <div>
                    <dt>Authorization</dt>
                    <dd>{detail?.payerServiceSummary?.authorizationNumber ?? 'Not linked'}</dd>
                  </div>
                </dl>
                {!payrollPreview.exportable ? (
                  <RevenueModuleState
                    title="Blocked records stay visible"
                    description={payrollPreview.blockedReason ?? 'This payroll export is blocked until upstream readiness issues are resolved.'}
                    variant="readonly"
                  />
                ) : null}
                <div className="revenue-action-row">
                  <button className="button" disabled={!canGenerateExports || mutationState === 'saving'} onClick={handleGeneratePayroll} type="button">
                    Generate payroll export
                  </button>
                  <Link className="button button-secondary" to={`/app/revenue-readiness/visits/${effectiveVisitId}`}>
                    Open readiness detail
                  </Link>
                </div>
              </div>
            ) : null}
            {currentSection === 'invoice-export' && invoicePreview ? (
              <div className="revenue-detail-stack">
                <RevenueStatusBanner
                  status={humanizeToken(invoicePreview.readinessStatus)}
                  summary={exportStatusSummary(invoicePreview.exportable, invoicePreview.blockedReason)}
                  tone={statusTone(invoicePreview.readinessStatus)}
                />
                {detail ? (
                  <div className="revenue-validation-grid">
                    <RevenueStatusBanner
                      status={`Completion ${humanizeToken(detail.completionValidation?.outcome)}`}
                      summary={detail.completionValidation?.summary ?? 'No completion validation is available.'}
                      tone={statusTone(detail.completionValidation?.outcome)}
                    />
                    <RevenueStatusBanner
                      status={`Signature ${humanizeToken(detail.signatureValidation?.outcome)}`}
                      summary={detail.signatureValidation?.summary ?? 'No signature validation is available.'}
                      tone={statusTone(detail.signatureValidation?.outcome)}
                    />
                  </div>
                ) : null}
                <dl className="revenue-data-list">
                  <div>
                    <dt>Visit</dt>
                    <dd>{effectiveVisitId}</dd>
                  </div>
                  <div>
                    <dt>Patient</dt>
                    <dd>{detail?.summary.patientId ?? 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Units</dt>
                    <dd>{invoicePreview.unitsOrMinutes}</dd>
                  </div>
                  <div>
                    <dt>Readiness</dt>
                    <dd>{humanizeToken(invoicePreview.readinessStatus)}</dd>
                  </div>
                  <div>
                    <dt>Payer</dt>
                    <dd>{invoicePreview.payerName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Authorization</dt>
                    <dd>{detail?.payerServiceSummary?.authorizationNumber ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Service line</dt>
                    <dd>{detail?.payerServiceSummary?.serviceLineName ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{branchLabelValue(branchLabel, detail?.summary.branchId)}</dd>
                  </div>
                </dl>
                {canViewPayer && detail?.payerServiceSummary ? (
                  <div className="revenue-detail-subsection">
                    <h4>Payer and service summary</h4>
                    <dl className="revenue-data-list">
                      <div>
                        <dt>Payer</dt>
                        <dd>{detail.payerServiceSummary.payerName ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Service line</dt>
                        <dd>{detail.payerServiceSummary.serviceLineName ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Authorization</dt>
                        <dd>{detail.payerServiceSummary.authorizationNumber ?? 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Branch</dt>
                        <dd>{branchLabelValue(branchLabel, detail.payerServiceSummary.branchId)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
                {!invoicePreview.exportable ? (
                  <RevenueModuleState
                    title="Blocked or invalid invoice output remains controlled"
                    description={invoicePreview.blockedReason ?? 'This invoice export is blocked until readiness issues are resolved.'}
                    variant="readonly"
                  />
                ) : null}
                <div className="revenue-action-row">
                  <button className="button" disabled={!canGenerateExports || mutationState === 'saving'} onClick={handleGenerateInvoice} type="button">
                    Generate invoice export
                  </button>
                  <Link className="button button-secondary" to={`/app/revenue-readiness/visits/${effectiveVisitId}`}>
                    Open readiness detail
                  </Link>
                </div>
              </div>
            ) : null}
            {!canGenerateExports ? (
              <RevenueModuleState
                title="Export generation is read only for this role"
                description="The Epic 14 export route is visible, but generation actions require the backend export permission."
                variant="readonly"
              />
            ) : null}
          </RevenuePanel>
        ) : null}

        {currentSection === 'authorization' ? (
          <RevenuePanel
            title="Authorization usage summary"
            description="The authorization route keeps unit posture, counted visits, and recalculation in one shared Epic 14 panel."
          >
            {!canViewUsage ? (
              <RevenueModuleState
                title="Authorization usage summary is not available for this role"
                description="This Epic 14 route renders a controlled state when the backend authorization-usage permission is missing."
                variant="readonly"
              />
            ) : !authorizationUsage ? (
              <RevenueModuleState
                title="No authorization usage summary is loaded"
                description="Open the route from readiness detail or use a valid authorization route."
                variant="readonly"
              />
            ) : (
              <div className="revenue-detail-stack">
                <RevenueStatusBanner
                  status={humanizeToken(authorizationUsage.usagePosture)}
                  summary={`${authorizationUsage.usedUnits} used of ${authorizationUsage.authorizedUnits ?? 'unbounded'} authorized units.`}
                  tone={statusTone(authorizationUsage.usagePosture)}
                />
                <dl className="revenue-data-list">
                  <div>
                    <dt>Authorization</dt>
                    <dd>{authorizationUsage.authorizationId}</dd>
                  </div>
                  <div>
                    <dt>Patient</dt>
                    <dd>{authorizationUsage.patientId}</dd>
                  </div>
                  <div>
                    <dt>Authorized units</dt>
                    <dd>{authorizationUsage.authorizedUnits ?? 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Used units</dt>
                    <dd>{authorizationUsage.usedUnits}</dd>
                  </div>
                  <div>
                    <dt>Remaining units</dt>
                    <dd>{authorizationUsage.remainingUnits ?? 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Counted visits</dt>
                    <dd>{authorizationUsage.countedVisitCount}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{branchLabelValue(branchLabel, authorizationUsage.branchId)}</dd>
                  </div>
                  <div>
                    <dt>Service line</dt>
                    <dd>{authorizationUsage.serviceLineId ?? 'Not linked'}</dd>
                  </div>
                  <div>
                    <dt>Evaluated at</dt>
                    <dd>{formatDateTime(authorizationUsage.evaluatedAt)}</dd>
                  </div>
                </dl>
                <RevenueModuleState
                  title="Usage posture guidance"
                  description={usagePostureSummary(authorizationUsage)}
                  variant={
                    authorizationUsage.usagePosture === 'NEAR_LIMIT' || authorizationUsage.usagePosture === 'OVER_LIMIT'
                      ? 'info'
                      : 'readonly'
                  }
                />
                <div className="revenue-action-row">
                  <button className="button" disabled={!canRecalculate || mutationState === 'saving'} onClick={handleRecalculateAuthorization} type="button">
                    Recalculate authorization usage
                  </button>
                </div>
                <RevenueModuleState
                  title="Usage history"
                  description={`The backend currently returns ${authorizationHistoryCount} audit-linked authorization usage events for this record.`}
                  variant="info"
                />
              </div>
            )}
          </RevenuePanel>
        ) : null}

        {canViewAudit ? (
          <RevenuePanel
            title="Audit-aware route context"
            description="Epic 14 mutations and summaries stay linked to audit context without exposing more patient or payer detail than needed on the workspace surface."
          >
            <RevenueAuditCallout
              title="Revenue operations are audit-linked"
              body="Recalculation, blocker changes, and export generation should remain easy to review through the shared audit workspace while this route stays operationally focused."
              links={[
                {
                  to: '/app/revenue-readiness/command-center',
                  label: 'Open revenue summary',
                },
                {
                  to: detail?.summary.visitOccurrenceId
                    ? auditQuery(detail.summary.visitOccurrenceId)
                    : authorizationId
                      ? auditQuery(authorizationId)
                      : '/app/admin/audit',
                  label: detail?.summary.visitOccurrenceId || authorizationId ? 'Open filtered audit trail' : 'Open audit log',
                },
              ]}
            />
          </RevenuePanel>
        ) : null}
      </RevenueWorkspaceGrid>
    </RevenueWorkspaceShell>
  );
}
