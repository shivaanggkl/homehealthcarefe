import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MessagingWorkspacePage } from './MessagingWorkspacePage';

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
    addMessagingStaffGroupMember: vi.fn(),
    cancelMessagingBranchBroadcast: vi.fn(),
    createMessagingBranchBroadcast: vi.fn(),
    ...actual,
    deactivateMessagingStaffGroup: vi.fn(),
    fetchBranches: vi.fn(),
    fetchCurrentAccess: vi.fn(),
    fetchMessagingBranchBroadcasts: vi.fn(),
    fetchMessagingReadReceipts: vi.fn(),
    fetchMessagingStaffGroups: vi.fn(),
    fetchMessagingThreads: vi.fn(),
    fetchMessagingThreadsByPatient: vi.fn(),
    fetchMessagingThreadsByVisit: vi.fn(),
    fetchMessagingThreadsByTask: vi.fn(),
    fetchMessagingThreadDetail: vi.fn(),
    fetchMessagingSummary: vi.fn(),
    fetchUserDirectory: vi.fn(),
    removeMessagingStaffGroupMember: vi.fn(),
    resolveMessagingEscalation: vi.fn(),
    saveMessagingStaffGroup: vi.fn(),
    tagMessagingEscalation: vi.fn(),
    createMessagingThread: vi.fn(),
    sendMessagingMessage: vi.fn(),
    markMessagingThreadRead: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('MessagingWorkspacePage', () => {
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
        permissions: [
          'view_messaging_workspace',
          'send_secure_messages',
          'send_branch_broadcasts',
          'manage_message_escalations',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchCurrentAccess).mockResolvedValue({
      userId: 'user-1',
      agencyId: 'agency-1',
      membershipId: 'membership-1',
      role: 'SCHEDULER_COORDINATOR',
      branchScope: 'ASSIGNED_BRANCHES',
      assignedBranchIds: ['branch-1'],
      permissions: [],
    });

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        agencyId: 'agency-1',
        name: 'North Branch',
        code: 'NORTH',
        address: '123 Main St',
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchUserDirectory).mockResolvedValue({
      content: [
        {
          userId: 'user-1',
          membershipId: 'membership-1',
          firstName: 'Morgan',
          lastName: 'Coordinator',
          email: 'morgan@example.com',
          phone: null,
          userStatus: 'ACTIVE',
          role: 'SCHEDULER_COORDINATOR',
          lastLoginAt: null,
          mfaEnabled: true,
          branchNames: ['North Branch'],
        },
        {
          userId: 'user-2',
          membershipId: 'membership-2',
          firstName: 'Casey',
          lastName: 'Caregiver',
          email: 'casey@example.com',
          phone: null,
          userStatus: 'ACTIVE',
          role: 'CAREGIVER',
          lastLoginAt: null,
          mfaEnabled: true,
          branchNames: ['North Branch'],
        },
      ],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
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

    vi.mocked(sessionApi.fetchMessagingSummary).mockResolvedValue({
      unread: {
        unreadThreadCount: 1,
        unreadMessageCount: 2,
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

    vi.mocked(sessionApi.fetchMessagingThreadDetail).mockResolvedValue({
      thread: {
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
      participants: [
        {
          id: 'participant-1',
          membershipId: 'membership-1',
          role: 'SCHEDULER_COORDINATOR',
          participantRole: null,
          addedAt: '2026-08-20T08:20:00-05:00',
          removedAt: null,
          muted: false,
        },
        {
          id: 'participant-2',
          membershipId: 'membership-2',
          role: 'CAREGIVER',
          participantRole: null,
          addedAt: '2026-08-20T08:21:00-05:00',
          removedAt: null,
          muted: false,
        },
      ],
      messages: [
        {
          id: 'message-1',
          threadId: 'thread-1',
          senderMembershipId: 'membership-2',
          messageBody: 'Please confirm arrival timing.',
          createdAt: '2026-08-20T08:30:00-05:00',
          editedAt: null,
          messageType: 'USER_MESSAGE',
          attachmentReference: null,
        },
      ],
      contextLinks: [
        {
          id: 'context-1',
          contextType: 'VISIT',
          contextId: 'visit-1',
        },
      ],
    });

    vi.mocked(sessionApi.fetchMessagingReadReceipts).mockResolvedValue([
      {
        id: 'receipt-1',
        messageId: 'message-1',
        recipientMembershipId: 'membership-1',
        readAt: '2026-08-20T08:35:00-05:00',
        deliveryState: 'READ',
      },
    ]);

    vi.mocked(sessionApi.fetchMessagingStaffGroups).mockResolvedValue([
      {
        id: 'group-1',
        name: 'North Branch Care Team',
        description: 'Reusable recipient set for branch coordination.',
        branchId: 'branch-1',
        active: true,
        members: [
          {
            id: 'member-1',
            staffGroupId: 'group-1',
            membershipId: 'membership-2',
            role: 'CAREGIVER',
            addedAt: '2026-08-20T08:00:00-05:00',
            removedAt: null,
          },
        ],
      },
    ]);

    vi.mocked(sessionApi.fetchMessagingBranchBroadcasts).mockResolvedValue([
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
    ]);
  });

  it('renders the Epic 9 workspace with live inbox and summary data', async () => {
    render(
      <MemoryRouter initialEntries={['/app/messaging']}>
        <Routes>
          <Route element={<MessagingWorkspacePage />} path="/app/messaging" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Messaging workspace')).toBeInTheDocument();
    expect(await screen.findAllByText('Visit coordination')).toHaveLength(2);
    await waitFor(() => {
      expect(screen.getByText('1 unread thread')).toBeInTheDocument();
      expect(screen.getByText('1 escalated')).toBeInTheDocument();
      expect(screen.getByText('1 recent broadcast')).toBeInTheDocument();
      expect(screen.getByText('You · SCHEDULER COORDINATOR · CAREGIVER')).toBeInTheDocument();
      expect(screen.getByText('Audit-aware communication review')).toBeInTheDocument();
    });
  });

  it('renders thread detail on the dedicated secure thread route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/messaging/threads/thread-1']}>
        <Routes>
          <Route element={<MessagingWorkspacePage />} path="/app/messaging/threads/:threadId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Thread detail and reply')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('VISIT: visit-1')).toBeInTheDocument();
      expect(screen.getByText('Seen by You')).toBeInTheDocument();
      expect(screen.getByText('Escalation review stays controlled')).toBeInTheDocument();
    });
  });

  it('renders the admin staff-group and branch-broadcast surfaces', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'BRANCH_ADMIN',
        roleLabel: 'Branch Admin',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_messaging_workspace',
          'send_secure_messages',
          'manage_staff_groups',
          'send_branch_broadcasts',
          'manage_message_escalations',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/messaging/admin']}>
        <Routes>
          <Route element={<MessagingWorkspacePage />} path="/app/messaging/admin" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('North Branch Care Team')).toHaveLength(2);
    expect(screen.getByText('Send broadcast')).toBeInTheDocument();
    expect(screen.getAllByText('Weather advisory').length).toBeGreaterThan(0);
    expect(screen.getByText('Group membership changes are logged')).toBeInTheDocument();
    expect(screen.getByText('Broadcasts and escalations are reviewable')).toBeInTheDocument();
  });

  it('renders a controlled denied state when the messaging permission is missing', async () => {
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
      <MemoryRouter initialEntries={['/app/messaging']}>
        <Routes>
          <Route element={<MessagingWorkspacePage />} path="/app/messaging" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Messaging workspace is not available for this role.'),
    ).toBeInTheDocument();
  });
});
