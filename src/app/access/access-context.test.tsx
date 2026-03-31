import { render, screen, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccessProvider, useAccess } from './access-context';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../auth/session-api', () => ({
  fetchCurrentAccess: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(),
  loadFrontendAccessOverride: vi.fn(),
  saveFrontendAccessOverride: vi.fn(),
  clearFrontendAccessOverride: vi.fn(),
}));

const { useAuth } = await import('../auth/auth-context');
const { fetchCurrentAccess } = await import('../auth/session-api');
const { loadDevSessionCredentials, loadFrontendAccessOverride } = await import('../auth/session-storage');

function Probe() {
  const { profile, loading } = useAccess();

  return (
    <div>
      <div data-testid="loading">{loading ? 'yes' : 'no'}</div>
      <div data-testid="role">{profile.role}</div>
      <div data-testid="source">{profile.source}</div>
      <div data-testid="default-route">{profile.defaultRoute}</div>
    </div>
  );
}

function Wrapper({ children }: PropsWithChildren) {
  return <AccessProvider>{children}</AccessProvider>;
}

describe('AccessProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDevSessionCredentials).mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);
  });

  it('prefers backend access over a stale frontend override for authenticated sessions', async () => {
    vi.mocked(loadFrontendAccessOverride).mockReturnValue({
      role: 'BRANCH_ADMIN',
      assignedBranchIds: ['branch-1'],
    });
    vi.mocked(fetchCurrentAccess).mockResolvedValue({
      userId: 'user-1',
      agencyId: 'agency-1',
      membershipId: 'membership-1',
      role: 'AGENCY_OWNER',
      branchScope: 'AGENCY_WIDE',
      assignedBranchIds: [],
      permissions: ['MANAGE_AGENCY_SETTINGS', 'MANAGE_AGENCY_MFA_POLICY', 'MANAGE_ADMIN_NOTIFICATIONS'],
    } as never);

    render(<Probe />, { wrapper: Wrapper });

    expect(screen.getByTestId('loading')).toHaveTextContent('yes');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    expect(screen.getByTestId('role')).toHaveTextContent('AGENCY_OWNER');
    expect(screen.getByTestId('source')).toHaveTextContent('backend');
    expect(screen.getByTestId('default-route')).toHaveTextContent('/app/settings/security');
  });
});
