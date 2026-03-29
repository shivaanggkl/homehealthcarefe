import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationStatusPage } from './DocumentationStatusPage';

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
    fetchVisitDocumentationRecords: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('DocumentationStatusPage', () => {
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
        role: 'SCHEDULER_COORDINATOR',
        roleLabel: 'Scheduler Coordinator',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_documentation_workspace', 'view_visit_documentation'],
        defaultRoute: '/app/documentation',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        agencyId: 'agency-1',
        name: 'North Branch',
        code: 'NB',
        address: '123 Main St',
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      },
    ] as never);

    vi.mocked(sessionApi.fetchVisitDocumentationRecords).mockResolvedValue({
      content: [
        {
          id: 'record-1',
          visitOccurrenceId: 'visit-1',
          patientId: 'patient-1',
          patientFirstName: 'Ava',
          patientLastName: 'Patient',
          branchId: 'branch-1',
          branchName: 'North Branch',
          templateId: 'template-1',
          templateName: 'Routine Note',
          status: 'IN_PROGRESS',
          lastSavedAt: '2026-03-29T10:00:00-05:00',
          submittedAt: null,
          authorMembershipId: 'membership-1',
          authorEmail: 'caregiver@northstar.example',
        },
        {
          id: 'record-2',
          visitOccurrenceId: 'visit-2',
          patientId: 'patient-2',
          patientFirstName: 'Leo',
          patientLastName: 'Patient',
          branchId: 'branch-1',
          branchName: 'North Branch',
          templateId: 'template-2',
          templateName: 'Submitted Note',
          status: 'SUBMITTED',
          lastSavedAt: '2026-03-29T11:00:00-05:00',
          submittedAt: '2026-03-29T11:05:00-05:00',
          authorMembershipId: 'membership-2',
          authorEmail: 'other@northstar.example',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    });
  });

  it('renders focused documentation status visibility with filters and links', async () => {
    render(
      <MemoryRouter>
        <DocumentationStatusPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Routine Note')).toBeInTheDocument();
    expect(screen.getAllByText('Incomplete').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open draft-save audit activity' })).toHaveAttribute(
      'href',
      '/app/admin/audit?actionType=DOC_DRAFT_SAVED',
    );

    fireEvent.change(screen.getByPlaceholderText('Filter by patient name'), {
      target: { value: 'Leo' },
    });

    expect(screen.queryByText('Routine Note')).not.toBeInTheDocument();
    expect(screen.getByText('Submitted Note')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open note' })[0]).toHaveAttribute(
      'href',
      '/app/documentation/visits/visit-2',
    );
  });
});
