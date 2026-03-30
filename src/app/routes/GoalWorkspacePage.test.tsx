import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GoalWorkspacePage } from './GoalWorkspacePage';

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
    addGoalProgressNote: vi.fn(),
    deactivateGoalIntervention: vi.fn(),
    deactivateGoalTemplate: vi.fn(),
    fetchBranches: vi.fn(),
    fetchGoalTemplates: vi.fn(),
    fetchPatientGoals: vi.fn(),
    fetchPatientGoal: vi.fn(),
    fetchGoalInterventions: vi.fn(),
    fetchGoalProgressNotes: vi.fn(),
    fetchGoalVersions: vi.fn(),
    fetchCarePlanSyncLinks: vi.fn(),
    fetchPatientProgressionSummary: vi.fn(),
    saveCarePlanSyncLink: vi.fn(),
    saveGoalIntervention: vi.fn(),
    saveGoalTemplate: vi.fn(),
    savePatientGoal: vi.fn(),
    transitionPatientGoalState: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('GoalWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));

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
        role: 'QA_CLINICAL_REVIEWER',
        roleLabel: 'QA Clinical Reviewer',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_goal_workspace',
          'manage_goal_templates',
          'manage_patient_goals',
          'manage_goal_interventions',
          'add_goal_progress_notes',
          'manage_goal_state_transitions',
          'manage_careplan_sync',
          'view_audit_log',
          'view_patient_workspace',
          'view_documentation_workspace',
          'view_compliance_workspace',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

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
    vi.mocked(sessionApi.fetchGoalTemplates).mockResolvedValue([
      {
        id: 'template-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        name: 'Falls prevention',
        description: 'Reduce fall risk over 30 days.',
        targetOutcomeGuidance: 'Target fewer instability events.',
        defaultInterventionScaffold: 'Balance check, transfer review',
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
        description: 'Patient transfers without assistance-related fall risk.',
        targetDate: '2026-04-15',
        status: 'ACTIVE',
        createdAt: '2026-03-01T10:00:00Z',
        resolvedAt: null,
      },
    ]);
    vi.mocked(sessionApi.fetchPatientGoal).mockResolvedValue({
      id: 'goal-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      goalTemplateId: 'template-1',
      ownerMembershipId: 'membership-1',
      title: 'Improve transfer safety',
      description: 'Patient transfers without assistance-related fall risk.',
      targetDate: '2026-04-15',
      status: 'ACTIVE',
      createdAt: '2026-03-01T10:00:00Z',
      resolvedAt: null,
    });
    vi.mocked(sessionApi.fetchGoalInterventions).mockResolvedValue([
      {
        id: 'intervention-1',
        patientGoalId: 'goal-1',
        branchId: 'branch-1',
        ownerMembershipId: 'membership-2',
        title: 'Review transfer technique',
        description: 'Practice safe transfer sequence twice weekly.',
        targetDate: '2026-04-01',
        status: 'ACTIVE',
        derivedFromTemplate: true,
      },
    ]);
    vi.mocked(sessionApi.fetchGoalProgressNotes).mockResolvedValue([
      {
        id: 'note-1',
        patientGoalId: 'goal-1',
        goalInterventionId: 'intervention-1',
        branchId: 'branch-1',
        capturedByMembershipId: 'membership-1',
        noteText: 'Transfer steadiness improved this week.',
        capturedAt: '2026-03-20T09:30:00Z',
        progressionSummary: 'On track after two supervised sessions.',
        statusImpact: 'IMPROVING',
        lifecycleStatus: 'RECORDED',
      },
    ]);
    vi.mocked(sessionApi.fetchGoalVersions).mockResolvedValue([
      {
        id: 'version-1',
        patientGoalId: 'goal-1',
        branchId: 'branch-1',
        versionNumber: 2,
        changeType: 'TARGET_DATE_UPDATED',
        changedAt: '2026-03-18T12:00:00Z',
        snapshotJson: '{"targetDate":"2026-04-15"}',
      },
    ]);
    vi.mocked(sessionApi.fetchCarePlanSyncLinks).mockResolvedValue([
      {
        id: 'sync-1',
        patientGoalId: 'goal-1',
        branchId: 'branch-1',
        careplanIdentifier: 'careplan-77',
        syncStatus: 'STALE',
        lastSyncedAt: '2026-03-15T11:00:00Z',
        syncSource: 'Clinical review import',
      },
    ]);
    vi.mocked(sessionApi.fetchPatientProgressionSummary).mockResolvedValue({
      patientId: 'patient-1',
      branchId: 'branch-1',
      totalGoalCount: 1,
      overdueGoalCount: 0,
      atRiskGoalCount: 1,
      goals: [
        {
          goalId: 'goal-1',
          branchId: 'branch-1',
          title: 'Improve transfer safety',
          status: 'ACTIVE',
          targetDate: '2026-04-15',
          targetDatePosture: 'AT_RISK',
          latestProgressSummary: 'On track after two supervised sessions.',
          completedInterventionCount: 0,
          totalInterventionCount: 1,
          carePlanSyncStatus: 'STALE',
        },
      ],
    });
    vi.mocked(sessionApi.saveGoalTemplate).mockResolvedValue({
      id: 'template-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      name: 'Falls prevention',
      description: 'Reduce fall risk over 30 days.',
      targetOutcomeGuidance: 'Target fewer instability events.',
      defaultInterventionScaffold: 'Balance check, transfer review',
      status: 'ACTIVE',
    });
    vi.mocked(sessionApi.savePatientGoal).mockResolvedValue({
      id: 'goal-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      goalTemplateId: 'template-1',
      ownerMembershipId: 'membership-1',
      title: 'Improve transfer safety',
      description: 'Patient transfers without assistance-related fall risk.',
      targetDate: '2026-04-15',
      status: 'ACTIVE',
      createdAt: '2026-03-01T10:00:00Z',
      resolvedAt: null,
    });
    vi.mocked(sessionApi.transitionPatientGoalState).mockResolvedValue({
      id: 'goal-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      goalTemplateId: 'template-1',
      ownerMembershipId: 'membership-1',
      title: 'Improve transfer safety',
      description: 'Patient transfers without assistance-related fall risk.',
      targetDate: '2026-04-15',
      status: 'COMPLETED',
      createdAt: '2026-03-01T10:00:00Z',
      resolvedAt: '2026-03-25T09:00:00Z',
    });
    vi.mocked(sessionApi.saveGoalIntervention).mockResolvedValue({
      id: 'intervention-1',
      patientGoalId: 'goal-1',
      branchId: 'branch-1',
      ownerMembershipId: 'membership-2',
      title: 'Review transfer technique',
      description: 'Practice safe transfer sequence twice weekly.',
      targetDate: '2026-04-01',
      status: 'ACTIVE',
      derivedFromTemplate: true,
    });
    vi.mocked(sessionApi.addGoalProgressNote).mockResolvedValue({
      id: 'note-2',
      patientGoalId: 'goal-1',
      goalInterventionId: 'intervention-1',
      branchId: 'branch-1',
      capturedByMembershipId: 'membership-1',
      noteText: 'Documented new improvement.',
      capturedAt: '2026-03-22T09:30:00Z',
      progressionSummary: 'Improved transfer control.',
      statusImpact: 'IMPROVING',
      lifecycleStatus: 'RECORDED',
    });
    vi.mocked(sessionApi.saveCarePlanSyncLink).mockResolvedValue({
      id: 'sync-1',
      patientGoalId: 'goal-1',
      branchId: 'branch-1',
      careplanIdentifier: 'careplan-77',
      syncStatus: 'ALIGNED',
      lastSyncedAt: '2026-03-20T11:00:00Z',
      syncSource: 'Clinical review import',
    });
  });

  function renderRoute(initialEntry: string) {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/goals" element={<GoalWorkspacePage />} />
          <Route path="/app/goals/templates" element={<GoalWorkspacePage />} />
          <Route path="/app/goals/patients/:patientId" element={<GoalWorkspacePage />} />
          <Route path="/app/goals/patient-goals/:goalId" element={<GoalWorkspacePage />} />
          <Route
            path="/app/goals/patient-goals/:goalId/interventions"
            element={<GoalWorkspacePage />}
          />
          <Route
            path="/app/goals/patient-goals/:goalId/progress-notes"
            element={<GoalWorkspacePage />}
          />
          <Route path="/app/goals/patient-goals/:goalId/history" element={<GoalWorkspacePage />} />
          <Route
            path="/app/goals/patient-goals/:goalId/careplan-sync"
            element={<GoalWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the overview route with live template and patient-goal entry points', async () => {
    renderRoute('/app/goals');

    expect(await screen.findByText('Care progression workspace')).toBeInTheDocument();
    expect(await screen.findByText('Falls prevention')).toBeInTheDocument();
    expect(await screen.findByText('Improve transfer safety')).toBeInTheDocument();
    expect(screen.getByText('Refresh current section')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Goal creation audit' })).toHaveAttribute(
      'href',
      '/app/admin/audit?actionType=CARE_PROGRESSION_PATIENT_GOAL_CREATED',
    );
  });

  it('renders goal history through the shared route shell', async () => {
    renderRoute('/app/goals/patient-goals/goal-1/history');

    expect(await screen.findByRole('heading', { level: 2, name: 'Version history' })).toBeInTheDocument();
    expect(await screen.findByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('{"targetDate":"2026-04-15"}')).toBeInTheDocument();
  });

  it('uses the shared refresh mutation pattern for route data reloads', async () => {
    renderRoute('/app/goals/templates');

    await screen.findByText('Goal templates');
    fireEvent.click(screen.getByText('Refresh current section'));

    await waitFor(() =>
      expect(screen.getByText('Care progression data refreshed successfully.')).toBeInTheDocument(),
    );
  });

  it('saves templates through the live Phase B template workflow', async () => {
    renderRoute('/app/goals/templates');

    await screen.findByText('Template management');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Falls prevention' } });
    fireEvent.click(screen.getByText('Save template'));

    await waitFor(() =>
      expect(sessionApi.saveGoalTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          goalTemplateId: 'template-1',
          name: 'Falls prevention',
        }),
      ),
    );
  });

  it('supports goal save and lifecycle transition flows', async () => {
    renderRoute('/app/goals/patient-goals/goal-1');

    await screen.findByText('Patient goal detail');
    fireEvent.change(screen.getByLabelText('Goal title'), {
      target: { value: 'Improve transfer safety' },
    });
    fireEvent.click(screen.getByText('Save goal'));

    await waitFor(() =>
      expect(sessionApi.savePatientGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          patientGoalId: 'goal-1',
          title: 'Improve transfer safety',
        }),
      ),
    );

    fireEvent.change(screen.getByLabelText('New state'), {
      target: { value: 'COMPLETED' },
    });
    fireEvent.click(screen.getByText('Change goal state'));

    await waitFor(() =>
      expect(sessionApi.transitionPatientGoalState).toHaveBeenCalledWith(
        expect.objectContaining({
          patientGoalId: 'goal-1',
          status: 'COMPLETED',
        }),
      ),
    );
  });

  it('supports intervention, progress-note, and care-plan sync mutations', async () => {
    renderRoute('/app/goals/patient-goals/goal-1/interventions');

    await screen.findByText('Interventions');
    fireEvent.click(screen.getByText('Save intervention'));
    await waitFor(() =>
      expect(sessionApi.saveGoalIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          patientGoalId: 'goal-1',
          interventionId: 'intervention-1',
        }),
      ),
    );

    renderRoute('/app/goals/patient-goals/goal-1/progress-notes');
    await screen.findByText('Progress-note timeline');
    fireEvent.change(screen.getByLabelText('Note text'), {
      target: { value: 'Documented new improvement.' },
    });
    fireEvent.click(screen.getByText('Save progress note'));
    await waitFor(() =>
      expect(sessionApi.addGoalProgressNote).toHaveBeenCalledWith(
        expect.objectContaining({
          patientGoalId: 'goal-1',
          noteText: 'Documented new improvement.',
        }),
      ),
    );

    renderRoute('/app/goals/patient-goals/goal-1/careplan-sync');
    await screen.findByText('Care-plan sync visibility');
    fireEvent.change(screen.getByLabelText('Care-plan identifier'), {
      target: { value: 'careplan-77' },
    });
    fireEvent.click(screen.getByText('Save sync link'));
    await waitFor(() =>
      expect(sessionApi.saveCarePlanSyncLink).toHaveBeenCalledWith(
        expect.objectContaining({
          carePlanSyncLinkId: 'sync-1',
          careplanIdentifier: 'careplan-77',
        }),
      ),
    );
  });

  it('surfaces validation and backend failure states clearly', async () => {
    renderRoute('/app/goals/templates');

    await screen.findByText('Template management');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.submit(screen.getByText('Save template').closest('form')!);

    expect((await screen.findAllByText('Goal template name is required.')).length).toBeGreaterThan(0);
  });

  it('surfaces backend save failures clearly', async () => {
    vi.mocked(sessionApi.saveGoalTemplate).mockRejectedValueOnce(
      new sessionApi.ApiError(409, 'Template conflict detected'),
    );

    renderRoute('/app/goals/templates');
    await screen.findByText('Template management');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Falls prevention' } });
    fireEvent.click(screen.getByText('Save template'));

    expect((await screen.findAllByText('Template conflict detected')).length).toBeGreaterThan(0);
  });

  it('renders a controlled denied state when the role lacks Epic 13 visibility', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'READ_ONLY_AUDITOR',
        roleLabel: 'Read Only Auditor',
        branchScope: 'agency-wide-read',
        branchScopeLabel: 'Agency-wide read',
        assignedBranchIds: [],
        permissions: [],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    renderRoute('/app/goals');

    expect(
      await screen.findByText('Care progression workspace is not available for this role.'),
    ).toBeInTheDocument();
  });
});
