import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  addGoalProgressNote,
  ApiError,
  type BranchSummary,
  type CarePlanSyncResponse,
  type CarePlanSyncStatus,
  deactivateGoalIntervention,
  deactivateGoalTemplate,
  fetchBranches,
  fetchCarePlanSyncLinks,
  fetchGoalInterventions,
  fetchGoalProgressNotes,
  fetchGoalTemplates,
  fetchGoalVersions,
  fetchPatientGoal,
  fetchPatientGoals,
  fetchPatientProgressionSummary,
  saveCarePlanSyncLink,
  saveGoalIntervention,
  saveGoalTemplate,
  savePatientGoal,
  transitionPatientGoalState,
  type GoalInterventionLifecycleStatus,
  type GoalInterventionResponse,
  type GoalProgressNoteResponse,
  type GoalSummaryResponse,
  type GoalTargetDatePosture,
  type GoalTemplateLifecycleStatus,
  type GoalTemplateResponse,
  type GoalVersionResponse,
  type PatientGoalLifecycleStatus,
  type PatientGoalResponse,
  type PatientProgressionSummaryResponse,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  GoalAuditCallout,
  GoalModuleState,
  GoalMutationNotice,
  GoalPanel,
  GoalSectionNavigation,
  GoalStatusBanner,
  GoalWorkspaceCards,
  GoalWorkspaceGrid,
  GoalWorkspaceShell,
} from '../components/GoalWorkspaceFoundation';

type RouteSection =
  | 'overview'
  | 'templates'
  | 'patient-summary'
  | 'goal-detail'
  | 'interventions'
  | 'progress-notes'
  | 'history'
  | 'careplan-sync';

type MutationState = 'idle' | 'saving' | 'saved' | 'retry';

type GoalTemplateFormState = {
  name: string;
  description: string;
  branchId: string;
  serviceLineId: string;
  targetOutcomeGuidance: string;
  defaultInterventionScaffold: string;
  status: GoalTemplateLifecycleStatus;
};

type GoalFormState = {
  patientId: string;
  title: string;
  description: string;
  targetDate: string;
  goalTemplateId: string;
  ownerMembershipId: string;
};

type GoalStateFormState = {
  status: PatientGoalLifecycleStatus;
};

type InterventionFormState = {
  title: string;
  description: string;
  targetDate: string;
  ownerMembershipId: string;
  status: GoalInterventionLifecycleStatus;
  derivedFromTemplate: boolean;
};

type ProgressNoteFormState = {
  goalInterventionId: string;
  noteText: string;
  capturedAt: string;
  progressionSummary: string;
  statusImpact: string;
};

type CarePlanSyncFormState = {
  careplanIdentifier: string;
  syncStatus: CarePlanSyncStatus;
  lastSyncedAt: string;
  syncSource: string;
};

const GOAL_TEMPLATE_STATUSES: GoalTemplateLifecycleStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

const GOAL_STATUSES: PatientGoalLifecycleStatus[] = [
  'ACTIVE',
  'COMPLETED',
  'UNMET',
  'NOT_ATTAINED',
  'CANCELLED',
];

const INTERVENTION_STATUSES: GoalInterventionLifecycleStatus[] = [
  'ACTIVE',
  'COMPLETED',
  'INACTIVE',
  'CANCELLED',
];

const CAREPLAN_SYNC_STATUSES: CarePlanSyncStatus[] = ['ALIGNED', 'UNSYNCED', 'STALE', 'FAILED'];

function humanizeToken(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function toDateInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoDateTime(value: string) {
  if (!value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

function routeSection(pathname: string): RouteSection {
  if (pathname.includes('/templates')) {
    return 'templates';
  }
  if (pathname.includes('/interventions')) {
    return 'interventions';
  }
  if (pathname.includes('/progress-notes')) {
    return 'progress-notes';
  }
  if (pathname.includes('/history')) {
    return 'history';
  }
  if (pathname.includes('/careplan-sync')) {
    return 'careplan-sync';
  }
  if (pathname.includes('/patients/')) {
    return 'patient-summary';
  }
  if (pathname.includes('/patient-goals/')) {
    return 'goal-detail';
  }
  return 'overview';
}

function statusTone(
  status: PatientGoalLifecycleStatus | null | undefined,
): 'info' | 'success' | 'warning' | 'readonly' {
  if (!status) {
    return 'readonly';
  }
  if (status === 'COMPLETED') {
    return 'success';
  }
  if (status === 'UNMET' || status === 'NOT_ATTAINED' || status === 'CANCELLED') {
    return 'warning';
  }
  return 'info';
}

function postureTone(
  posture: GoalTargetDatePosture | null | undefined,
): 'info' | 'success' | 'warning' | 'readonly' {
  if (!posture || posture === 'NOT_APPLICABLE') {
    return 'readonly';
  }
  if (posture === 'ON_TRACK') {
    return 'success';
  }
  if (posture === 'AT_RISK' || posture === 'OVERDUE') {
    return 'warning';
  }
  return 'info';
}

function syncTone(status: CarePlanSyncStatus): 'info' | 'success' | 'warning' | 'readonly' {
  if (status === 'ALIGNED') {
    return 'success';
  }
  if (status === 'STALE' || status === 'FAILED' || status === 'UNSYNCED') {
    return 'warning';
  }
  return 'info';
}

function branchName(branches: BranchSummary[], branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }
  return branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
}

function compareByDateDescending<T>(items: T[], mapper: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => {
    const leftValue = mapper(left);
    const rightValue = mapper(right);
    return new Date(rightValue ?? 0).getTime() - new Date(leftValue ?? 0).getTime();
  });
}

function emptyTemplateForm(): GoalTemplateFormState {
  return {
    name: '',
    description: '',
    branchId: '',
    serviceLineId: '',
    targetOutcomeGuidance: '',
    defaultInterventionScaffold: '',
    status: 'ACTIVE',
  };
}

function templateToForm(template: GoalTemplateResponse): GoalTemplateFormState {
  return {
    name: template.name,
    description: template.description ?? '',
    branchId: template.branchId ?? '',
    serviceLineId: template.serviceLineId ?? '',
    targetOutcomeGuidance: template.targetOutcomeGuidance ?? '',
    defaultInterventionScaffold: template.defaultInterventionScaffold ?? '',
    status: template.status,
  };
}

function emptyGoalForm(patientId = ''): GoalFormState {
  return {
    patientId,
    title: '',
    description: '',
    targetDate: '',
    goalTemplateId: '',
    ownerMembershipId: '',
  };
}

function goalToForm(goal: PatientGoalResponse): GoalFormState {
  return {
    patientId: goal.patientId,
    title: goal.title,
    description: goal.description ?? '',
    targetDate: toDateInput(goal.targetDate),
    goalTemplateId: goal.goalTemplateId ?? '',
    ownerMembershipId: goal.ownerMembershipId ?? '',
  };
}

function interventionToForm(intervention: GoalInterventionResponse): InterventionFormState {
  return {
    title: intervention.title,
    description: intervention.description ?? '',
    targetDate: toDateInput(intervention.targetDate),
    ownerMembershipId: intervention.ownerMembershipId ?? '',
    status: intervention.status,
    derivedFromTemplate: intervention.derivedFromTemplate,
  };
}

function emptyInterventionForm(): InterventionFormState {
  return {
    title: '',
    description: '',
    targetDate: '',
    ownerMembershipId: '',
    status: 'ACTIVE',
    derivedFromTemplate: false,
  };
}

function emptyProgressNoteForm(): ProgressNoteFormState {
  return {
    goalInterventionId: '',
    noteText: '',
    capturedAt: '',
    progressionSummary: '',
    statusImpact: '',
  };
}

function syncToForm(sync: CarePlanSyncResponse): CarePlanSyncFormState {
  return {
    careplanIdentifier: sync.careplanIdentifier,
    syncStatus: sync.syncStatus,
    lastSyncedAt: toDateTimeInput(sync.lastSyncedAt),
    syncSource: sync.syncSource ?? '',
  };
}

function emptySyncForm(): CarePlanSyncFormState {
  return {
    careplanIdentifier: '',
    syncStatus: 'UNSYNCED',
    lastSyncedAt: '',
    syncSource: '',
  };
}

function summarizeVersionSnapshot(snapshotJson: string) {
  try {
    const parsed = JSON.parse(snapshotJson) as {
      title?: string;
      status?: string;
      targetDate?: string;
    };
    return [
      parsed.title ? `Title: ${parsed.title}` : null,
      parsed.status ? `Status: ${humanizeToken(parsed.status)}` : null,
      parsed.targetDate ? `Target date: ${parsed.targetDate}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  } catch {
    return null;
  }
}

function goalAuditLinks(section: RouteSection, goalId: string, patientId: string) {
  const scopedGoalPath = goalId ? `&targetId=${encodeURIComponent(goalId)}` : '';
  const scopedPatientPath = patientId ? `&targetId=${encodeURIComponent(patientId)}` : '';

  if (section === 'templates') {
    return [
      {
        label: 'Template audit activity',
        href: '/app/admin/audit?actionType=CARE_PROGRESSION_GOAL_TEMPLATE_SAVED',
      },
    ];
  }

  if (section === 'goal-detail' || section === 'patient-summary') {
    return [
      {
        label: 'Goal change audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_PATIENT_GOAL_UPDATED${scopedGoalPath}`,
      },
      {
        label: 'State-change audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_GOAL_STATE_CHANGED${scopedGoalPath}`,
      },
    ];
  }

  if (section === 'interventions') {
    return [
      {
        label: 'Intervention audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_INTERVENTION_SAVED${scopedGoalPath}`,
      },
    ];
  }

  if (section === 'progress-notes') {
    return [
      {
        label: 'Progress-note audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_PROGRESS_NOTE_ADDED${scopedGoalPath}`,
      },
    ];
  }

  if (section === 'history') {
    return [
      {
        label: 'Version audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_GOAL_VERSION_RECORDED${scopedGoalPath}`,
      },
    ];
  }

  if (section === 'careplan-sync') {
    return [
      {
        label: 'Care-plan sync audit',
        href: `/app/admin/audit?actionType=CARE_PROGRESSION_CAREPLAN_SYNC_UPDATED${scopedGoalPath}`,
      },
    ];
  }

  return [
    {
      label: 'Goal creation audit',
      href: `/app/admin/audit?actionType=CARE_PROGRESSION_PATIENT_GOAL_CREATED${scopedPatientPath}`,
    },
    {
      label: 'Progression event audit',
      href: `/app/admin/audit?actionType=CARE_PROGRESSION_EVENT_PUBLISHED${scopedPatientPath}`,
    },
  ];
}

export function GoalWorkspacePage() {
  const { state: authState } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const { patientId, goalId } = useParams<{ patientId?: string; goalId?: string }>();

  const devSession = loadDevSessionCredentials();
  const accessToken = devSession?.accessToken;
  const sessionId = authState.status === 'authenticated' ? authState.session.sessionId : undefined;
  const authContext = useMemo(
    () => ({
      accessToken,
      sessionId,
    }),
    [accessToken, sessionId],
  );

  const canViewWorkspace = canAccessPermission(profile, 'view_goal_workspace');
  const canManageTemplates = canAccessPermission(profile, 'manage_goal_templates');
  const canManageGoals = canAccessPermission(profile, 'manage_patient_goals');
  const canManageInterventions = canAccessPermission(profile, 'manage_goal_interventions');
  const canAddProgressNotes = canAccessPermission(profile, 'add_goal_progress_notes');
  const canManageGoalState = canAccessPermission(profile, 'manage_goal_state_transitions');
  const canManageCarePlanSync = canAccessPermission(profile, 'manage_careplan_sync');
  const canViewPatients = canAccessPermission(profile, 'view_patient_workspace');
  const canViewDocumentation = canAccessPermission(profile, 'view_documentation_workspace');
  const canViewCompliance = canAccessPermission(profile, 'view_compliance_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  const section = routeSection(location.pathname);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Epic 13 mutations share one pending, saved, and retry pattern so goals, interventions, progress notes, and sync state stay understandable.',
  );

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [templates, setTemplates] = useState<GoalTemplateResponse[]>([]);
  const [patientGoals, setPatientGoals] = useState<PatientGoalResponse[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<PatientGoalResponse | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientProgressionSummaryResponse | null>(null);
  const [interventions, setInterventions] = useState<GoalInterventionResponse[]>([]);
  const [progressNotes, setProgressNotes] = useState<GoalProgressNoteResponse[]>([]);
  const [versions, setVersions] = useState<GoalVersionResponse[]>([]);
  const [carePlanSyncLinks, setCarePlanSyncLinks] = useState<CarePlanSyncResponse[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<GoalTemplateFormState>(emptyTemplateForm());
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm(patientId));
  const [goalStateForm, setGoalStateForm] = useState<GoalStateFormState>({ status: 'ACTIVE' });
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [interventionForm, setInterventionForm] = useState<InterventionFormState>(emptyInterventionForm());
  const [progressNoteForm, setProgressNoteForm] = useState<ProgressNoteFormState>(emptyProgressNoteForm());
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);
  const [carePlanSyncForm, setCarePlanSyncForm] = useState<CarePlanSyncFormState>(emptySyncForm());

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedIntervention =
    interventions.find((intervention) => intervention.id === selectedInterventionId) ?? null;
  const selectedSync = carePlanSyncLinks.find((link) => link.id === selectedSyncId) ?? null;
  const resolvedPatientId = patientId ?? selectedGoal?.patientId ?? patientSummary?.patientId ?? '';
  const resolvedGoalId = goalId ?? selectedGoal?.id ?? '';

  const activeGoalCount = patientGoals.filter((goal) => goal.status === 'ACTIVE').length;
  const completedGoalCount = patientGoals.filter((goal) => goal.status === 'COMPLETED').length;
  const unmetGoalCount = patientGoals.filter((goal) => goal.status === 'UNMET').length;
  const notAttainedGoalCount = patientGoals.filter((goal) => goal.status === 'NOT_ATTAINED').length;

  function startMutation(message: string) {
    setMutationState('saving');
    setMutationMessage(message);
    setError(null);
  }

  function completeMutation(message: string) {
    setMutationState('saved');
    setMutationMessage(message);
  }

  function failMutation(message: string) {
    setMutationState('retry');
    setMutationMessage(message);
    setError(message);
  }

  async function loadWorkspace(showMutationState = false) {
    if (!canViewWorkspace || authState.status !== 'authenticated') {
      setLoading(false);
      return;
    }

    if (showMutationState) {
      startMutation('Refreshing care progression data from the backend.');
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const branchPromise = fetchBranches(authContext);

      if (section === 'overview') {
        const [branchResults, templateResults, goalResults] = await Promise.all([
          branchPromise,
          fetchGoalTemplates(authContext),
          fetchPatientGoals(authContext),
        ]);
        setBranches(branchResults);
        setTemplates(templateResults);
        setPatientGoals(goalResults);
        setSelectedGoal(null);
        setPatientSummary(null);
        setInterventions([]);
        setProgressNotes([]);
        setVersions([]);
        setCarePlanSyncLinks([]);
      } else if (section === 'templates') {
        const [branchResults, templateResults] = await Promise.all([
          branchPromise,
          fetchGoalTemplates(authContext),
        ]);
        setBranches(branchResults);
        setTemplates(templateResults);
        if (templateResults.length > 0) {
          const preferred = templateResults.find((item) => item.id === selectedTemplateId) ?? templateResults[0];
          setSelectedTemplateId(preferred.id);
          setTemplateForm(templateToForm(preferred));
        } else {
          setSelectedTemplateId(null);
          setTemplateForm(emptyTemplateForm());
        }
      } else if (section === 'patient-summary' && patientId) {
        const [branchResults, summaryResults, goalResults] = await Promise.all([
          branchPromise,
          fetchPatientProgressionSummary({ ...authContext, patientId }),
          fetchPatientGoals({ ...authContext, patientId }),
        ]);
        setBranches(branchResults);
        setPatientSummary(summaryResults);
        setPatientGoals(goalResults);
        setGoalForm(emptyGoalForm(patientId));
        setSelectedGoal(null);
        setInterventions([]);
        setProgressNotes([]);
        setVersions([]);
        setCarePlanSyncLinks([]);
      } else if (goalId) {
        const goalPromise = fetchPatientGoal({ ...authContext, patientGoalId: goalId });

        if (section === 'goal-detail') {
          const [branchResults, goalResult] = await Promise.all([branchPromise, goalPromise]);
          const summaryResult = await fetchPatientProgressionSummary({
            ...authContext,
            patientId: goalResult.patientId,
            branchId: goalResult.branchId ?? undefined,
          });
          setBranches(branchResults);
          setSelectedGoal(goalResult);
          setGoalForm(goalToForm(goalResult));
          setGoalStateForm({ status: goalResult.status });
          setPatientSummary(summaryResult);
          setPatientGoals([]);
        } else if (section === 'interventions') {
          const [branchResults, goalResult, interventionResults] = await Promise.all([
            branchPromise,
            goalPromise,
            fetchGoalInterventions({ ...authContext, patientGoalId: goalId }),
          ]);
          setBranches(branchResults);
          setSelectedGoal(goalResult);
          setInterventions(interventionResults);
          if (interventionResults.length > 0) {
            const preferred =
              interventionResults.find((item) => item.id === selectedInterventionId) ??
              interventionResults[0];
            setSelectedInterventionId(preferred.id);
            setInterventionForm(interventionToForm(preferred));
          } else {
            setSelectedInterventionId(null);
            setInterventionForm(emptyInterventionForm());
          }
        } else if (section === 'progress-notes') {
          const [branchResults, goalResult, noteResults, interventionResults] = await Promise.all([
            branchPromise,
            goalPromise,
            fetchGoalProgressNotes({ ...authContext, patientGoalId: goalId }),
            fetchGoalInterventions({ ...authContext, patientGoalId: goalId }),
          ]);
          setBranches(branchResults);
          setSelectedGoal(goalResult);
          setProgressNotes(compareByDateDescending(noteResults, (item) => item.capturedAt));
          setInterventions(interventionResults);
          setProgressNoteForm(emptyProgressNoteForm());
        } else if (section === 'history') {
          const [branchResults, goalResult, versionResults] = await Promise.all([
            branchPromise,
            goalPromise,
            fetchGoalVersions({ ...authContext, patientGoalId: goalId }),
          ]);
          setBranches(branchResults);
          setSelectedGoal(goalResult);
          setVersions(compareByDateDescending(versionResults, (item) => item.changedAt));
        } else if (section === 'careplan-sync') {
          const [branchResults, goalResult, syncResults] = await Promise.all([
            branchPromise,
            goalPromise,
            fetchCarePlanSyncLinks({ ...authContext, patientGoalId: goalId }),
          ]);
          setBranches(branchResults);
          setSelectedGoal(goalResult);
          setCarePlanSyncLinks(compareByDateDescending(syncResults, (item) => item.lastSyncedAt));
          if (syncResults.length > 0) {
            const preferred = syncResults.find((item) => item.id === selectedSyncId) ?? syncResults[0];
            setSelectedSyncId(preferred.id);
            setCarePlanSyncForm(syncToForm(preferred));
          } else {
            setSelectedSyncId(null);
            setCarePlanSyncForm(emptySyncForm());
          }
        }
      } else {
        setBranches(await branchPromise);
        setError('This care progression route is missing the patient or goal context it requires.');
      }

      if (showMutationState) {
        completeMutation('Care progression data refreshed successfully.');
      }
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'Unable to load the Epic 13 care progression workspace.';
      failMutation(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace(false);
  }, [authState.status, patientId, goalId, location.pathname]);

  if (!canViewWorkspace) {
    return (
      <AccessDeniedPanel
        title="Care progression workspace is not available for this role."
        message="Only roles with Epic 13 care progression visibility can open goal, intervention, progress-note, history, and care-plan sync routes."
      />
    );
  }

  async function handleTemplateSave(event: FormEvent) {
    event.preventDefault();
    if (!templateForm.name.trim()) {
      failMutation('Goal template name is required.');
      return;
    }
    startMutation(selectedTemplate ? 'Saving goal template changes.' : 'Creating goal template.');
    try {
      const saved = await saveGoalTemplate({
        ...authContext,
        goalTemplateId: selectedTemplate?.id,
        branchId: templateForm.branchId || null,
        serviceLineId: templateForm.serviceLineId || null,
        name: templateForm.name.trim(),
        description: templateForm.description || null,
        targetOutcomeGuidance: templateForm.targetOutcomeGuidance || null,
        defaultInterventionScaffold: templateForm.defaultInterventionScaffold || null,
        status: templateForm.status,
      });
      setSelectedTemplateId(saved.id);
      setTemplateForm(templateToForm(saved));
      completeMutation(selectedTemplate ? `Template ${saved.name} updated.` : `Template ${saved.name} created.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(cause instanceof ApiError ? cause.message : 'Unable to save the goal template right now.');
    }
  }

  async function handleTemplateDeactivate() {
    if (!selectedTemplate || !confirm(`Deactivate template ${selectedTemplate.name}?`)) {
      return;
    }
    startMutation(`Deactivating template ${selectedTemplate.name}.`);
    try {
      const updated = await deactivateGoalTemplate({ ...authContext, goalTemplateId: selectedTemplate.id });
      completeMutation(`Template ${updated.name} deactivated.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(cause instanceof ApiError ? cause.message : 'Unable to deactivate the goal template right now.');
    }
  }

  async function handleGoalSave(event: FormEvent) {
    event.preventDefault();
    if (!goalForm.patientId.trim()) {
      failMutation('Patient id is required for patient goals.');
      return;
    }
    if (!goalForm.title.trim()) {
      failMutation('Patient goal title is required.');
      return;
    }
    startMutation(selectedGoal ? 'Saving patient goal changes.' : 'Creating patient goal.');
    try {
      const saved = await savePatientGoal({
        ...authContext,
        patientGoalId: selectedGoal?.id,
        patientId: goalForm.patientId.trim(),
        branchId: selectedGoal?.branchId ?? patientSummary?.branchId ?? null,
        goalTemplateId: goalForm.goalTemplateId || null,
        ownerMembershipId: goalForm.ownerMembershipId || null,
        title: goalForm.title.trim(),
        description: goalForm.description || null,
        targetDate: goalForm.targetDate || null,
      });
      setSelectedGoal(saved);
      setGoalForm(goalToForm(saved));
      setGoalStateForm({ status: saved.status });
      completeMutation(selectedGoal ? `Goal ${saved.title} updated.` : `Goal ${saved.title} created.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(cause instanceof ApiError ? cause.message : 'Unable to save the patient goal right now.');
    }
  }

  async function handleGoalStateChange(event: FormEvent) {
    event.preventDefault();
    if (!selectedGoal) {
      failMutation('Select a patient goal before changing state.');
      return;
    }
    if (!confirm(`Change goal state to ${humanizeToken(goalStateForm.status)}?`)) {
      return;
    }
    startMutation(`Changing goal state to ${humanizeToken(goalStateForm.status)}.`);
    try {
      const saved = await transitionPatientGoalState({
        ...authContext,
        patientGoalId: selectedGoal.id,
        status: goalStateForm.status,
      });
      setSelectedGoal(saved);
      setGoalForm(goalToForm(saved));
      setGoalStateForm({ status: saved.status });
      completeMutation(`Goal state changed to ${humanizeToken(saved.status)}.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(
        cause instanceof ApiError ? cause.message : 'Unable to change the patient goal state right now.',
      );
    }
  }

  async function handleInterventionSave(event: FormEvent) {
    event.preventDefault();
    if (!resolvedGoalId) {
      failMutation('Select a patient goal before saving interventions.');
      return;
    }
    if (!interventionForm.title.trim()) {
      failMutation('Intervention title is required.');
      return;
    }
    startMutation(selectedIntervention ? 'Saving intervention changes.' : 'Creating intervention.');
    try {
      const saved = await saveGoalIntervention({
        ...authContext,
        patientGoalId: resolvedGoalId,
        interventionId: selectedIntervention?.id,
        branchId: selectedGoal?.branchId ?? null,
        ownerMembershipId: interventionForm.ownerMembershipId || null,
        title: interventionForm.title.trim(),
        description: interventionForm.description || null,
        targetDate: interventionForm.targetDate || null,
        status: interventionForm.status,
        derivedFromTemplate: interventionForm.derivedFromTemplate,
      });
      setSelectedInterventionId(saved.id);
      setInterventionForm(interventionToForm(saved));
      completeMutation(selectedIntervention ? `Intervention ${saved.title} updated.` : `Intervention ${saved.title} created.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(
        cause instanceof ApiError ? cause.message : 'Unable to save the intervention right now.',
      );
    }
  }

  async function handleInterventionDeactivate() {
    if (!selectedIntervention || !confirm(`Deactivate intervention ${selectedIntervention.title}?`)) {
      return;
    }
    startMutation(`Deactivating intervention ${selectedIntervention.title}.`);
    try {
      const updated = await deactivateGoalIntervention({
        ...authContext,
        interventionId: selectedIntervention.id,
      });
      completeMutation(`Intervention ${updated.title} deactivated.`);
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(
        cause instanceof ApiError ? cause.message : 'Unable to deactivate the intervention right now.',
      );
    }
  }

  async function handleProgressNoteSave(event: FormEvent) {
    event.preventDefault();
    if (!resolvedGoalId) {
      failMutation('Select a patient goal before adding a progress note.');
      return;
    }
    if (!progressNoteForm.noteText.trim()) {
      failMutation('Progress-note text is required.');
      return;
    }
    startMutation('Saving progress note.');
    try {
      await addGoalProgressNote({
        ...authContext,
        patientGoalId: resolvedGoalId,
        goalInterventionId: progressNoteForm.goalInterventionId || null,
        branchId: selectedGoal?.branchId ?? null,
        noteText: progressNoteForm.noteText.trim(),
        capturedAt: toIsoDateTime(progressNoteForm.capturedAt),
        progressionSummary: progressNoteForm.progressionSummary || null,
        statusImpact: progressNoteForm.statusImpact || null,
      });
      setProgressNoteForm(emptyProgressNoteForm());
      completeMutation('Progress note saved.');
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(
        cause instanceof ApiError ? cause.message : 'Unable to save the progress note right now.',
      );
    }
  }

  async function handleCarePlanSyncSave(event: FormEvent) {
    event.preventDefault();
    if (!resolvedGoalId) {
      failMutation('Select a patient goal before saving care-plan sync state.');
      return;
    }
    if (!carePlanSyncForm.careplanIdentifier.trim()) {
      failMutation('Care-plan identifier is required.');
      return;
    }
    startMutation(selectedSync ? 'Saving care-plan sync changes.' : 'Creating care-plan sync link.');
    try {
      const saved = await saveCarePlanSyncLink({
        ...authContext,
        patientGoalId: resolvedGoalId,
        carePlanSyncLinkId: selectedSync?.id,
        branchId: selectedGoal?.branchId ?? null,
        careplanIdentifier: carePlanSyncForm.careplanIdentifier.trim(),
        syncStatus: carePlanSyncForm.syncStatus,
        lastSyncedAt: toIsoDateTime(carePlanSyncForm.lastSyncedAt),
        syncSource: carePlanSyncForm.syncSource || null,
      });
      setSelectedSyncId(saved.id);
      setCarePlanSyncForm(syncToForm(saved));
      completeMutation(
        selectedSync
          ? `Care-plan sync ${saved.careplanIdentifier} updated.`
          : `Care-plan sync ${saved.careplanIdentifier} created.`,
      );
      await loadWorkspace(false);
    } catch (cause) {
      failMutation(
        cause instanceof ApiError ? cause.message : 'Unable to save the care-plan sync link right now.',
      );
    }
  }

  const sectionLinks = [
    { path: '/app/goals', label: 'Workspace', state: 'available' as const },
    {
      path: '/app/goals/templates',
      label: 'Templates',
      state: canManageTemplates ? ('available' as const) : ('read-only' as const),
    },
    {
      path: resolvedPatientId ? `/app/goals/patients/${resolvedPatientId}` : '/app/goals',
      label: 'Patient summary',
      state: resolvedPatientId ? ('available' as const) : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}` : '/app/goals',
      label: 'Goal detail',
      state: resolvedGoalId
        ? canManageGoals || canManageGoalState
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/interventions` : '/app/goals',
      label: 'Interventions',
      state: resolvedGoalId
        ? canManageInterventions
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/progress-notes` : '/app/goals',
      label: 'Progress notes',
      state: resolvedGoalId
        ? canAddProgressNotes
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/history` : '/app/goals',
      label: 'Version history',
      state: resolvedGoalId ? ('available' as const) : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/careplan-sync` : '/app/goals',
      label: 'Care-plan sync',
      state: resolvedGoalId
        ? canManageCarePlanSync
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
  ];

  const cards = [
    {
      path: '/app/goals/templates',
      label: 'Goal templates',
      description: 'Shared template library with live create, update, and deactivate behavior.',
      state: canManageTemplates ? ('available' as const) : ('read-only' as const),
    },
    {
      path: resolvedPatientId ? `/app/goals/patients/${resolvedPatientId}` : '/app/goals',
      label: 'Patient summaries',
      description: 'Goal counts, target-date posture, and progression summary visibility by patient.',
      state: resolvedPatientId ? ('available' as const) : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/interventions` : '/app/goals',
      label: 'Interventions',
      description: 'Concrete care tasks tied back to the active patient goal.',
      state: resolvedGoalId
        ? canManageInterventions
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/progress-notes` : '/app/goals',
      label: 'Progress timeline',
      description: 'Chronological progress notes that do not overwrite prior entries.',
      state: resolvedGoalId
        ? canAddProgressNotes
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
    {
      path: resolvedGoalId ? `/app/goals/patient-goals/${resolvedGoalId}/careplan-sync` : '/app/goals',
      label: 'Care-plan sync',
      description: 'Unsynced, stale, failed, and aligned care-plan link visibility.',
      state: resolvedGoalId
        ? canManageCarePlanSync
          ? ('available' as const)
          : ('read-only' as const)
        : ('restricted' as const),
    },
  ];

  let title = 'Care progression workspace';
  let description =
    'Epic 13 routes use one shared progression shell so templates, patient goals, interventions, progress notes, version history, and care-plan sync stay coherent.';

  if (section === 'templates') {
    title = 'Goal templates';
    description =
      'Create and edit reusable goal templates with optional branch and service context plus default intervention guidance.';
  } else if (section === 'patient-summary') {
    title = 'Patient progression summary';
    description =
      'Review active, completed, unmet, not-attained, overdue, and at-risk goals without opening each goal first.';
  } else if (section === 'goal-detail') {
    title = 'Patient goal detail';
    description =
      'Update goal title, target date, source template, owner, and lifecycle state from the live Epic 13 backend.';
  } else if (section === 'interventions') {
    title = 'Goal interventions';
    description =
      'Translate patient goals into concrete interventions with real create, edit, and deactivate workflows.';
  } else if (section === 'progress-notes') {
    title = 'Progress notes';
    description =
      'Document longitudinal progression updates in chronological order without overwriting earlier notes.';
  } else if (section === 'history') {
    title = 'Version history';
    description =
      'Review backend-driven change history for goal status, target-date, and intervention-related events.';
  } else if (section === 'careplan-sync') {
    title = 'Care-plan sync';
    description =
      'Review and update care-plan sync posture, last sync time, and unsynced or stale indicators.';
  }

  return (
    <GoalWorkspaceShell eyebrow="Epic 13 Care Progression" title={title} description={description}>
      <GoalWorkspaceGrid>
        <GoalSectionNavigation links={sectionLinks} />

        <div className="goal-route-stack">
          <GoalMutationNotice message={mutationMessage} state={mutationState} />

          <GoalPanel
            title="Workspace actions"
            description="Shared route-level controls for loading, retry, and cross-workspace context."
          >
            <div className="goal-inline-actions">
              <button onClick={() => void loadWorkspace(true)} type="button">
                Refresh current section
              </button>
              {resolvedPatientId && canViewPatients ? (
                <Link className="goal-inline-link" to={`/app/patients/${resolvedPatientId}`}>
                  Open patient workspace
                </Link>
              ) : null}
              {resolvedPatientId && canViewCompliance ? (
                <Link className="goal-inline-link" to={`/app/compliance/patients/${resolvedPatientId}`}>
                  Open compliance context
                </Link>
              ) : null}
              {canViewDocumentation ? (
                <Link className="goal-inline-link" to="/app/documentation">
                  Open documentation workspace
                </Link>
              ) : null}
              <Link className="goal-inline-link" to="/app/goals/command-center">
                Open progression command center
              </Link>
            </div>
          </GoalPanel>

          {canViewAudit ? (
            <GoalAuditCallout
              title="Controlled progression activity"
              summary="Template, goal, intervention, progress-note, and sync mutations are controlled operations. Authorized users can trace the matching Epic 13 audit activity without exposing extra patient or care-plan detail in the everyday workspace."
              links={goalAuditLinks(section, resolvedGoalId, resolvedPatientId)}
            />
          ) : null}

          {loading ? (
            <GoalModuleState
              description="Loading Epic 13 route context from the backend."
              title="Loading care progression workspace"
            />
          ) : error ? (
            <GoalModuleState
              description={error}
              title="Care progression route could not load"
              variant="error"
            />
          ) : (
            <>
              <GoalPanel
                title="Entry points"
                description="Reusable Epic 13 route cards stay aligned across template, goal, note, history, and sync surfaces."
              >
                <GoalWorkspaceCards cards={cards} />
              </GoalPanel>

              {section === 'overview' ? (
                <GoalPanel
                  title="Workspace overview"
                  description="Phase B closes the real live workflows across templates, patient goals, interventions, notes, sync, and progression summary."
                >
                  <div className="goal-summary-grid">
                    <GoalStatusBanner
                      status={`${templates.length} templates`}
                      summary="Goal templates available through the live Epic 13 API."
                      tone={canManageTemplates ? 'info' : 'readonly'}
                    />
                    <GoalStatusBanner
                      status={`${patientGoals.length} visible goals`}
                      summary="Patient goals returned by the live care progression API."
                      tone="info"
                    />
                    <GoalStatusBanner
                      status={`${patientGoals.filter((goal) => goal.status === 'ACTIVE').length} active`}
                      summary="Active goals currently visible in the workspace."
                      tone="success"
                    />
                  </div>
                  <ul className="goal-entity-list">
                    {templates.slice(0, 3).map((template) => (
                      <li key={template.id}>
                        <strong>{template.name}</strong>
                        <span>{humanizeToken(template.status)}</span>
                        <small>{branchName(branches, template.branchId)}</small>
                        <p>{template.targetOutcomeGuidance ?? template.description ?? 'No guidance provided.'}</p>
                      </li>
                    ))}
                    {patientGoals.slice(0, 4).map((goal) => (
                      <li key={goal.id}>
                        <Link to={`/app/goals/patient-goals/${goal.id}`}>{goal.title}</Link>
                        <span>{humanizeToken(goal.status)}</span>
                        <small>{formatDate(goal.targetDate)}</small>
                      </li>
                    ))}
                  </ul>
                </GoalPanel>
              ) : null}

              {section === 'templates' ? (
                <GoalPanel
                  title="Template management"
                  description="Common care goals are reusable and editable through the real Epic 13 template APIs."
                >
                  {!canManageTemplates ? (
                    <GoalStatusBanner
                      status="Read-only template visibility"
                      summary="This role can review templates here but cannot create, update, or deactivate them."
                      tone="readonly"
                    />
                  ) : null}
                  <div className="goal-admin-layout">
                    <div className="goal-admin-list">
                      <button
                        className="goal-admin-create"
                        onClick={() => {
                          setSelectedTemplateId(null);
                          setTemplateForm(emptyTemplateForm());
                        }}
                        type="button"
                      >
                        New template
                      </button>
                      {templates.length === 0 ? (
                        <GoalModuleState
                          description="No goal templates are available for the current agency scope."
                          title="No templates yet"
                          variant="empty"
                        />
                      ) : (
                        templates.map((template) => (
                          <button
                            key={template.id}
                            className={`goal-admin-select${selectedTemplateId === template.id ? ' goal-admin-select-active' : ''}`}
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setTemplateForm(templateToForm(template));
                            }}
                            type="button"
                          >
                            <strong>{template.name}</strong>
                            <span>{humanizeToken(template.status)}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <form className="goal-form" onSubmit={handleTemplateSave}>
                      <div className="goal-form-grid">
                        <label>
                          <span>Name</span>
                          <input
                            onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                            required
                            value={templateForm.name}
                          />
                        </label>
                        <label>
                          <span>Status</span>
                          <select
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                status: event.target.value as GoalTemplateLifecycleStatus,
                              }))
                            }
                            value={templateForm.status}
                          >
                            {GOAL_TEMPLATE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanizeToken(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Branch id</span>
                          <input
                            onChange={(event) => setTemplateForm((current) => ({ ...current, branchId: event.target.value }))}
                            placeholder="Optional branch id"
                            value={templateForm.branchId}
                          />
                        </label>
                        <label>
                          <span>Service line id</span>
                          <input
                            onChange={(event) =>
                              setTemplateForm((current) => ({ ...current, serviceLineId: event.target.value }))
                            }
                            placeholder="Optional service line id"
                            value={templateForm.serviceLineId}
                          />
                        </label>
                        <label className="goal-form-wide">
                          <span>Description</span>
                          <textarea
                            onChange={(event) =>
                              setTemplateForm((current) => ({ ...current, description: event.target.value }))
                            }
                            rows={3}
                            value={templateForm.description}
                          />
                        </label>
                        <label className="goal-form-wide">
                          <span>Target outcome guidance</span>
                          <textarea
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                targetOutcomeGuidance: event.target.value,
                              }))
                            }
                            rows={3}
                            value={templateForm.targetOutcomeGuidance}
                          />
                        </label>
                        <label className="goal-form-wide">
                          <span>Default intervention hints</span>
                          <textarea
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                defaultInterventionScaffold: event.target.value,
                              }))
                            }
                            rows={3}
                            value={templateForm.defaultInterventionScaffold}
                          />
                        </label>
                      </div>
                      <div className="goal-inline-actions">
                        <button disabled={!canManageTemplates} type="submit">
                          {selectedTemplate ? 'Save template' : 'Create template'}
                        </button>
                        {selectedTemplate ? (
                          <button
                            disabled={!canManageTemplates}
                            onClick={() => void handleTemplateDeactivate()}
                            type="button"
                          >
                            Deactivate template
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </GoalPanel>
              ) : null}

              {section === 'patient-summary' ? (
                <GoalPanel
                  title="Patient goal summary"
                  description="Overdue, at-risk, completed, unmet, and not-attained goals are visible before opening each goal."
                >
                  {patientSummary ? (
                    <>
                      <div className="goal-summary-grid">
                        <GoalStatusBanner
                          status={`${activeGoalCount} active`}
                          summary="Active patient goals."
                          tone="success"
                        />
                        <GoalStatusBanner
                          status={`${completedGoalCount} completed`}
                          summary="Completed goals in the current patient scope."
                          tone="success"
                        />
                        <GoalStatusBanner
                          status={`${unmetGoalCount} unmet`}
                          summary="Goals marked unmet."
                          tone={unmetGoalCount > 0 ? 'warning' : 'readonly'}
                        />
                        <GoalStatusBanner
                          status={`${notAttainedGoalCount} not attained`}
                          summary="Goals marked not attained."
                          tone={notAttainedGoalCount > 0 ? 'warning' : 'readonly'}
                        />
                        <GoalStatusBanner
                          status={`${patientSummary.atRiskGoalCount} at risk`}
                          summary="Goals approaching target-date or progression concern thresholds."
                          tone={patientSummary.atRiskGoalCount > 0 ? 'warning' : 'success'}
                        />
                        <GoalStatusBanner
                          status={`${patientSummary.overdueGoalCount} overdue`}
                          summary="Goals already past their target-date posture threshold."
                          tone={patientSummary.overdueGoalCount > 0 ? 'warning' : 'success'}
                        />
                      </div>
                      <form className="goal-form" onSubmit={handleGoalSave}>
                        <h4>Create patient goal</h4>
                        <div className="goal-form-grid">
                          <label>
                            <span>Patient id</span>
                            <input
                              onChange={(event) => setGoalForm((current) => ({ ...current, patientId: event.target.value }))}
                              required
                              value={goalForm.patientId}
                            />
                          </label>
                          <label>
                            <span>Source template id</span>
                            <input
                              onChange={(event) =>
                                setGoalForm((current) => ({ ...current, goalTemplateId: event.target.value }))
                              }
                              placeholder="Optional template id"
                              value={goalForm.goalTemplateId}
                            />
                          </label>
                          <label>
                            <span>Owner membership id</span>
                            <input
                              onChange={(event) =>
                                setGoalForm((current) => ({ ...current, ownerMembershipId: event.target.value }))
                              }
                              placeholder="Optional owner id"
                              value={goalForm.ownerMembershipId}
                            />
                          </label>
                          <label>
                            <span>Target date</span>
                            <input
                              onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))}
                              type="date"
                              value={goalForm.targetDate}
                            />
                          </label>
                          <label className="goal-form-wide">
                            <span>Goal title</span>
                            <input
                              onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))}
                              required
                              value={goalForm.title}
                            />
                          </label>
                          <label className="goal-form-wide">
                            <span>Description</span>
                            <textarea
                              onChange={(event) =>
                                setGoalForm((current) => ({ ...current, description: event.target.value }))
                              }
                              rows={3}
                              value={goalForm.description}
                            />
                          </label>
                        </div>
                        <div className="goal-inline-actions">
                          <button disabled={!canManageGoals} type="submit">
                            Create goal
                          </button>
                        </div>
                      </form>
                      <ul className="goal-entity-list">
                        {patientSummary.goals.map((goal: GoalSummaryResponse) => (
                          <li key={goal.goalId}>
                            <Link to={`/app/goals/patient-goals/${goal.goalId}`}>{goal.title}</Link>
                            <span>{humanizeToken(goal.status)}</span>
                            <small>
                              {humanizeToken(goal.targetDatePosture)} · {formatDate(goal.targetDate)}
                            </small>
                            <p>{goal.latestProgressSummary ?? 'No progression summary recorded yet.'}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <GoalModuleState
                      description="The selected patient does not currently have an Epic 13 progression summary."
                      title="No patient progression summary"
                      variant="empty"
                    />
                  )}
                </GoalPanel>
              ) : null}

              {section === 'goal-detail' && selectedGoal ? (
                <GoalPanel
                  title="Patient goal detail"
                  description="Goal title, target date, status, source template, and owner are now editable through the live backend APIs."
                >
                  <div className="goal-summary-grid">
                    <GoalStatusBanner
                      status={humanizeToken(selectedGoal.status)}
                      summary="Current goal lifecycle state."
                      tone={statusTone(selectedGoal.status)}
                    />
                    <GoalStatusBanner
                      status={formatDate(selectedGoal.targetDate)}
                      summary="Target date for the selected goal."
                      tone="info"
                    />
                    <GoalStatusBanner
                      status={branchName(branches, selectedGoal.branchId)}
                      summary="Branch or scope for the selected goal."
                      tone="readonly"
                    />
                  </div>
                  <form className="goal-form" onSubmit={handleGoalSave}>
                    <div className="goal-form-grid">
                      <label>
                        <span>Goal title</span>
                        <input
                          onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))}
                          required
                          value={goalForm.title}
                        />
                      </label>
                      <label>
                        <span>Target date</span>
                        <input
                          onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))}
                          type="date"
                          value={goalForm.targetDate}
                        />
                      </label>
                      <label>
                        <span>Template id</span>
                        <input
                          onChange={(event) =>
                            setGoalForm((current) => ({ ...current, goalTemplateId: event.target.value }))
                          }
                          value={goalForm.goalTemplateId}
                        />
                      </label>
                      <label>
                        <span>Owner membership id</span>
                        <input
                          onChange={(event) =>
                            setGoalForm((current) => ({ ...current, ownerMembershipId: event.target.value }))
                          }
                          value={goalForm.ownerMembershipId}
                        />
                      </label>
                      <label className="goal-form-wide">
                        <span>Description</span>
                        <textarea
                          onChange={(event) =>
                            setGoalForm((current) => ({ ...current, description: event.target.value }))
                          }
                          rows={3}
                          value={goalForm.description}
                        />
                      </label>
                    </div>
                    <div className="goal-inline-actions">
                      <button disabled={!canManageGoals} type="submit">
                        Save goal
                      </button>
                    </div>
                  </form>
                  <form className="goal-form" onSubmit={handleGoalStateChange}>
                    <h4>Lifecycle transition</h4>
                    <div className="goal-form-grid">
                      <label>
                        <span>New state</span>
                        <select
                          onChange={(event) =>
                            setGoalStateForm({
                              status: event.target.value as PatientGoalLifecycleStatus,
                            })
                          }
                          value={goalStateForm.status}
                        >
                          {GOAL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {humanizeToken(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="goal-inline-actions">
                      <button disabled={!canManageGoalState} type="submit">
                        Change goal state
                      </button>
                    </div>
                  </form>
                </GoalPanel>
              ) : null}

              {section === 'interventions' ? (
                <GoalPanel
                  title="Interventions"
                  description="Intervention list and editor stay inside the selected patient-goal context."
                >
                  {!canManageInterventions ? (
                    <GoalStatusBanner
                      status="Read-only intervention visibility"
                      summary="This role can review intervention state here but cannot change it."
                      tone="readonly"
                    />
                  ) : null}
                  <div className="goal-admin-layout">
                    <div className="goal-admin-list">
                      <button
                        className="goal-admin-create"
                        onClick={() => {
                          setSelectedInterventionId(null);
                          setInterventionForm(emptyInterventionForm());
                        }}
                        type="button"
                      >
                        New intervention
                      </button>
                      {interventions.length === 0 ? (
                        <GoalModuleState
                          description="No interventions have been created for this goal yet."
                          title="No interventions yet"
                          variant="empty"
                        />
                      ) : (
                        interventions.map((intervention) => (
                          <button
                            key={intervention.id}
                            className={`goal-admin-select${selectedInterventionId === intervention.id ? ' goal-admin-select-active' : ''}`}
                            onClick={() => {
                              setSelectedInterventionId(intervention.id);
                              setInterventionForm(interventionToForm(intervention));
                            }}
                            type="button"
                          >
                            <strong>{intervention.title}</strong>
                            <span>{humanizeToken(intervention.status)}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <form className="goal-form" onSubmit={handleInterventionSave}>
                      <div className="goal-form-grid">
                        <label>
                          <span>Title</span>
                          <input
                            onChange={(event) =>
                              setInterventionForm((current) => ({ ...current, title: event.target.value }))
                            }
                            required
                            value={interventionForm.title}
                          />
                        </label>
                        <label>
                          <span>Status</span>
                          <select
                            onChange={(event) =>
                              setInterventionForm((current) => ({
                                ...current,
                                status: event.target.value as GoalInterventionLifecycleStatus,
                              }))
                            }
                            value={interventionForm.status}
                          >
                            {INTERVENTION_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanizeToken(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Target date</span>
                          <input
                            onChange={(event) =>
                              setInterventionForm((current) => ({ ...current, targetDate: event.target.value }))
                            }
                            type="date"
                            value={interventionForm.targetDate}
                          />
                        </label>
                        <label>
                          <span>Owner membership id</span>
                          <input
                            onChange={(event) =>
                              setInterventionForm((current) => ({
                                ...current,
                                ownerMembershipId: event.target.value,
                              }))
                            }
                            value={interventionForm.ownerMembershipId}
                          />
                        </label>
                        <label className="goal-form-wide">
                          <span>Description</span>
                          <textarea
                            onChange={(event) =>
                              setInterventionForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            rows={3}
                            value={interventionForm.description}
                          />
                        </label>
                      </div>
                      <label className="goal-checkbox">
                        <input
                          checked={interventionForm.derivedFromTemplate}
                          onChange={(event) =>
                            setInterventionForm((current) => ({
                              ...current,
                              derivedFromTemplate: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span>Derived from template guidance</span>
                      </label>
                      <div className="goal-inline-actions">
                        <button disabled={!canManageInterventions} type="submit">
                          {selectedIntervention ? 'Save intervention' : 'Create intervention'}
                        </button>
                        {selectedIntervention ? (
                          <button
                            disabled={!canManageInterventions}
                            onClick={() => void handleInterventionDeactivate()}
                            type="button"
                          >
                            Deactivate intervention
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </GoalPanel>
              ) : null}

              {section === 'progress-notes' ? (
                <GoalPanel
                  title="Progress-note timeline"
                  description="Notes stay chronological, create-only, and tied to the current goal or optional intervention context."
                >
                  {!canAddProgressNotes ? (
                    <GoalStatusBanner
                      status="Read-only progress-note visibility"
                      summary="This role can review notes here but cannot add new ones."
                      tone="readonly"
                    />
                  ) : null}
                  <form className="goal-form" onSubmit={handleProgressNoteSave}>
                    <div className="goal-form-grid">
                      <label>
                        <span>Intervention id</span>
                        <input
                          onChange={(event) =>
                            setProgressNoteForm((current) => ({
                              ...current,
                              goalInterventionId: event.target.value,
                            }))
                          }
                          placeholder="Optional linked intervention"
                          value={progressNoteForm.goalInterventionId}
                        />
                      </label>
                      <label>
                        <span>Captured at</span>
                        <input
                          onChange={(event) =>
                            setProgressNoteForm((current) => ({ ...current, capturedAt: event.target.value }))
                          }
                          type="datetime-local"
                          value={progressNoteForm.capturedAt}
                        />
                      </label>
                      <label>
                        <span>Status impact</span>
                        <input
                          onChange={(event) =>
                            setProgressNoteForm((current) => ({ ...current, statusImpact: event.target.value }))
                          }
                          placeholder="Optional status impact"
                          value={progressNoteForm.statusImpact}
                        />
                      </label>
                      <label className="goal-form-wide">
                        <span>Progression summary</span>
                        <input
                          onChange={(event) =>
                            setProgressNoteForm((current) => ({
                              ...current,
                              progressionSummary: event.target.value,
                            }))
                          }
                          value={progressNoteForm.progressionSummary}
                        />
                      </label>
                      <label className="goal-form-wide">
                        <span>Note text</span>
                        <textarea
                          onChange={(event) =>
                            setProgressNoteForm((current) => ({ ...current, noteText: event.target.value }))
                          }
                          required
                          rows={4}
                          value={progressNoteForm.noteText}
                        />
                      </label>
                    </div>
                    <div className="goal-inline-actions">
                      <button disabled={!canAddProgressNotes} type="submit">
                        Save progress note
                      </button>
                    </div>
                  </form>
                  {progressNotes.length === 0 ? (
                    <GoalModuleState
                      description="No progress notes have been captured for this goal yet."
                      title="No notes yet"
                      variant="empty"
                    />
                  ) : (
                    <ul className="goal-entity-list">
                      {progressNotes.map((note) => (
                        <li key={note.id}>
                          <strong>{formatDateTime(note.capturedAt)}</strong>
                          <span>{note.lifecycleStatus}</span>
                          <small>{note.capturedByMembershipId}</small>
                          <p>{note.noteText}</p>
                          <p>{note.progressionSummary ?? 'No progression summary provided.'}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </GoalPanel>
              ) : null}

              {section === 'history' ? (
                <GoalPanel
                  title="Version history"
                  description="Goal and intervention changes are shown from the backend version record rather than rebuilt client-side."
                >
                  {versions.length === 0 ? (
                    <GoalModuleState
                      description="No version history is available for this goal yet."
                      title="No version history"
                      variant="empty"
                    />
                  ) : (
                    <ul className="goal-entity-list">
                      {versions.map((version) => (
                        <li key={version.id}>
                          <strong>Version {version.versionNumber}</strong>
                          <span>{humanizeToken(version.changeType)}</span>
                          <small>{formatDateTime(version.changedAt)}</small>
                          <p>{summarizeVersionSnapshot(version.snapshotJson) ?? 'Structured snapshot available below.'}</p>
                          <p className="goal-code-block">{version.snapshotJson}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </GoalPanel>
              ) : null}

              {section === 'careplan-sync' ? (
                <GoalPanel
                  title="Care-plan sync visibility"
                  description="Sync state, last-sync time, and stale or unsynced indicators are live and editable."
                >
                  {!canManageCarePlanSync ? (
                    <GoalStatusBanner
                      status="Read-only sync visibility"
                      summary="This role can review sync posture here but cannot update sync records."
                      tone="readonly"
                    />
                  ) : null}
                  <div className="goal-admin-layout">
                    <div className="goal-admin-list">
                      <button
                        className="goal-admin-create"
                        onClick={() => {
                          setSelectedSyncId(null);
                          setCarePlanSyncForm(emptySyncForm());
                        }}
                        type="button"
                      >
                        New sync link
                      </button>
                      {carePlanSyncLinks.length === 0 ? (
                        <GoalModuleState
                          description="No care-plan sync links are recorded for this goal yet."
                          title="No care-plan sync links"
                          variant="empty"
                        />
                      ) : (
                        carePlanSyncLinks.map((link) => (
                          <button
                            key={link.id}
                            className={`goal-admin-select${selectedSyncId === link.id ? ' goal-admin-select-active' : ''}`}
                            onClick={() => {
                              setSelectedSyncId(link.id);
                              setCarePlanSyncForm(syncToForm(link));
                            }}
                            type="button"
                          >
                            <strong>{link.careplanIdentifier}</strong>
                            <span>{humanizeToken(link.syncStatus)}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <form className="goal-form" onSubmit={handleCarePlanSyncSave}>
                      <div className="goal-form-grid">
                        <label>
                          <span>Care-plan identifier</span>
                          <input
                            onChange={(event) =>
                              setCarePlanSyncForm((current) => ({
                                ...current,
                                careplanIdentifier: event.target.value,
                              }))
                            }
                            required
                            value={carePlanSyncForm.careplanIdentifier}
                          />
                        </label>
                        <label>
                          <span>Sync status</span>
                          <select
                            onChange={(event) =>
                              setCarePlanSyncForm((current) => ({
                                ...current,
                                syncStatus: event.target.value as CarePlanSyncStatus,
                              }))
                            }
                            value={carePlanSyncForm.syncStatus}
                          >
                            {CAREPLAN_SYNC_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanizeToken(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Last synced at</span>
                          <input
                            onChange={(event) =>
                              setCarePlanSyncForm((current) => ({
                                ...current,
                                lastSyncedAt: event.target.value,
                              }))
                            }
                            type="datetime-local"
                            value={carePlanSyncForm.lastSyncedAt}
                          />
                        </label>
                        <label>
                          <span>Sync source</span>
                          <input
                            onChange={(event) =>
                              setCarePlanSyncForm((current) => ({
                                ...current,
                                syncSource: event.target.value,
                              }))
                            }
                            value={carePlanSyncForm.syncSource}
                          />
                        </label>
                      </div>
                      <div className="goal-inline-actions">
                        <button disabled={!canManageCarePlanSync} type="submit">
                          {selectedSync ? 'Save sync link' : 'Create sync link'}
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="goal-summary-grid">
                    {carePlanSyncLinks.map((link) => (
                      <GoalStatusBanner
                        key={link.id}
                        status={humanizeToken(link.syncStatus)}
                        summary={`${link.careplanIdentifier} · ${formatDateTime(link.lastSyncedAt)}`}
                        tone={syncTone(link.syncStatus)}
                      />
                    ))}
                  </div>
                </GoalPanel>
              ) : null}

              {selectedGoal && patientSummary ? (
                <GoalPanel
                  title="Related progression context"
                  description="Goal routes stay linked to broader patient progression context where supported."
                >
                  <div className="goal-summary-grid">
                    <GoalStatusBanner
                      status={`${patientSummary.totalGoalCount} patient goals`}
                      summary="Goal count from the patient progression summary."
                      tone="info"
                    />
                    <GoalStatusBanner
                      status={humanizeToken(
                        patientSummary.goals.find((goal) => goal.goalId === selectedGoal.id)?.targetDatePosture,
                      )}
                      summary="Target-date posture for the currently selected goal."
                      tone={postureTone(
                        patientSummary.goals.find((goal) => goal.goalId === selectedGoal.id)?.targetDatePosture,
                      )}
                    />
                  </div>
                </GoalPanel>
              ) : null}
            </>
          )}
        </div>
      </GoalWorkspaceGrid>
    </GoalWorkspaceShell>
  );
}
