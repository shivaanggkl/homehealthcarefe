import { render, screen, waitFor } from '@testing-library/react';
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
    fetchMobileHome: vi.fn(),
    fetchMobileRoute: vi.fn(),
    fetchMobileVisitDetail: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('MobileWorkspacePage', () => {
  beforeEach(() => {
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
    expect(screen.getByRole('button', { name: 'Start visit lands in Phase B' })).toBeDisabled();
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
