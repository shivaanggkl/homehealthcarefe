import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileWorkspacePage } from './MobileWorkspacePage';

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
    endMobileVisitExecution: vi.fn(),
    fetchMobileHome: vi.fn(),
    fetchMobileRoute: vi.fn(),
    fetchMobileVisitDetail: vi.fn(),
    startMobileVisitExecution: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('MobileWorkspacePage', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success: (position: { coords: { latitude: number; longitude: number } }) => void) =>
          success({
            coords: {
              latitude: 41.881,
              longitude: -87.623,
            },
          }),
        ),
      },
    });

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
      refreshAuth: vi.fn(),
      logout: vi.fn().mockResolvedValue({ redirectTo: '/mobile/login?loggedOut=1' }),
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
          'execute_mobile_visits',
          'submit_mobile_visit_documentation',
          'view_mobile_messages',
          'send_mobile_messages',
        ],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchMobileHome).mockResolvedValue({
      day: '2026-04-21',
      timezone: 'America/Chicago',
      visits: [
        {
          visitId: 'visit-1',
          patientDisplaySummary: 'Ava Patient',
          branchName: 'North Branch',
          plannedStartAt: '2026-04-21T09:00:00-05:00',
          plannedEndAt: '2026-04-21T10:00:00-05:00',
          timezone: 'America/Chicago',
          scheduleStatus: 'ASSIGNED',
          routeOrder: 1,
          executionStatus: null,
        },
      ],
    });
    vi.mocked(sessionApi.fetchMobileRoute).mockResolvedValue({
      caregiverProfileId: 'caregiver-1',
      day: '2026-04-21',
      timezone: 'America/Chicago',
      stops: [
        {
          visitId: 'visit-1',
          patientDisplaySummary: 'Ava Patient',
          addressSummary: '123 Main, Chicago, IL 60601',
          plannedStartAt: '2026-04-21T09:00:00-05:00',
          plannedEndAt: '2026-04-21T10:00:00-05:00',
          sortOrder: 1,
          executionStatus: null,
        },
      ],
    });
    vi.mocked(sessionApi.fetchMobileVisitDetail).mockResolvedValue({
      visitId: 'visit-1',
      patientSummary: {
        patientId: 'patient-1',
        patientDisplaySummary: 'Ava Patient',
        dateOfBirth: '1950-01-01',
        addressSummary: '123 Main, Chicago, IL 60601',
        contactSummary: {
          fullName: 'Jamie Contact',
          relationshipType: 'Daughter',
          phone: '555-0100',
          email: 'jamie@example.com',
        },
        diagnosisSummaries: ['Hypertension'],
        serviceLineSummary: 'Skilled Nursing',
        visitTypeSummary: 'Routine Visit',
        payerSnippet: 'Medicare',
      },
      careInstructions: {
        visitId: 'visit-1',
        visitTypeInstructions: 'Check vitals.',
        serviceLineInstructions: 'Observe medication tolerance.',
        branchInstructions: 'Call branch for urgent changes.',
        patientSpecificCareNotes: 'Patient prefers morning visits.',
      },
    });
    vi.mocked(sessionApi.startMobileVisitExecution).mockResolvedValue({
      id: 'execution-1',
      visitOccurrenceId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      startedAt: '2026-04-21T09:01:00-05:00',
      endedAt: null,
      startedLatitude: 41.881,
      startedLongitude: -87.623,
      endedLatitude: null,
      endedLongitude: null,
      startSource: 'mobile_web',
      endSource: null,
      executionStatus: 'IN_PROGRESS',
      syncStatus: 'ACCEPTED',
    });
    vi.mocked(sessionApi.endMobileVisitExecution).mockResolvedValue({
      id: 'execution-1',
      visitOccurrenceId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      startedAt: '2026-04-21T09:01:00-05:00',
      endedAt: '2026-04-21T09:59:00-05:00',
      startedLatitude: 41.881,
      startedLongitude: -87.623,
      endedLatitude: 41.8811,
      endedLongitude: -87.6231,
      startSource: 'mobile_web',
      endSource: 'mobile_web',
      executionStatus: 'COMPLETED',
      syncStatus: 'ACCEPTED',
    });
  });

  it('renders backend-backed today work and visit detail in the mobile shell', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionApi.fetchMobileHome).toHaveBeenCalled();
      expect(sessionApi.fetchMobileRoute).toHaveBeenCalled();
      expect(sessionApi.fetchMobileVisitDetail).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        visitId: 'visit-1',
      });
    });

    expect(await screen.findByText('Ava Patient')).toBeInTheDocument();
    expect(screen.getByText('Care instructions')).toBeInTheDocument();
    expect(screen.getByText('Visit action framework')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start visit' })).toBeInTheDocument();
  });

  it('starts a visit, shows captured field state, and refreshes the mobile board', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Start visit' }));

    await waitFor(() => {
      expect(sessionApi.startMobileVisitExecution).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        visitId: 'visit-1',
        startedAt: expect.any(String),
        startedLatitude: 41.881,
        startedLongitude: -87.623,
        startSource: 'mobile_web',
        syncStatus: 'ACCEPTED',
      });
    });

    expect(await screen.findByText('Visit started. The field session is now active and recorded.')).toBeInTheDocument();
    expect(screen.getByText(/Latitude 41.8810, longitude -87.6230/)).toBeInTheDocument();
  });

  it('renders a controlled read-only message state when message permission is missing', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_mobile_app', 'execute_mobile_visits'],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/mobile/messages']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/messages" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Messages are not available for this role'),
    ).toBeInTheDocument();
  });
});
