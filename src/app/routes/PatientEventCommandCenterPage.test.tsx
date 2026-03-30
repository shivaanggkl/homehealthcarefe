import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientEventCommandCenterPage } from './PatientEventCommandCenterPage';

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
    fetchPatientEventIncidents: vi.fn(),
    fetchPatientEventInfections: vi.fn(),
    fetchPatientEventFollowUps: vi.fn(),
    fetchPatientEventEscalations: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('PatientEventCommandCenterPage', () => {
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
        permissions: ['view_patient_event_workspace', 'view_audit_log'],
        defaultRoute: '/app/patient-events',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        code: 'NORTH',
        name: 'North Branch',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchPatientEventIncidents).mockResolvedValue([
      {
        id: 'incident-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        visitOccurrenceId: 'visit-1',
        incidentType: 'FALL',
        severityLabel: 'HIGH',
        occurredAt: '2026-08-01T10:00:00Z',
        reportedAt: '2026-08-01T10:30:00Z',
        summary: 'Patient fall in living room.',
        status: 'OPEN',
        reportedByMembershipId: 'membership-1',
        resolvedAt: null,
      },
    ]);

    vi.mocked(sessionApi.fetchPatientEventInfections).mockResolvedValue([
      {
        id: 'infection-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        relatedIncidentId: 'incident-1',
        onsetDate: '2026-08-01',
        identifiedAt: '2026-08-02T09:00:00Z',
        infectionType: 'UTI',
        summary: 'Urinary tract infection.',
        status: 'ACTIVE',
        resolvedAt: null,
      },
    ]);

    vi.mocked(sessionApi.fetchPatientEventFollowUps).mockResolvedValue([
      {
        id: 'follow-up-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        ownerMembershipId: 'membership-2',
        ownerRole: null,
        assignedAt: '2026-08-01T11:00:00Z',
        dueAt: '2026-08-02T11:00:00Z',
        completionAt: null,
        followUpNote: 'Review safety plan.',
        status: 'OPEN',
      },
    ]);

    vi.mocked(sessionApi.fetchPatientEventEscalations).mockResolvedValue([
      {
        id: 'escalation-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'WOUND_RECORD',
        targetId: 'wound-1',
        status: 'ACTIVE',
        severityLabel: 'HIGH',
        reasonTag: 'CLINICAL_REVIEW',
        escalatedByMembershipId: 'membership-1',
        escalatedAt: '2026-08-01T11:00:00Z',
        clearedByMembershipId: null,
        clearedAt: null,
      },
    ]);
  });

  it('renders coordinator-facing Epic 12 visibility with summary counts and audit links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/patient-events/command-center']}>
        <Routes>
          <Route
            element={<PatientEventCommandCenterPage />}
            path="/app/patient-events/command-center"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Patient-event command center')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Open incidents').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Active infections').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Escalated events').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Overdue follow-up').length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'Incident audit activity' })).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=EPIC12_PATIENT_EVENT_INCIDENT_CREATED',
      );
      expect(screen.getAllByText('Patient fall in living room.').length).toBeGreaterThan(0);
    });
  });

  it('shows a controlled denied state without patient-event workspace access', async () => {
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
      <MemoryRouter initialEntries={['/app/patient-events/command-center']}>
        <Routes>
          <Route
            element={<PatientEventCommandCenterPage />}
            path="/app/patient-events/command-center"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Patient-event command center is not available for this role.'),
    ).toBeInTheDocument();
  });

  it('shows a controlled failure state when backend summary requests fail', async () => {
    vi.mocked(sessionApi.fetchPatientEventIncidents).mockRejectedValue(
      new sessionApi.ApiError(500, 'Incident summary failed'),
    );

    render(
      <MemoryRouter initialEntries={['/app/patient-events/command-center']}>
        <Routes>
          <Route
            element={<PatientEventCommandCenterPage />}
            path="/app/patient-events/command-center"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Command center failed to load')).toBeInTheDocument();
    expect(screen.getByText('Incident summary failed')).toBeInTheDocument();
  });
});
