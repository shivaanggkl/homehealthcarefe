import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SchedulingWorkspacePage } from './SchedulingWorkspacePage';

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
    fetchCaregivers: vi.fn(),
    fetchPatients: vi.fn(),
    fetchScheduleBoard: vi.fn(),
    fetchScheduleVisit: vi.fn(),
    fetchScheduleVisits: vi.fn(),
    fetchServiceLines: vi.fn(),
    fetchVisitTypes: vi.fn(),
    saveScheduleVisit: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('SchedulingWorkspacePage', () => {
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
        branchScopeLabel: 'Agency-wide branch access',
        assignedBranchIds: [],
        permissions: [
          'view_scheduling_workspace',
          'manage_schedule_visits',
          'assign_caregivers',
          'manage_open_shifts',
          'reschedule_visits',
          'cancel_visits',
          'view_schedule_conflicts',
        ],
        defaultRoute: '/app/settings/security',
        source: 'backend',
      },
      loading: false,
      setRoleOverride: vi.fn(),
      setAssignedBranches: vi.fn(),
      clearOverride: vi.fn(),
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        agencyId: 'agency-1',
        name: 'North Branch',
        code: 'NB',
        address: '123 Main',
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      },
    ]);
    vi.mocked(sessionApi.fetchCaregivers).mockResolvedValue({
      content: [
        {
          id: 'caregiver-1',
          status: 'ACTIVE',
          caregiverCode: 'CG-1',
          displayName: 'Jamie Caregiver',
          agencyMembershipId: 'membership-1',
          userId: 'user-2',
          userFullName: 'Jamie Caregiver',
          userEmail: 'jamie@example.com',
          userPhone: '555-0101',
          branchId: 'branch-1',
          branchName: 'North Branch',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchPatients).mockResolvedValue({
      content: [
        {
          id: 'patient-1',
          agencyId: 'agency-1',
          status: 'ACTIVE',
          externalReference: 'P-001',
          firstName: 'Ava',
          middleName: null,
          lastName: 'Patient',
          preferredName: null,
          dateOfBirth: '1950-01-01',
          sexMarker: null,
          primaryPhone: '555-0202',
          secondaryPhone: null,
          email: 'ava@example.com',
          language: null,
          notesSummary: null,
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [
        {
          id: 'service-line-1',
          agencyId: 'agency-1',
          name: 'Skilled Nursing',
          code: 'SN',
          description: null,
          status: 'ACTIVE',
          displayOrder: 1,
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchVisitTypes).mockResolvedValue({
      content: [
        {
          id: 'visit-type-1',
          agencyId: 'agency-1',
          serviceLineId: 'service-line-1',
          name: 'Routine Visit',
          code: 'RV',
          description: null,
          defaultDurationMinutes: 60,
          billable: true,
          status: 'ACTIVE',
          displayOrder: 1,
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchScheduleVisits).mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 4,
      totalPages: 4,
    });
  });

  it('renders the live scheduling board, open-shift pool, and selected visit drawer from backend APIs', async () => {
    vi.mocked(sessionApi.fetchScheduleBoard)
      .mockResolvedValueOnce({
        view: 'WEEK',
        windowStart: '2026-04-07',
        windowEnd: '2026-04-14',
        items: [
          {
            visitId: 'visit-1',
            patientId: 'patient-1',
            patientDisplayName: 'Ava Patient',
            branchId: 'branch-1',
            serviceLineId: 'service-line-1',
            visitTypeId: 'visit-type-1',
            plannedStartAt: '2026-04-10T09:00:00-05:00',
            plannedEndAt: '2026-04-10T10:00:00-05:00',
            timezone: 'America/Chicago',
            status: 'OPEN_SHIFT',
            priority: 'URGENT',
            activeAssignmentId: null,
            activeCaregiverProfileId: null,
            openShift: true,
          },
          {
            visitId: 'visit-2',
            patientId: 'patient-1',
            patientDisplayName: 'Ava Patient',
            branchId: 'branch-1',
            serviceLineId: 'service-line-1',
            visitTypeId: 'visit-type-1',
            plannedStartAt: '2026-04-11T11:00:00-05:00',
            plannedEndAt: '2026-04-11T12:00:00-05:00',
            timezone: 'America/Chicago',
            status: 'RESCHEDULED',
            priority: 'STANDARD',
            activeAssignmentId: null,
            activeCaregiverProfileId: null,
            openShift: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        view: 'DAY',
        windowStart: '2026-03-29',
        windowEnd: '2026-03-29',
        items: [
          {
            visitId: 'visit-9',
            patientId: 'patient-1',
            patientDisplayName: 'Ava Patient',
            branchId: 'branch-1',
            serviceLineId: 'service-line-1',
            visitTypeId: 'visit-type-1',
            plannedStartAt: '2026-03-29T09:00:00-05:00',
            plannedEndAt: '2026-03-29T10:00:00-05:00',
            timezone: 'America/Chicago',
            status: 'PLANNED',
            priority: 'STANDARD',
            activeAssignmentId: null,
            activeCaregiverProfileId: null,
            openShift: false,
          },
        ],
      });
    vi.mocked(sessionApi.fetchScheduleVisit).mockResolvedValue({
      id: 'visit-1',
      agencyId: 'agency-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      serviceLineId: 'service-line-1',
      visitTypeId: 'visit-type-1',
      recurringVisitRuleId: null,
      plannedStartAt: '2026-04-10T09:00:00-05:00',
      plannedEndAt: '2026-04-10T10:00:00-05:00',
      timezone: 'America/Chicago',
      status: 'OPEN_SHIFT',
      priority: 'URGENT',
      creationMode: 'MANUAL',
      notes: 'Needs weekend coverage',
      activeAssignmentId: null,
      activeCaregiverProfileId: null,
      openShiftId: 'open-shift-1',
    });

    render(
      <MemoryRouter initialEntries={['/app/scheduling/visits/visit-1?view=WEEK&date=2026-04-10']}>
        <Routes>
          <Route element={<SchedulingWorkspacePage />} path="/app/scheduling/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Visit visit-1')).toBeInTheDocument();
    });

    expect(screen.getByText("Today's scheduled visits")).toBeInTheDocument();
    expect(screen.getByText('Open-shift pool')).toBeInTheDocument();
    expect(screen.getAllByText('OPEN_SHIFT').length).toBeGreaterThan(0);
    expect(screen.getByText('Visit visit-1')).toBeInTheDocument();
    expect(screen.getByText('Review open shifts')).toBeInTheDocument();
    expect(screen.getByText('Create assignment flow')).toBeInTheDocument();
    expect(sessionApi.fetchScheduleBoard).toHaveBeenCalledWith(
      expect.objectContaining({
        view: 'WEEK',
        date: '2026-04-10',
      }),
    );
    expect(sessionApi.fetchScheduleVisits).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ALL',
      }),
    );
    expect(sessionApi.fetchScheduleVisit).toHaveBeenCalledWith(
      'visit-1',
      expect.objectContaining({
        sessionId: 'session-1',
      }),
    );
  });

  it('renders the visit creation workflow from the scheduling workspace', async () => {
    vi.mocked(sessionApi.fetchScheduleBoard)
      .mockResolvedValueOnce({
        view: 'WEEK',
        windowStart: '2026-04-07',
        windowEnd: '2026-04-14',
        items: [],
      })
      .mockResolvedValueOnce({
        view: 'DAY',
        windowStart: '2026-03-29',
        windowEnd: '2026-03-29',
        items: [],
      });

    render(
      <MemoryRouter initialEntries={['/app/scheduling?workflow=new-visit&view=WEEK&date=2026-04-10']}>
        <Routes>
          <Route element={<SchedulingWorkspacePage />} path="/app/scheduling" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Create scheduled visit')).toBeInTheDocument();
    });

    const formHeading = screen.getByText('Create scheduled visit');
    const formPanel = formHeading.closest('article');
    expect(formPanel).not.toBeNull();
    expect(within(formPanel as HTMLElement).getAllByLabelText('Patient')[0]).toBeInTheDocument();
    expect(within(formPanel as HTMLElement).getByLabelText('Planned start')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create visit' })).toBeInTheDocument();
  });
});
