import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientWorkspacePage } from './PatientWorkspacePage';

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
    fetchPatients: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

describe('PatientWorkspacePage', () => {
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

  it('renders the patient directory and quick-entry actions from live API data', async () => {
    vi.mocked(sessionApi.fetchPatients)
      .mockResolvedValueOnce({
        content: [
          {
            id: 'patient-1',
            externalReference: 'MRN-1001',
            firstName: 'Alicia',
            middleName: null,
            lastName: 'Stone',
            preferredName: 'Ali',
            dateOfBirth: '1982-10-10',
            sexMarker: 'F',
            primaryPhone: '312-555-0101',
            secondaryPhone: null,
            email: 'alicia@example.com',
            language: 'en-US',
            notesSummary: null,
            status: 'ACTIVE',
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        content: [],
        page: 0,
        size: 1,
        totalElements: 7,
        totalPages: 7,
      });

    render(
      <MemoryRouter>
        <PatientWorkspacePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Alicia Stone')).toBeInTheDocument();
    });

    expect(screen.getByText('MRN-1001')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New patient' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/patients/new/demographics');
  });
});
