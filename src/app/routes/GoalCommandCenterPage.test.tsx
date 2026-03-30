import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GoalCommandCenterPage } from './GoalCommandCenterPage';

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
    fetchBranches: vi.fn(),
    fetchPatientGoals: vi.fn(),
    fetchCarePlanSyncLinks: vi.fn(),
    fetchGoalProgressNotes: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('GoalCommandCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-13',
          userId: 'user-13',
          forcedLogoutAt: null,
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'OPERATIONS_LEAD',
        roleLabel: 'Operations Lead',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_goal_workspace', 'view_audit_log'],
        defaultRoute: '/app/goals',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        code: 'NORTH',
        name: 'North Branch',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchPatientGoals).mockResolvedValue([
      {
        id: 'goal-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        goalTemplateId: 'template-1',
        ownerMembershipId: 'membership-1',
        title: 'Improve transfer safety',
        description: 'Reduce fall risk during transfer.',
        targetDate: '2026-01-15',
        status: 'ACTIVE',
        createdAt: '2026-01-01T10:00:00Z',
        resolvedAt: null,
      },
      {
        id: 'goal-2',
        patientId: 'patient-2',
        branchId: 'branch-1',
        goalTemplateId: null,
        ownerMembershipId: 'membership-2',
        title: 'Restore gait endurance',
        description: 'Increase hallway walking tolerance.',
        targetDate: '2026-04-15',
        status: 'UNMET',
        createdAt: '2026-02-01T10:00:00Z',
        resolvedAt: null,
      },
    ]);

    vi.mocked(sessionApi.fetchCarePlanSyncLinks).mockImplementation(async (request) => {
      if (request.patientGoalId === 'goal-1') {
        return [
          {
            id: 'sync-1',
            patientGoalId: 'goal-1',
            branchId: 'branch-1',
            careplanIdentifier: 'careplan-1',
            syncStatus: 'STALE',
            lastSyncedAt: '2026-03-20T10:00:00Z',
            syncSource: 'Clinical review import',
          },
        ];
      }
      return [];
    });

    vi.mocked(sessionApi.fetchGoalProgressNotes).mockImplementation(async (request) => {
      if (request.patientGoalId === 'goal-1') {
        return [
          {
            id: 'note-1',
            patientGoalId: 'goal-1',
            goalInterventionId: null,
            branchId: 'branch-1',
            capturedByMembershipId: 'membership-1',
            noteText: 'Observed steadier transfers this week.',
            capturedAt: '2026-03-22T09:30:00Z',
            progressionSummary: 'Steadier transfer pattern.',
            statusImpact: 'IMPROVING',
            lifecycleStatus: 'RECORDED',
          },
        ];
      }
      return [];
    });
  });

  it('renders coordinator-facing Epic 13 visibility with summary counts and audit links', async () => {
    render(
      <MemoryRouter initialEntries={['/app/goals/command-center']}>
        <Routes>
          <Route path="/app/goals/command-center" element={<GoalCommandCenterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Progression command center')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1 overdue goal')).toBeInTheDocument();
      expect(screen.getByText('1 unmet or not attained')).toBeInTheDocument();
      expect(screen.getByText('1 unsynced care-plan link')).toBeInTheDocument();
      expect(screen.getByText('1 recent progress note')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Goal-state audit' })).toHaveAttribute(
        'href',
        '/app/admin/audit?actionType=CARE_PROGRESSION_GOAL_STATE_CHANGED',
      );
      expect(screen.getAllByText('Improve transfer safety').length).toBeGreaterThan(0);
    });
  });

  it('shows a controlled denied state without Epic 13 visibility', async () => {
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
      <MemoryRouter initialEntries={['/app/goals/command-center']}>
        <Routes>
          <Route path="/app/goals/command-center" element={<GoalCommandCenterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Progression command center is not available for this role.'),
    ).toBeInTheDocument();
  });

  it('shows a controlled failure state when summary requests fail', async () => {
    vi.mocked(sessionApi.fetchPatientGoals).mockRejectedValue(
      new sessionApi.ApiError(500, 'Goal summary failed'),
    );

    render(
      <MemoryRouter initialEntries={['/app/goals/command-center']}>
        <Routes>
          <Route path="/app/goals/command-center" element={<GoalCommandCenterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Command center failed to load')).toBeInTheDocument();
    expect(screen.getByText('Goal summary failed')).toBeInTheDocument();
  });
});
