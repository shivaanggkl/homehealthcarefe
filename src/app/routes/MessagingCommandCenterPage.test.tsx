import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MessagingCommandCenterPage } from './MessagingCommandCenterPage';

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
    fetchMessagingSummary: vi.fn(),
    fetchMessagingThreads: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('MessagingCommandCenterPage', () => {
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
        role: 'SCHEDULER_COORDINATOR',
        roleLabel: 'Scheduler Coordinator',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_messaging_workspace', 'view_audit_log'],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchMessagingSummary).mockResolvedValue({
      unread: {
        unreadThreadCount: 2,
        unreadMessageCount: 4,
        escalatedThreadCount: 1,
        activeBroadcastCount: 1,
      },
      recentBroadcasts: [
        {
          id: 'broadcast-1',
          branchId: 'branch-1',
          eligibleRolesCsv: 'CAREGIVER',
          subject: 'Weather advisory',
          body: 'Expect delays.',
          threadId: 'thread-2',
          expiresAt: null,
          status: 'SENT',
          createdAt: '2026-08-20T08:00:00Z',
        },
      ],
      recentContextThreads: [
        {
          id: 'thread-1',
          threadType: 'VISIT_COORDINATION',
          subject: 'Visit coordination',
          status: 'ACTIVE',
          branchId: 'branch-1',
          patientId: 'patient-1',
          visitOccurrenceId: 'visit-1',
          escalationStatus: 'URGENT',
          lastMessageAt: '2026-08-20T08:30:00-05:00',
          createdAt: '2026-08-20T08:20:00Z',
          createdByMembershipId: 'membership-1',
        },
      ],
    });

    vi.mocked(sessionApi.fetchMessagingThreads).mockResolvedValue([
      {
        id: 'thread-1',
        threadType: 'VISIT_COORDINATION',
        subject: 'Visit coordination',
        status: 'ACTIVE',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        escalationStatus: 'URGENT',
        lastMessageAt: '2026-08-20T08:30:00-05:00',
        createdAt: '2026-08-20T08:20:00Z',
        createdByMembershipId: 'membership-1',
      },
    ]);
  });

  it('renders coordinator communication visibility with summary, escalation, broadcast, and context links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/messaging/command-center']}>
        <Routes>
          <Route element={<MessagingCommandCenterPage />} path="/app/messaging/command-center" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Communication command center')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('2 unread threads')).toBeInTheDocument();
      expect(screen.getByText('1 escalated thread')).toBeInTheDocument();
      expect(screen.getByText('Weather advisory')).toBeInTheDocument();
      expect(screen.getAllByText('Visit coordination').length).toBeGreaterThan(0);
      expect(screen.getByText('Controlled messaging operations')).toBeInTheDocument();
    });
  });

  it('renders a controlled denied state when the workspace permission is missing', async () => {
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
      <MemoryRouter initialEntries={['/app/messaging/command-center']}>
        <Routes>
          <Route element={<MessagingCommandCenterPage />} path="/app/messaging/command-center" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Communication summary is not available for this role.'),
    ).toBeInTheDocument();
  });
});
