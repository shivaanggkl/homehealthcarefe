import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CaregiverRecordWorkspacePage } from './CaregiverRecordWorkspacePage';

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
    fetchCaregiver: vi.fn(),
    fetchCaregiverAvailabilities: vi.fn(),
    fetchBranches: vi.fn(),
    fetchCaregiverGeographyPreferences: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

function renderWorkforceRoute(path = '/app/workforce/caregiver-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={<CaregiverRecordWorkspacePage section="overview" />}
          path="/app/workforce/:caregiverId"
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderGeographyRoute(path = '/app/workforce/caregiver-1/geography') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={<CaregiverRecordWorkspacePage section="geography" />}
          path="/app/workforce/:caregiverId/geography"
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderAvailabilityRoute(path = '/app/workforce/caregiver-1/availability') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={<CaregiverRecordWorkspacePage section="availability" />}
          path="/app/workforce/:caregiverId/availability"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CaregiverRecordWorkspacePage', () => {
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
      loading: false,
      profile: {
        role: 'AGENCY_OWNER',
        roleLabel: 'Agency Owner',
        branchScope: 'agency-wide',
        branchScopeLabel: 'Agency-wide branch access',
        assignedBranchIds: [],
        permissions: [
          'view_workforce_workspace',
          'manage_caregiver_profiles',
          'manage_caregiver_credentials',
          'manage_caregiver_availability',
          'manage_caregiver_unavailability',
          'view_caregiver_performance',
        ],
        defaultRoute: '/app/settings/security',
        source: 'backend',
      },
      setRoleOverride: vi.fn(),
      setAssignedBranches: vi.fn(),
      clearOverride: vi.fn(),
    } as never);
  });

  it('renders the caregiver record shell and secondary navigation from live API data', async () => {
    vi.mocked(sessionApi.fetchCaregiver).mockResolvedValue({
      id: 'caregiver-1',
      agencyId: 'agency-1',
      agencyMembershipId: 'membership-1',
      userId: 'user-1',
      userFirstName: 'Jordan',
      userLastName: 'Miles',
      userEmail: 'jordan@example.com',
      userPhone: '312-555-0102',
      membershipRole: 'SCHEDULER_COORDINATOR',
      status: 'ACTIVE',
      caregiverCode: 'CG-1001',
      displayName: 'Jordan Miles',
      primaryBranchId: 'branch-1',
      primaryBranchName: 'North Branch',
      employmentType: 'FULL_TIME',
      startDate: '2026-01-15',
      endDate: null,
      notes: null,
    });

    renderWorkforceRoute();

    await waitFor(() => {
      expect(screen.getAllByText('Jordan Miles').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Caregiver code: CG-1001')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Credentials/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Performance/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Workforce changes are sensitive operations.')).toBeInTheDocument();
  });

  it('renders the live geography section for schedulability inputs', async () => {
    vi.mocked(sessionApi.fetchCaregiver).mockResolvedValue({
      id: 'caregiver-1',
      agencyId: 'agency-1',
      agencyMembershipId: 'membership-1',
      userId: 'user-1',
      userFirstName: 'Jordan',
      userLastName: 'Miles',
      userEmail: 'jordan@example.com',
      userPhone: '312-555-0102',
      membershipRole: 'SCHEDULER_COORDINATOR',
      status: 'ACTIVE',
      caregiverCode: 'CG-1001',
      displayName: 'Jordan Miles',
      primaryBranchId: 'branch-1',
      primaryBranchName: 'North Branch',
      employmentType: 'FULL_TIME',
      startDate: '2026-01-15',
      endDate: null,
      notes: null,
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
    vi.mocked(sessionApi.fetchCaregiverGeographyPreferences).mockResolvedValue([]);

    renderGeographyRoute();

    await waitFor(() => {
      expect(screen.getByText('Preferred geography')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Add preference' })).toBeInTheDocument();
    expect(screen.getByText('No geography preferences on file')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open matching audit activity' })).toHaveAttribute(
      'href',
      '/app/admin/audit?actionType=WORKFORCE_RECORD_UPDATED',
    );
  });

  it('shows an inline validation error for invalid recurring availability input', async () => {
    vi.mocked(sessionApi.fetchCaregiver).mockResolvedValue({
      id: 'caregiver-1',
      agencyId: 'agency-1',
      agencyMembershipId: 'membership-1',
      userId: 'user-1',
      userFirstName: 'Jordan',
      userLastName: 'Miles',
      userEmail: 'jordan@example.com',
      userPhone: '312-555-0102',
      membershipRole: 'SCHEDULER_COORDINATOR',
      status: 'ACTIVE',
      caregiverCode: 'CG-1001',
      displayName: 'Jordan Miles',
      primaryBranchId: 'branch-1',
      primaryBranchName: 'North Branch',
      employmentType: 'FULL_TIME',
      startDate: '2026-01-15',
      endDate: null,
      notes: null,
    });
    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([]);
    vi.mocked(sessionApi.fetchCaregiverAvailabilities).mockResolvedValue([]);

    renderAvailabilityRoute();

    await waitFor(() => {
      expect(screen.getByText('Availability windows')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add availability' }));

    expect(
      screen.getByText('Recurring availability requires day-of-week, start time, and end time.'),
    ).toBeInTheDocument();
  });

  it('marks restricted workforce sections when the backend access profile does not include their permissions', async () => {
    vi.mocked(useAccess).mockReturnValue({
      loading: false,
      profile: {
        role: 'BRANCH_ADMIN',
        roleLabel: 'Branch Admin',
        branchScope: 'assigned',
        branchScopeLabel: 'Assigned branches',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_workforce_workspace', 'manage_caregiver_profiles'],
        defaultRoute: '/app/workforce',
        source: 'backend',
      },
      setRoleOverride: vi.fn(),
      setAssignedBranches: vi.fn(),
      clearOverride: vi.fn(),
    } as never);
    vi.mocked(sessionApi.fetchCaregiver).mockResolvedValue({
      id: 'caregiver-1',
      agencyId: 'agency-1',
      agencyMembershipId: 'membership-1',
      userId: 'user-1',
      userFirstName: 'Jordan',
      userLastName: 'Miles',
      userEmail: 'jordan@example.com',
      userPhone: '312-555-0102',
      membershipRole: 'SCHEDULER_COORDINATOR',
      status: 'ACTIVE',
      caregiverCode: 'CG-1001',
      displayName: 'Jordan Miles',
      primaryBranchId: 'branch-1',
      primaryBranchName: 'North Branch',
      employmentType: 'FULL_TIME',
      startDate: '2026-01-15',
      endDate: null,
      notes: null,
    });

    renderWorkforceRoute();

    await waitFor(() => {
      expect(screen.getAllByText('Credentials').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Restricted').length).toBeGreaterThan(0);
  });
});
