import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationTaskLibraryPage } from './DocumentationTaskLibraryPage';

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
    deactivateDocumentationTaskLibraryItem: vi.fn(),
    fetchDocumentationTaskLibrary: vi.fn(),
    fetchServiceLines: vi.fn(),
    fetchVisitTypes: vi.fn(),
    saveDocumentationTaskLibraryItem: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

describe('DocumentationTaskLibraryPage', () => {
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

    vi.mocked(sessionApi.fetchDocumentationTaskLibrary).mockResolvedValue({
      content: [{
        id: 'task-1',
        agencyId: 'agency-1',
        serviceLineId: 'service-line-1',
        visitTypeId: 'visit-type-1',
        name: 'Vitals',
        code: 'VITALS',
        description: 'Capture vitals',
        category: 'CLINICAL',
        status: 'ACTIVE',
        displayOrder: 1,
        defaultSortOrder: 1,
        defaultCompletionExpectation: 'Record blood pressure.',
        requiredByDefault: true,
      }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [{
        id: 'service-line-1',
        agencyId: 'agency-1',
        name: 'Skilled Nursing',
        code: 'SN',
        description: null,
        status: 'ACTIVE',
        displayOrder: 1,
      }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchVisitTypes).mockResolvedValue({
      content: [{
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
      }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.saveDocumentationTaskLibraryItem).mockResolvedValue({
      id: 'task-1',
      agencyId: 'agency-1',
      serviceLineId: 'service-line-1',
      visitTypeId: 'visit-type-1',
      name: 'Updated Vitals',
      code: 'VITALS',
      description: 'Capture vitals',
      category: 'CLINICAL',
      status: 'ACTIVE',
      displayOrder: 1,
      defaultSortOrder: 1,
      defaultCompletionExpectation: 'Record blood pressure.',
      requiredByDefault: true,
    });
  });

  it('saves task-library changes through the Epic 8 API', async () => {
    render(
      <MemoryRouter>
        <DocumentationTaskLibraryPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Vitals/i }));
    expect(await screen.findByDisplayValue('Vitals')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Vitals'), {
      target: { value: 'Updated Vitals' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }));

    await waitFor(() => {
      expect(sessionApi.saveDocumentationTaskLibraryItem).toHaveBeenCalled();
    });
  });
});
