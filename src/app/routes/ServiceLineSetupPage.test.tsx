import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceLineSetupPage } from './ServiceLineSetupPage';

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
    fetchServiceLines: vi.fn(),
    saveServiceLine: vi.fn(),
    deactivateServiceLine: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const sessionApi = await import('../auth/session-api');

describe('ServiceLineSetupPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);
  });

  it('renders the service line list and saves a new record on the happy path', async () => {
    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [
        {
          id: 'line-1',
          agencyId: 'agency-1',
          name: 'Private Duty',
          code: 'PD',
          description: 'Private duty services',
          status: 'ACTIVE',
          displayOrder: 1,
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.saveServiceLine).mockResolvedValue({
      id: 'line-2',
      agencyId: 'agency-1',
      name: 'Skilled Nursing',
      code: 'SN',
      description: 'Clinical services',
      status: 'ACTIVE',
      displayOrder: 2,
    });

    render(
      <MemoryRouter>
        <ServiceLineSetupPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Private Duty')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Skilled Nursing' } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'SN' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Clinical services' } });
    fireEvent.change(screen.getByLabelText('Display order'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create service line' }));

    await waitFor(() => {
      expect(screen.getByText('Service line Skilled Nursing created.')).toBeInTheDocument();
    });
  });

  it('shows a controlled conflict message when the backend returns 409', async () => {
    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.mocked(sessionApi.saveServiceLine).mockRejectedValue(
      new sessionApi.ApiError(409, 'Service line code already exists.'),
    );

    render(
      <MemoryRouter>
        <ServiceLineSetupPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No service lines yet')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Private Duty' } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'PD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create service line' }));

    await waitFor(() => {
      expect(
        screen.getByText(/record is still in use or conflicts with an existing configuration/i),
      ).toBeInTheDocument();
    });
  });

  it('renders the unauthorized state when the backend denies access', async () => {
    vi.mocked(sessionApi.fetchServiceLines).mockRejectedValue(new sessionApi.ApiError(403, 'Forbidden'));

    render(
      <MemoryRouter>
        <ServiceLineSetupPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Service line management is restricted.')).toBeInTheDocument();
    });
  });
});
