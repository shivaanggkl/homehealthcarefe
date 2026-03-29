import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationWorkspacePage } from './DocumentationWorkspacePage';

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
    fetchDocumentationTaskLibrary: vi.fn(),
    fetchEpic8DocumentationTemplates: vi.fn(),
    fetchVisitDocumentationRecords: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('DocumentationWorkspacePage', () => {
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
        permissions: [
          'view_documentation_workspace',
          'manage_documentation_templates',
          'manage_documentation_task_library',
          'view_visit_documentation',
          'generate_printable_documentation_summary',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchEpic8DocumentationTemplates).mockResolvedValue({
      content: [
        {
          id: 'template-1',
          agencyId: 'agency-1',
          name: 'Skilled Nursing Routine Note',
          code: 'SN-RV',
          templateType: 'VISIT_NOTE',
          structuredDefinitionJson: '{"version":1}',
          version: 1,
          status: 'ACTIVE',
          displayOrder: 1,
          serviceLineId: 'service-line-1',
          visitTypeId: 'visit-type-1',
          branchId: 'branch-1',
          helpText: 'Complete before submitting.',
          allowedActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
          requiresSignatureVerification: false,
        },
      ],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchDocumentationTaskLibrary).mockResolvedValue({
      content: [
        {
          id: 'task-1',
          agencyId: 'agency-1',
          serviceLineId: 'service-line-1',
          visitTypeId: 'visit-type-1',
          name: 'Vitals',
          code: 'VITALS',
          description: 'Capture vitals',
          category: 'CLINICAL',
          status: 'ACTIVE',
          displayOrder: 1,
          defaultSortOrder: 1,
          defaultCompletionExpectation: 'Record blood pressure.',
          requiredByDefault: true,
        },
      ],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });

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
          templateName: 'Skilled Nursing Routine Note',
          status: 'DRAFT',
          lastSavedAt: '2026-04-21T09:15:00-05:00',
          submittedAt: null,
          authorMembershipId: 'membership-1',
          authorEmail: 'caregiver@northstar.example',
        },
      ],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it('renders the Epic 8 workspace with live backend counts', async () => {
    render(
      <MemoryRouter>
        <DocumentationWorkspacePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Documentation workspace')).toBeInTheDocument();
    expect(await screen.findByText('Skilled Nursing Routine Note')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1 template')).toBeInTheDocument();
      expect(screen.getByText('1 reusable task')).toBeInTheDocument();
      expect(screen.getByText('1 recent record')).toBeInTheDocument();
    });
  });
});
