import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AnalyticsWorkspacePage } from './AnalyticsWorkspacePage';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../access/access-context', () => ({
  useAccess: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(() => null),
}));

vi.mock('../auth/session-api', async () => {
  const actual = await vi.importActual('../auth/session-api');
  return {
    ...actual,
    fetchBranches: vi.fn(),
    fetchAnalyticsDashboardSummary: vi.fn(),
    fetchAnalyticsOperationalDrilldown: vi.fn(),
    fetchAnalyticsBacklogDrilldown: vi.fn(),
    fetchAnalyticsBranchPerformance: vi.fn(),
    fetchAnalyticsCaregiverUtilization: vi.fn(),
    fetchAnalyticsRevenueDrilldown: vi.fn(),
    fetchAnalyticsComplianceDrilldown: vi.fn(),
    refreshAnalyticsDashboard: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('AnalyticsWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-15',
          userId: 'user-15',
          forcedLogoutAt: null,
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'AGENCY_OWNER',
        roleLabel: 'Agency Owner',
        branchScope: 'agency-wide',
        branchScopeLabel: 'Agency-wide branch access',
        assignedBranchIds: [],
        permissions: [
          'view_analytics_workspace',
          'view_audit_log',
          'view_branch_performance_metrics',
          'view_caregiver_utilization_metrics',
          'view_qa_backlog_metrics',
          'view_revenue_readiness_metrics',
          'view_compliance_exception_metrics',
          'refresh_dashboard_metrics',
          'view_documentation_workspace',
          'view_review_workspace',
          'view_revenue_readiness_workspace',
          'view_compliance_workspace',
          'view_scheduling_workspace',
        ],
        defaultRoute: '/app/analytics',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        agencyId: 'agency-1',
        name: 'North Branch',
        code: 'NORTH',
        address: '123 Main St',
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchAnalyticsDashboardSummary).mockResolvedValue({
      dashboardSnapshot: {
        id: 'snapshot-1',
        branchId: 'branch-1',
        snapshotDate: '2026-03-30',
        todaysVisitCount: 12,
        unfilledVisitCount: 2,
        lateStartCount: 1,
        missedVisitCount: 1,
        documentationAgingCount: 3,
        qaBacklogCount: 4,
        caregiverUtilizationCount: 8,
        revenueBlockedCount: 2,
        complianceExceptionCount: 1,
        generatedAt: '2026-03-30T12:00:00Z',
      },
      branchPerformanceSummaries: [
        {
          id: 'branch-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          todaysVisitCount: 12,
          unfilledVisitCount: 2,
          lateStartCount: 1,
          missedVisitCount: 1,
          documentationAgingCount: 3,
          qaBacklogCount: 4,
          performancePosture: 'ATTENTION_REQUIRED',
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      backlogSummaries: [
        {
          id: 'backlog-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          documentationAgingCount: 3,
          agingBucketsJson: JSON.stringify({ zero_to_three_days: 2, four_to_seven_days: 1 }),
          pendingReviewCount: 4,
          returnedForFixCount: 1,
          overdueReviewCount: 2,
          backlogPosture: 'ATTENTION_REQUIRED',
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      readinessComplianceSummaries: [
        {
          id: 'readiness-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          revenueReadyCount: 8,
          revenueWarningCount: 2,
          revenueBlockedCount: 2,
          complianceReadyCount: 10,
          complianceWarningCount: 1,
          complianceExceptionCount: 1,
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
    });

    vi.mocked(sessionApi.fetchAnalyticsOperationalDrilldown).mockResolvedValue({
      content: [
        {
          visitOccurrenceId: 'visit-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          caregiverProfileId: 'caregiver-1',
          caregiverDisplayName: 'Alex Care',
          plannedStartAt: '2026-03-30T09:00:00Z',
          plannedEndAt: '2026-03-30T10:00:00Z',
          visitStatus: 'PLANNED',
          detailStatus: 'MISSED_VISIT',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchAnalyticsBacklogDrilldown).mockResolvedValue({
      content: [
        {
          reviewWorkItemId: 'review-1',
          sourceRecordId: 'doc-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          status: 'RETURNED_FOR_FIX',
          priority: 'HIGH',
          enteredQueueAt: '2026-03-29T15:00:00Z',
          dueAt: '2026-03-30T08:00:00Z',
          overdue: true,
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchAnalyticsBranchPerformance).mockResolvedValue({
      content: [
        {
          id: 'branch-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          todaysVisitCount: 12,
          unfilledVisitCount: 2,
          lateStartCount: 1,
          missedVisitCount: 1,
          documentationAgingCount: 3,
          qaBacklogCount: 4,
          performancePosture: 'ATTENTION_REQUIRED',
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchAnalyticsCaregiverUtilization).mockResolvedValue({
      content: [
        {
          id: 'util-1',
          branchId: 'branch-1',
          caregiverProfileId: 'caregiver-1',
          snapshotDate: '2026-03-30',
          assignedVisitCount: 5,
          completedVisitCount: 4,
          scheduledMinutes: 300,
          utilizationPosture: 'BALANCED',
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchAnalyticsRevenueDrilldown).mockResolvedValue({
      content: [
        {
          visitOccurrenceId: 'visit-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          readinessStatus: 'BLOCKED',
          exceptionCount: 2,
          warningCount: 1,
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchAnalyticsComplianceDrilldown).mockResolvedValue({
      content: [
        {
          patientId: 'patient-1',
          branchId: 'branch-1',
          serviceLineId: 'service-line-1',
          readinessStatus: 'NON_COMPLIANT',
          certificationPeriodStatus: 'EXPIRING_SOON',
          activeRiskReminderCount: 2,
          gapCount: 3,
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.refreshAnalyticsDashboard).mockResolvedValue({
      dashboardSnapshot: {
        id: 'snapshot-1',
        branchId: 'branch-1',
        snapshotDate: '2026-03-30',
        todaysVisitCount: 12,
        unfilledVisitCount: 2,
        lateStartCount: 1,
        missedVisitCount: 1,
        documentationAgingCount: 3,
        qaBacklogCount: 4,
        caregiverUtilizationCount: 8,
        revenueBlockedCount: 2,
        complianceExceptionCount: 1,
        generatedAt: '2026-03-30T12:05:00Z',
      },
      metricSnapshots: [],
      branchPerformanceSummaries: [
        {
          id: 'branch-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          todaysVisitCount: 12,
          unfilledVisitCount: 2,
          lateStartCount: 1,
          missedVisitCount: 1,
          documentationAgingCount: 3,
          qaBacklogCount: 4,
          performancePosture: 'ATTENTION_REQUIRED',
          evaluatedAt: '2026-03-30T12:05:00Z',
        },
      ],
      utilizationSummaries: [],
      backlogSummaries: [
        {
          id: 'backlog-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          documentationAgingCount: 3,
          agingBucketsJson: JSON.stringify({ zero_to_three_days: 2, four_to_seven_days: 1 }),
          pendingReviewCount: 4,
          returnedForFixCount: 1,
          overdueReviewCount: 2,
          backlogPosture: 'ATTENTION_REQUIRED',
          evaluatedAt: '2026-03-30T12:05:00Z',
        },
      ],
      readinessComplianceSummaries: [
        {
          id: 'readiness-summary-1',
          branchId: 'branch-1',
          snapshotDate: '2026-03-30',
          revenueReadyCount: 8,
          revenueWarningCount: 2,
          revenueBlockedCount: 2,
          complianceReadyCount: 10,
          complianceWarningCount: 1,
          complianceExceptionCount: 1,
          evaluatedAt: '2026-03-30T12:05:00Z',
        },
      ],
      trendSnapshots: [],
    });
  });

  it('renders the analytics dashboard foundation and shared refresh flow', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analytics']}>
        <Routes>
          <Route path="/app/analytics" element={<AnalyticsWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Analytics workspace')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12 today’s visits')).toBeInTheDocument();
      expect(screen.getByText('2 unfilled')).toBeInTheDocument();
      expect(screen.getByText('4 QA backlog')).toBeInTheDocument();
      expect(screen.getByText('Documentation aging and QA backlog')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'review-1' })).toHaveAttribute(
        'href',
        '/app/review/items/review-1',
      );
      expect(screen.getByText('Revenue and compliance summary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Snapshot' }));

    await waitFor(() => {
      expect(sessionApi.refreshAnalyticsDashboard).toHaveBeenCalled();
      expect(
        screen.getByText(
          'Analytics refresh completed, the workspace reloaded the latest backend snapshot, and the controlled operation was logged.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Audit and privacy context')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Dashboard snapshot audit activity' }),
      ).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=ANALYTICS_DASHBOARD_SNAPSHOT_GENERATED',
      );
    });
  });

  it('renders the operational drilldown route with source links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analytics/operational']}>
        <Routes>
          <Route path="/app/analytics/operational" element={<AnalyticsWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Operational drilldown')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'visit-1' })).toHaveAttribute(
        'href',
        '/app/scheduling/visits/visit-1',
      );
      expect(screen.getAllByText('North Branch').length).toBeGreaterThan(0);
      expect(screen.getByText('Alex Care')).toBeInTheDocument();
      expect(screen.getByText('Missed Visit (Planned)')).toBeInTheDocument();
    });
  });

  it('renders branch performance links and caregiver utilization metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analytics/branch-performance']}>
        <Routes>
          <Route path="/app/analytics/branch-performance" element={<AnalyticsWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Branch performance')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Operational' })).toHaveAttribute(
        'href',
        '/app/analytics/operational?branchId=branch-1&snapshotDate=2026-03-30',
      );
      expect(screen.getByRole('link', { name: 'Readiness' })).toHaveAttribute(
        'href',
        '/app/analytics/readiness?branchId=branch-1&snapshotDate=2026-03-30',
      );
      expect(screen.getByText('3 aging · 4 QA')).toBeInTheDocument();
    });

    render(
      <MemoryRouter initialEntries={['/app/analytics/caregiver-utilization']}>
        <Routes>
          <Route
            path="/app/analytics/caregiver-utilization"
            element={<AnalyticsWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Caregiver utilization')).toBeInTheDocument();
      expect(screen.getByText('300 min (5 hr)')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText(/Balanced/)).toBeInTheDocument();
    });
  });

  it('renders revenue and compliance drilldowns with source links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analytics/readiness']}>
        <Routes>
          <Route path="/app/analytics/readiness" element={<AnalyticsWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Revenue-readiness drilldown')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Revenue readiness' })).toHaveAttribute(
        'href',
        '/app/revenue-readiness',
      );
      expect(screen.getByRole('link', { name: 'Compliance workspace' })).toHaveAttribute(
        'href',
        '/app/compliance/command-center',
      );
      expect(screen.getByText('Non Compliant (3 gaps)')).toBeInTheDocument();
    });
  });

  it('shows a controlled denied state without analytics workspace access', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/analytics']}>
        <Routes>
          <Route path="/app/analytics" element={<AnalyticsWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Analytics workspace is not available for this role.'),
    ).toBeInTheDocument();
  });
});
