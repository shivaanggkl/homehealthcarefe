import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ComplianceCommandCenterPage } from './ComplianceCommandCenterPage';

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
    fetchComplianceDashboard: vi.fn(),
    fetchComplianceDashboardPatients: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('ComplianceCommandCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-1',
          userId: 'user-1',
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
        permissions: ['view_compliance_workspace', 'view_compliance_dashboard', 'view_audit_log'],
        defaultRoute: '/app/compliance',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        code: 'NORTH',
        name: 'North Compliance',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchComplianceDashboard).mockResolvedValue([
      {
        branchId: 'branch-1',
        branchName: 'North Compliance',
        totalPatients: 4,
        readyCount: 1,
        warningCount: 2,
        nonCompliantCount: 1,
        unknownCount: 0,
        activeRiskReminderCount: 2,
        acknowledgmentGapCount: 1,
      },
    ]);

    vi.mocked(sessionApi.fetchComplianceDashboardPatients).mockResolvedValue({
      content: [
        {
          patientId: 'patient-1',
          branchId: 'branch-1',
          branchName: 'North Compliance',
          firstName: 'Nora',
          lastName: 'Careplan',
          readinessStatus: 'WARNING',
          certificationPeriodStatus: 'EXPIRED',
          activeRiskReminderCount: 1,
          gapCount: 2,
          acknowledgmentGapCount: 1,
          evaluatedAt: '2026-08-01T18:00:00Z',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it('renders coordinator-facing compliance visibility with actionable lanes and audit links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance/command-center']}>
        <Routes>
          <Route
            element={<ComplianceCommandCenterPage />}
            path="/app/compliance/command-center"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Compliance command center')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1 patient gap')).toBeInTheDocument();
      expect(screen.getByText('1 certification risk')).toBeInTheDocument();
      expect(screen.getByText('1 acknowledgment gap')).toBeInTheDocument();
      expect(screen.getAllByText('Nora Careplan').length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'Acknowledgment audit activity' })).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=EPIC11_CONSENT_ACKNOWLEDGMENT_RECORDED',
      );
    });
  });

  it('shows a controlled denied state without compliance workspace access', async () => {
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
      <MemoryRouter initialEntries={['/app/compliance/command-center']}>
        <Routes>
          <Route
            element={<ComplianceCommandCenterPage />}
            path="/app/compliance/command-center"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Compliance command center is not available for this role.'),
    ).toBeInTheDocument();
  });
});
