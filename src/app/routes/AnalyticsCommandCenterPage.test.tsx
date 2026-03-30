import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AnalyticsCommandCenterPage } from './AnalyticsCommandCenterPage';

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
    fetchAnalyticsBacklogDrilldown: vi.fn(),
    fetchAnalyticsCaregiverUtilization: vi.fn(),
    fetchAnalyticsRevenueDrilldown: vi.fn(),
    fetchAnalyticsComplianceDrilldown: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('AnalyticsCommandCenterPage', () => {
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
          'view_scheduling_workspace',
          'view_review_workspace',
          'view_revenue_readiness_workspace',
          'view_compliance_workspace',
        ],
        defaultRoute: '/app/analytics/command-center',
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
      branchPerformanceSummaries: [],
      backlogSummaries: [],
      readinessComplianceSummaries: [],
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
      size: 8,
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
          utilizationPosture: 'HIGH',
          evaluatedAt: '2026-03-30T12:00:00Z',
        },
      ],
      page: 0,
      size: 8,
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
      size: 8,
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
      size: 8,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it('renders the analytics command center with actionable lanes and audit links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analytics/command-center']}>
        <Routes>
          <Route
            path="/app/analytics/command-center"
            element={<AnalyticsCommandCenterPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics command center')).toBeInTheDocument();
      expect(screen.getByText('4 QA backlog')).toBeInTheDocument();
      expect(screen.getByText('Open caregiver utilization')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Utilization/i })).toHaveAttribute(
        'href',
        '/app/analytics/caregiver-utilization',
      );
      expect(
        screen.getByRole('link', { name: 'Revenue summary audit activity' }),
      ).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=ANALYTICS_REVENUE_READINESS_SUMMARY_REFRESHED',
      );
    });
  });

  it('shows a controlled denied state without analytics access', async () => {
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
      <MemoryRouter initialEntries={['/app/analytics/command-center']}>
        <Routes>
          <Route
            path="/app/analytics/command-center"
            element={<AnalyticsCommandCenterPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Analytics command center is not available for this role.'),
    ).toBeInTheDocument();
  });
});
