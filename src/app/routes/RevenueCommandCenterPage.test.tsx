import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RevenueCommandCenterPage } from './RevenueCommandCenterPage';

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
    fetchRevenueReadinessList: vi.fn(),
    fetchRevenueExceptionFlags: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('RevenueCommandCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-14',
          userId: 'user-14',
          forcedLogoutAt: null,
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'BRANCH_ADMIN',
        roleLabel: 'Branch Admin',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_revenue_readiness_workspace', 'view_audit_log'],
        defaultRoute: '/app/revenue-readiness',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        code: 'NORTH',
        name: 'North Finance',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchRevenueReadinessList).mockResolvedValue({
      content: [
        {
          visitOccurrenceId: 'visit-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          serviceLineId: 'service-1',
          readinessStatus: 'BLOCKED',
          exceptionCount: 2,
          warningCount: 1,
          payerName: 'Prime Payer',
          evaluatedAt: '2026-03-30T10:00:00Z',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchRevenueExceptionFlags).mockResolvedValue({
      content: [
        {
          id: 'flag-1',
          targetType: 'VISIT',
          targetId: 'visit-1',
          exceptionType: 'MISSING_SIGNATURE',
          severity: 'BLOCKING',
          reasonCode: 'PATIENT_SIGNATURE_MISSING',
          summary: 'Patient signature is missing.',
          detectedAt: '2026-03-30T10:01:00Z',
          clearedAt: null,
          branchId: 'branch-1',
        },
        {
          id: 'flag-2',
          targetType: 'VISIT',
          targetId: 'visit-1',
          exceptionType: 'INCOMPLETE_VISIT',
          severity: 'BLOCKING',
          reasonCode: 'VISIT_NOT_COMPLETE',
          summary: 'Visit completion validation failed.',
          detectedAt: '2026-03-30T10:02:00Z',
          clearedAt: null,
          branchId: 'branch-1',
        },
        {
          id: 'flag-3',
          targetType: 'AUTHORIZATION',
          targetId: 'auth-1',
          exceptionType: 'AUTHORIZATION_ISSUE',
          severity: 'WARNING',
          reasonCode: 'NEAR_LIMIT',
          summary: 'Authorization is nearing its limit.',
          detectedAt: '2026-03-30T10:03:00Z',
          clearedAt: null,
          branchId: 'branch-1',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 3,
      totalPages: 1,
    });
  });

  it('renders coordinator-facing revenue visibility and audit-aware links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/revenue-readiness/command-center']}>
        <Routes>
          <Route
            path="/app/revenue-readiness/command-center"
            element={<RevenueCommandCenterPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Revenue command center')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1 blocked readiness')).toBeInTheDocument();
      expect(screen.getByText('1 missing signature')).toBeInTheDocument();
      expect(screen.getByText('1 completion failure')).toBeInTheDocument();
      expect(screen.getByText('1 authorization warning')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Revenue readiness audit activity' })).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=REVENUE_READINESS_RECALCULATED',
      );
      expect(screen.getByRole('link', { name: /open authorization warning/i })).toHaveAttribute(
        'href',
        '/app/revenue-readiness/authorizations/auth-1',
      );
    });
  });

  it('shows a controlled denied state without revenue workspace access', async () => {
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
      <MemoryRouter initialEntries={['/app/revenue-readiness/command-center']}>
        <Routes>
          <Route
            path="/app/revenue-readiness/command-center"
            element={<RevenueCommandCenterPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Revenue summary is not available for this role.'),
    ).toBeInTheDocument();
  });
});
