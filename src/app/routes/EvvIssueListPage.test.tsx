import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvvIssueListPage } from './EvvIssueListPage';

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
    fetchEvvReadiness: vi.fn(),
    fetchMobileVisitExceptions: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('EvvIssueListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-1',
          userId: 'user-1',
          forcedLogoutAt: '2026-04-21T18:00:00-05:00',
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
        permissions: [
          'view_evv_issue_workspace',
          'manage_mobile_evv_exceptions',
          'view_mobile_missed_visits',
          'receive_mobile_evv_notifications',
          'view_scheduling_workspace',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchEvvReadiness).mockResolvedValue([
      {
        visitId: 'visit-1',
        verificationSessionId: 'evv-session-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        caregiverProfileId: 'caregiver-1',
        verificationStatus: 'MISSED_VISIT_REPORTED',
        complianceOutcome: 'MISSED_VISIT',
        startEventPresent: false,
        endEventPresent: false,
        geofenceOutcome: 'NOT_EVALUABLE',
        signatureComplete: false,
        openExceptionCount: 1,
        missedVisitReported: true,
        warnings: [],
        blockers: ['Missed visit reported'],
      },
    ]);

    vi.mocked(sessionApi.fetchMobileVisitExceptions).mockResolvedValue([
      {
        id: 'exception-1',
        verificationSessionId: 'evv-session-1',
        visitId: 'visit-1',
        caregiverProfileId: 'caregiver-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        exceptionType: 'GEOFENCE_OUT_OF_RANGE',
        severity: 'HIGH',
        reasonCode: 'gps_out_of_range',
        narrative: 'Patient met caregiver in lobby, outside visit geofence.',
        status: 'OPEN',
        acknowledgedAt: null,
        resolvedAt: null,
      },
    ]);
  });

  it('renders missed-visit and exception issues for authorized coordinator roles', async () => {
    render(
      <MemoryRouter>
        <EvvIssueListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Missed visits')).toBeInTheDocument();
    expect(screen.getByText('Open EVV exceptions')).toBeInTheDocument();
    expect(screen.getByText('Missed Visit Reported')).toBeInTheDocument();
    expect(screen.getByText('Geofence Out Of Range')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open audit activity' }).length).toBeGreaterThan(0);
  });

  it('applies filters through the backend readiness and exception APIs', async () => {
    render(
      <MemoryRouter>
        <EvvIssueListPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Branch ID'), {
      target: { value: 'branch-1' },
    });
    fireEvent.change(screen.getByLabelText('Compliance outcome'), {
      target: { value: 'MISSED_VISIT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(sessionApi.fetchEvvReadiness).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          complianceOutcome: 'MISSED_VISIT',
        }),
      );
    });
  });

  it('renders a controlled unauthorized state when the backend rejects EVV issue access', async () => {
    vi.mocked(sessionApi.fetchEvvReadiness).mockRejectedValueOnce(new sessionApi.ApiError(403, 'Forbidden'));

    render(
      <MemoryRouter>
        <EvvIssueListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('EVV issue visibility is restricted.')).toBeInTheDocument();
    expect(
      screen.getByText('Only authorized coordinators, reviewers, or supervisors can view EVV issues.'),
    ).toBeInTheDocument();
  });
});
