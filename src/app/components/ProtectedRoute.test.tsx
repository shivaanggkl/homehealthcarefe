import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../access/access-context', () => ({
  useAccess: vi.fn(),
}));

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);
  });

  it('renders the child route when the required Epic 2 permission is present', () => {
    vi.mocked(useAccess).mockReturnValue({
      loading: false,
      profile: {
        role: 'AGENCY_OWNER',
        roleLabel: 'Agency Owner',
        branchScope: 'agency-wide',
        branchScopeLabel: 'Agency-wide scope',
        permissions: ['manage_service_line_setup'],
        defaultRoute: '/app/home',
      },
    } as never);

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermission="manage_service_line_setup">
          <div>Service line setup route</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Service line setup route')).toBeInTheDocument();
  });

  it('renders a controlled unauthorized state when the permission is missing', () => {
    vi.mocked(useAccess).mockReturnValue({
      loading: false,
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        permissions: ['view_session_home'],
        defaultRoute: '/app/home',
      },
    } as never);

    render(
      <MemoryRouter>
        <ProtectedRoute
          deniedMessage="Task templates are not available for this role."
          deniedTitle="Task templates are restricted."
          requiredPermission="manage_task_template_setup"
        >
          <div>Task templates route</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Task templates are restricted.')).toBeInTheDocument();
    expect(screen.getByText('Task templates are not available for this role.')).toBeInTheDocument();
  });
});
