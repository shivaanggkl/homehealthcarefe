import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaregiverWorkspacePage } from './CaregiverWorkspacePage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(() => null),
}));

vi.mock('../auth/session-api', async () => {
  const actual = await vi.importActual('../auth/session-api');
  return {
    ...actual,
    fetchCaregivers: vi.fn(),
    fetchBranches: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

describe('CaregiverWorkspacePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);
  });

  it('renders the caregiver workspace preview and quick-entry actions from live API data', async () => {
    vi.mocked(sessionApi.fetchCaregivers)
      .mockResolvedValueOnce({
        content: [
          {
            id: 'caregiver-1',
            status: 'ACTIVE',
            caregiverCode: 'CG-1001',
            displayName: 'Jordan Miles',
            agencyMembershipId: 'membership-1',
            userId: 'user-1',
            userFullName: 'Jordan Miles',
            userEmail: 'jordan@example.com',
            userPhone: '312-555-0102',
            branchId: 'branch-1',
            branchName: 'North Branch',
          },
        ],
        page: 0,
        size: 8,
        totalElements: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        content: [],
        page: 0,
        size: 1,
        totalElements: 5,
        totalPages: 5,
      });
    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        agencyId: 'agency-1',
        name: 'North Branch',
        code: 'NORTH',
        address: '123 Main',
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      },
    ]);

    render(
      <MemoryRouter>
        <CaregiverWorkspacePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Jordan Miles')).toBeInTheDocument();
    });

    expect(screen.getByText('CG-1001')).toBeInTheDocument();
    expect(screen.getAllByText('North Branch').length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New caregiver' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/workforce/new/profile');
  });
});
