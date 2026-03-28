import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SetupOverviewPage } from './SetupOverviewPage';

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
    fetchServiceLines: vi.fn(),
    fetchVisitTypes: vi.fn(),
    fetchCaregiverSkills: vi.fn(),
    fetchCaregiverCertifications: vi.fn(),
    fetchTaskTemplates: vi.fn(),
    fetchDocumentationTemplates: vi.fn(),
    fetchBranchPolicies: vi.fn(),
    fetchAlertRules: vi.fn(),
    fetchMileagePaySettings: vi.fn(),
    fetchBranches: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('SetupOverviewPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'AGENCY_OWNER',
        roleLabel: 'Agency Owner',
        branchScope: 'agency-wide',
        branchScopeLabel: 'Agency-wide scope',
        permissions: [
          'view_setup_console',
          'manage_agency_profile_setup',
          'manage_service_line_setup',
          'manage_visit_type_setup',
          'manage_workforce_catalog_setup',
          'manage_task_template_setup',
          'manage_documentation_template_setup',
          'manage_branch_policy_setup',
          'manage_alert_rule_setup',
          'manage_mileage_pay_setup',
        ],
        defaultRoute: '/app/home',
      },
    } as never);

    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 2,
      totalPages: 2,
    });
    vi.mocked(sessionApi.fetchVisitTypes).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchCaregiverSkills).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 0,
      totalPages: 0,
    });
    vi.mocked(sessionApi.fetchCaregiverCertifications).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 3,
      totalPages: 3,
    });
    vi.mocked(sessionApi.fetchTaskTemplates).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 4,
      totalPages: 4,
    });
    vi.mocked(sessionApi.fetchDocumentationTemplates).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 0,
      totalPages: 0,
    });
    vi.mocked(sessionApi.fetchBranchPolicies).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 2,
      totalPages: 2,
    });
    vi.mocked(sessionApi.fetchAlertRules).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchMileagePaySettings).mockResolvedValue({
      agencyId: 'agency-1',
      effectiveAt: '2026-03-28T12:00:00Z',
      agencyDefault: {
        id: 'default-1',
        agencyId: 'agency-1',
        branchId: null,
        reimbursementStrategy: 'STANDARD_RATE',
        mileageRate: 0.67,
        travelPayEnabled: true,
        visitTypePayAdjustmentsJson: null,
        status: 'ACTIVE',
        effectiveFrom: null,
        effectiveTo: null,
        effectiveAtRequestedTime: true,
        branchOverride: false,
      },
      branchOverrides: [],
    });
    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      { id: 'branch-1', agencyId: 'agency-1', name: 'Chicago', code: 'CHI', address: '123 Main', timezone: 'America/Chicago', status: 'ACTIVE' },
    ]);
  });

  it('shows live setup summaries and highlights incomplete areas', async () => {
    render(
      <MemoryRouter>
        <SetupOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('2 configured').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('1 configured').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0 configured').length).toBeGreaterThan(0);
    expect(screen.getByText('1 effective setting scope')).toBeInTheDocument();
    expect(screen.getByText('1 active branch')).toBeInTheDocument();
    expect(screen.getAllByText('Needs setup').length).toBeGreaterThan(0);
  });
});
