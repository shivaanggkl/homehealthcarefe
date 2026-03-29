import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileDocumentationPage } from './MobileDocumentationPage';

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
    fetchMobileHome: vi.fn(),
    fetchMobileVisitDetail: vi.fn(),
    loadVisitDocumentationForVisit: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

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
    vi.mocked(sessionApi.fetchMobileVisitDetail).mockResolvedValue({
      visitId: 'visit-1',
      patientSummary: {
        patientId: 'patient-1',
        patientDisplaySummary: 'Ava Patient',
        dateOfBirth: '1950-01-01',
        addressSummary: '123 Main, Chicago, IL 60601',
        contactSummary: null,
        diagnosisSummaries: [],
        serviceLineSummary: 'Skilled Nursing',
        visitTypeSummary: 'Routine Visit',
        payerSnippet: 'Medicare',
      },
      careInstructions: {
        visitId: 'visit-1',
        visitTypeInstructions: null,
        serviceLineInstructions: null,
        branchInstructions: null,
        patientSpecificCareNotes: null,
      },
    });
    vi.mocked(sessionApi.loadVisitDocumentationForVisit).mockResolvedValue({
      record: {
        id: 'record-1',
        visitOccurrenceId: 'visit-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        selectedTemplateId: 'template-1',
        authorMembershipId: 'membership-1',
        lastEditorMembershipId: 'membership-1',
        status: 'DRAFT',
        startedAt: null,
        submittedAt: null,
        lastSavedAt: '2026-04-21T09:15:00-05:00',
        printableSummaryVersion: 1,
      },
      fieldResponses: [],
      taskResponses: [],
      attachmentLinks: [],
    });
  });

  it('renders the caregiver documentation route with backend state', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/documentation']}>
        <Routes>
          <Route element={<MobileDocumentationPage />} path="/mobile/visits/:visitId/documentation" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Visit documentation' })).toBeInTheDocument();
    expect(await screen.findByText('Ava Patient')).toBeInTheDocument();
    expect(await screen.findByText('DRAFT')).toBeInTheDocument();
  });
});
