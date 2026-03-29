import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileDocumentationPage } from './MobileDocumentationPage';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../access/access-context', () => ({
  useAccess: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(() => null),
}));

vi.mock('../components/DocumentationRecordEditor', () => ({
  DocumentationRecordEditor: ({ visitId }: { visitId: string }) => (
    <div>documentation-editor-{visitId}</div>
  ),
}));

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');

describe('MobileDocumentationPage', () => {
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
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_mobile_app',
          'view_visit_documentation',
          'draft_visit_documentation',
          'submit_visit_documentation',
        ],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);
  });

  it('renders the mobile documentation route with the shared editor', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/documentation']}>
        <Routes>
          <Route element={<MobileDocumentationPage />} path="/mobile/visits/:visitId/documentation" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Visit documentation' })).toBeInTheDocument();
    expect(screen.getByText('documentation-editor-visit-1')).toBeInTheDocument();
  });
});
