import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrintableDocumentationPage } from './PrintableDocumentationPage';

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
    fetchPrintableDocumentationSummary: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

describe('PrintableDocumentationPage', () => {
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
  });

  it('renders backend printable summary content', async () => {
    vi.mocked(sessionApi.fetchPrintableDocumentationSummary).mockResolvedValue({
      templateTitle: 'Routine Note',
      status: 'SUBMITTED',
      header: {
        patientDisplayName: 'Ava Patient',
        submittedAt: '2026-03-29T10:30:00-05:00',
        authorDisplayName: 'Alicia Owner',
      },
      fields: [{ fieldKey: 'narrative', label: 'Narrative', displayValue: 'Stable visit.' }],
      tasks: [{ taskTitle: 'Vitals', completionState: 'COMPLETED', completionNotes: 'Recorded' }],
      attachments: [{ attachmentLabel: 'Linked patient attachment', caption: 'Wound photo', description: null }],
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/documentation/records/record-1/printable']}>
        <Routes>
          <Route
            element={<PrintableDocumentationPage />}
            path="/app/documentation/records/:documentationRecordId/printable"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Routine Note')).toBeInTheDocument();
    expect(screen.getByText('Stable visit.')).toBeInTheDocument();
    expect(screen.getByText('Wound photo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open printable-summary audit activity' })).toHaveAttribute(
      'href',
      '/app/admin/audit?actionType=DOC_PRINTABLE_SUMMARY_GENERATED',
    );
  });

  it('shows a controlled error state when printable summary loading fails', async () => {
    vi.mocked(sessionApi.fetchPrintableDocumentationSummary).mockRejectedValue(
      new sessionApi.ApiError(500, 'Printable summary unavailable'),
    );

    render(
      <MemoryRouter initialEntries={['/app/documentation/records/record-1/printable']}>
        <Routes>
          <Route
            element={<PrintableDocumentationPage />}
            path="/app/documentation/records/:documentationRecordId/printable"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Printable summary unavailable')).length).toBeGreaterThan(0);
  });
});
