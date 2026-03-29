import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  assignCaregiverToScheduleVisit,
  assignFromOpenShift,
  BranchSummary,
  cancelScheduleVisit,
  CaregiverMatch,
  CaregiverSummary,
  createScheduleOpenShift,
  deactivateRecurringVisitRule,
  expandRecurringVisitRule,
  fetchBranches,
  fetchCaregivers,
  fetchPatients,
  fetchRecurringVisitRules,
  fetchScheduleBoard,
  fetchScheduleMatches,
  fetchScheduleVisit,
  fetchScheduleVisits,
  fetchServiceLines,
  fetchVisitTypes,
  ManageRecurringVisitRuleRequest,
  ManageScheduleVisitRequest,
  OvertimeEvaluation,
  PatientSummary,
  previewScheduleConflicts,
  RecurringVisitCadence,
  rescheduleScheduleVisit,
  saveRecurringVisitRule,
  saveScheduleVisit,
  ScheduleBoardItem,
  ScheduleBoardResponse,
  ScheduleBoardView,
  ScheduleConflictPreview,
  ScheduleRecurringVisitRule,
  ScheduleRescheduleRequest,
  ScheduleVisitDetail,
  SchedulingConflictItem,
  SchedulingConflictOutcome,
  SchedulingVisitStatus,
  ServiceLineSummary,
  TravelAwareness,
  VisitCancellationParty,
  VisitTypeSummary,
} from '../auth/session-api';
import {
  SchedulingBoardHeader,
  SchedulingDetailDrawer,
  SchedulingModuleState,
  SchedulingMutationFrame,
  SchedulingPanel,
  SchedulingVisitCard,
  SchedulingWorkspaceGrid,
  SchedulingWorkspaceShell,
} from '../components/SchedulingWorkspaceFoundation';

type SchedulingWorkflow =
  | 'idle'
  | 'new-visit'
  | 'edit-visit'
  | 'assign'
  | 'open-shifts'
  | 'recurring'
  | 'reschedule'
  | 'cancel';

type VisitFormState = {
  patientId: string;
  branchId: string;
  serviceLineId: string;
  visitTypeId: string;
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
  priority: string;
  creationMode: string;
  notes: string;
};

type RecurringFormState = {
  recurringRuleId: string;
  patientId: string;
  branchId: string;
  serviceLineId: string;
  visitTypeId: string;
  cadence: RecurringVisitCadence;
  weekdays: string[];
  effectiveStart: string;
  effectiveEnd: string;
  plannedStartTime: string;
  plannedEndTime: string;
  timezone: string;
  priority: string;
  creationMode: string;
  notes: string;
};

type RescheduleFormState = {
  newPlannedStartAt: string;
  newPlannedEndAt: string;
  timezone: string;
  branchId: string;
  newCaregiverProfileId: string;
  reason: string;
};

type CancelFormState = {
  cancellationParty: VisitCancellationParty;
  reason: string;
  confirmed: boolean;
};

type BoardColumn = {
  key: string;
  label: string;
  items: ScheduleBoardItem[];
};

const STATUS_OPTIONS: Array<{ value: SchedulingVisitStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All visit states' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'OPEN_SHIFT', label: 'Open shift' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const RECURRENCE_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const DEFAULT_FORM_STATE: VisitFormState = {
  patientId: '',
  branchId: '',
  serviceLineId: '',
  visitTypeId: '',
  plannedStartAt: '',
  plannedEndAt: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
  priority: 'STANDARD',
  creationMode: 'MANUAL',
  notes: '',
};

const DEFAULT_RECURRING_FORM_STATE: RecurringFormState = {
  recurringRuleId: '',
  patientId: '',
  branchId: '',
  serviceLineId: '',
  visitTypeId: '',
  cadence: 'WEEKLY',
  weekdays: ['MONDAY'],
  effectiveStart: '',
  effectiveEnd: '',
  plannedStartTime: '09:00',
  plannedEndTime: '10:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
  priority: 'STANDARD',
  creationMode: 'RECURRING_TEMPLATE',
  notes: '',
};

const DEFAULT_CANCEL_FORM_STATE: CancelFormState = {
  cancellationParty: 'AGENCY',
  reason: '',
  confirmed: false,
};

function schedulingAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function SchedulingWorkspacePage() {
  const navigate = useNavigate();
  const { visitId } = useParams<{ visitId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAuth();
  const { profile } = useAccess();

  const [board, setBoard] = useState<ScheduleBoardResponse | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ScheduleVisitDetail | null>(null);
  const [selectedVisitLoading, setSelectedVisitLoading] = useState(false);
  const [selectedVisitError, setSelectedVisitError] = useState<string | null>(null);
  const [filteredVisitCount, setFilteredVisitCount] = useState<number | null>(null);
  const [todayVisitCount, setTodayVisitCount] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverSummary[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitTypeSummary[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('patientSearch') ?? '');
  const [searchPatientResults, setSearchPatientResults] = useState<PatientSummary[]>([]);
  const [searchPatientLoading, setSearchPatientLoading] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [matches, setMatches] = useState<CaregiverMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const [assignmentPreview, setAssignmentPreview] = useState<ScheduleConflictPreview | null>(null);
  const [assignmentPreviewLoading, setAssignmentPreviewLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentDropIntent, setAssignmentDropIntent] = useState<string | null>(null);
  const [recurringRules, setRecurringRules] = useState<ScheduleRecurringVisitRule[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [recurringSuccess, setRecurringSuccess] = useState<string | null>(null);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(DEFAULT_RECURRING_FORM_STATE);
  const [recurringPreview, setRecurringPreview] = useState<ScheduleVisitDetail[]>([]);
  const [recurringPreviewLoading, setRecurringPreviewLoading] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleFormState>({
    newPlannedStartAt: '',
    newPlannedEndAt: '',
    timezone: DEFAULT_FORM_STATE.timezone,
    branchId: '',
    newCaregiverProfileId: '',
    reason: '',
  });
  const [reschedulePreview, setReschedulePreview] = useState<ScheduleConflictPreview | null>(null);
  const [reschedulePreviewLoading, setReschedulePreviewLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [cancelForm, setCancelForm] = useState<CancelFormState>(DEFAULT_CANCEL_FORM_STATE);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const view = normalizeView(searchParams.get('view'));
  const date = searchParams.get('date') ?? toIsoDate(new Date());
  const branchFilter = searchParams.get('branchId') ?? 'ALL';
  const caregiverFilter = searchParams.get('caregiverId') ?? 'ALL';
  const patientFilter = searchParams.get('patientId') ?? 'ALL';
  const statusFilter = normalizeStatus(searchParams.get('status'));
  const openShiftsOnly = searchParams.get('openShiftsOnly') === 'true';
  const workflow = normalizeWorkflow(searchParams.get('workflow'));
  const requestedCreationMode = searchParams.get('creationMode') ?? 'MANUAL';

  const canManageVisits = canAccessPermission(profile, 'manage_schedule_visits');
  const canAssignCaregivers = canAccessPermission(profile, 'assign_caregivers');
  const canViewConflicts = canAccessPermission(profile, 'view_schedule_conflicts');
  const canManageOpenShifts = canAccessPermission(profile, 'manage_open_shifts');
  const canRescheduleVisits = canAccessPermission(profile, 'reschedule_visits');
  const canCancelVisits = canAccessPermission(profile, 'cancel_visits');

  const boardItems = board?.items ?? [];
  const openShiftItems = boardItems.filter((item) => item.openShift || item.status === 'OPEN_SHIFT');
  const rescheduledItems = boardItems.filter((item) => item.status === 'RESCHEDULED');
  const boardColumns = buildBoardColumns(board);
  const filteredVisitTypes = visitForm.serviceLineId
    ? visitTypes.filter((visitType) => visitType.serviceLineId === visitForm.serviceLineId)
    : visitTypes;
  const recurringVisitTypes = recurringForm.serviceLineId
    ? visitTypes.filter((visitType) => visitType.serviceLineId === recurringForm.serviceLineId)
    : visitTypes;
  const selectedPatient = patients.find((patient) => patient.id === patientFilter);
  const selectedCaregiver = caregivers.find((caregiver) => caregiver.id === caregiverFilter);
  const selectedBranch = branches.find((branch) => branch.id === branchFilter);
  const selectedCandidate = matches.find((candidate) => candidate.caregiverProfileId === selectedCandidateId) ?? null;
  const boardConflictCount = matches.filter((candidate) => candidate.outcome === 'BLOCKING').length;

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    setOptionsError(null);

    void Promise.all([
      fetchBranches(authContext),
      fetchCaregivers({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
      fetchPatients({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
      fetchServiceLines({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
      fetchVisitTypes({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ])
      .then(([branchResponse, caregiverResponse, patientResponse, serviceLineResponse, visitTypeResponse]) => {
        if (cancelled) {
          return;
        }
        setBranches(branchResponse.filter((branch) => branch.status === 'ACTIVE'));
        setCaregivers(caregiverResponse.content);
        setPatients(patientResponse.content);
        setSearchPatientResults(patientResponse.content);
        setServiceLines(serviceLineResponse.content);
        setVisitTypes(visitTypeResponse.content);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setOptionsError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load scheduling filter options right now.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    setBoardLoading(true);
    setBoardError(null);

    void fetchScheduleBoard({
      ...authContext,
      view,
      date,
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      caregiverId: caregiverFilter === 'ALL' ? undefined : caregiverFilter,
      patientId: patientFilter === 'ALL' ? undefined : patientFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      openShiftsOnly,
    })
      .then((response) => {
        if (!cancelled) {
          setBoard(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setBoardError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load the schedule board right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBoardLoading(false);
        }
      });

    void fetchScheduleVisits({
      ...authContext,
      status: statusFilter,
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      caregiverId: caregiverFilter === 'ALL' ? undefined : caregiverFilter,
      patientId: patientFilter === 'ALL' ? undefined : patientFilter,
      page: 0,
      size: 1,
    })
      .then((response) => {
        if (!cancelled) {
          setFilteredVisitCount(response.totalElements);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilteredVisitCount(null);
        }
      });

    void fetchScheduleBoard({
      ...authContext,
      view: 'DAY',
      date: toIsoDate(new Date()),
    })
      .then((response) => {
        if (!cancelled) {
          setTodayVisitCount(response.items.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTodayVisitCount(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authContext,
    branchFilter,
    caregiverFilter,
    date,
    openShiftsOnly,
    patientFilter,
    state.status,
    statusFilter,
    view,
  ]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !visitId) {
      setSelectedVisit(null);
      setSelectedVisitError(null);
      setSelectedVisitLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedVisitLoading(true);
    setSelectedVisitError(null);

    void fetchScheduleVisit(visitId, authContext)
      .then((response) => {
        if (!cancelled) {
          setSelectedVisit(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setSelectedVisitError(
            cause instanceof ApiError ? cause.message : 'Unable to load visit detail right now.',
          );
          setSelectedVisit(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSelectedVisitLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, state.status, visitId]);

  useEffect(() => {
    if (workflow === 'new-visit') {
      setVisitForm((current) => ({
        ...DEFAULT_FORM_STATE,
        timezone: current.timezone || DEFAULT_FORM_STATE.timezone,
        plannedStartAt: current.plannedStartAt,
        plannedEndAt: current.plannedEndAt,
        creationMode: requestedCreationMode,
      }));
      setFormError(null);
      setFormSuccess(null);
      return;
    }

    if (workflow === 'edit-visit' && selectedVisit) {
      setVisitForm(buildFormStateFromVisit(selectedVisit));
      setFormError(null);
      setFormSuccess(null);
    }
  }, [requestedCreationMode, selectedVisit, workflow]);

  useEffect(() => {
    if (workflow === 'reschedule' && selectedVisit) {
      setRescheduleForm({
        newPlannedStartAt: toDateTimeLocal(selectedVisit.plannedStartAt),
        newPlannedEndAt: toDateTimeLocal(selectedVisit.plannedEndAt),
        timezone: selectedVisit.timezone,
        branchId: selectedVisit.branchId ?? '',
        newCaregiverProfileId: selectedVisit.activeCaregiverProfileId ?? '',
        reason: '',
      });
      setRescheduleError(null);
      setRescheduleSuccess(null);
      setReschedulePreview(null);
    }
  }, [selectedVisit, workflow]);

  useEffect(() => {
    if (workflow === 'cancel') {
      setCancelForm(DEFAULT_CANCEL_FORM_STATE);
      setCancelError(null);
      setCancelSuccess(null);
    }
  }, [workflow]);

  useEffect(() => {
    if (workflow !== 'recurring') {
      return;
    }

    setRecurringForm((current) => ({
      ...current,
      patientId: current.patientId || selectedVisit?.patientId || '',
      branchId:
        current.branchId || selectedVisit?.branchId || (branchFilter === 'ALL' ? '' : branchFilter),
      serviceLineId: current.serviceLineId || selectedVisit?.serviceLineId || '',
      visitTypeId: current.visitTypeId || selectedVisit?.visitTypeId || '',
      timezone: current.timezone || selectedVisit?.timezone || DEFAULT_RECURRING_FORM_STATE.timezone,
      priority: current.priority || selectedVisit?.priority || 'STANDARD',
    }));
  }, [branchFilter, selectedVisit, workflow]);

  useEffect(() => {
    if (patientFilter !== 'ALL') {
      return;
    }
    if (!searchInput.trim()) {
      setSearchPatientResults(patients);
      return;
    }
    let cancelled = false;
    setSearchPatientLoading(true);
    void fetchPatients({
      ...authContext,
      search: searchInput.trim(),
      status: 'ACTIVE',
      page: 0,
      size: 20,
    })
      .then((response) => {
        if (!cancelled) {
          setSearchPatientResults(response.content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchPatientResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchPatientLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, patientFilter, patients, searchInput]);

  useEffect(() => {
    if (
      state.status !== 'authenticated' ||
      !selectedVisit ||
      (workflow !== 'assign' && workflow !== 'open-shifts')
    ) {
      setMatches([]);
      setMatchesError(null);
      setMatchesLoading(false);
      setSelectedCandidateId('');
      setAssignmentPreview(null);
      return;
    }

    let cancelled = false;
    setMatchesLoading(true);
    setMatchesError(null);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    void fetchScheduleMatches({
      ...authContext,
      visitId: selectedVisit.id,
      preferredLanguage:
        patients.find((patient) => patient.id === selectedVisit.patientId)?.language ?? undefined,
      enforcePatientOverlapCheck: true,
      requireAvailabilityFit: true,
    })
      .then((response) => {
        if (!cancelled) {
          setMatches(response);
          setSelectedCandidateId((current) => current || response[0]?.caregiverProfileId || '');
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setMatchesError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver match candidates right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMatchesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, patients, selectedVisit, state.status, workflow]);

  useEffect(() => {
    if (
      state.status !== 'authenticated' ||
      !selectedVisit ||
      !selectedCandidateId ||
      !canViewConflicts ||
      (workflow !== 'assign' && workflow !== 'open-shifts')
    ) {
      setAssignmentPreview(null);
      setAssignmentPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setAssignmentPreviewLoading(true);

    void previewScheduleConflicts({
      ...authContext,
      visitId: selectedVisit.id,
      caregiverProfileId: selectedCandidateId,
      preferredLanguage:
        patients.find((patient) => patient.id === selectedVisit.patientId)?.language ?? undefined,
      enforcePatientOverlapCheck: true,
      requireAvailabilityFit: true,
    })
      .then((response) => {
        if (!cancelled) {
          setAssignmentPreview(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setAssignmentError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to preview schedule conflicts right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAssignmentPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, canViewConflicts, patients, selectedCandidateId, selectedVisit, state.status, workflow]);

  useEffect(() => {
    if (
      state.status !== 'authenticated' ||
      !selectedVisit ||
      workflow !== 'recurring'
    ) {
      setRecurringRules([]);
      setRecurringError(null);
      setRecurringLoading(false);
      return;
    }

    let cancelled = false;
    setRecurringLoading(true);
    setRecurringError(null);

    void fetchRecurringVisitRules({
      ...authContext,
      patientId: selectedVisit.patientId,
    })
      .then((response) => {
        if (!cancelled) {
          setRecurringRules(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setRecurringError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load recurring visit rules right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecurringLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, selectedVisit, state.status, workflow]);

  useEffect(() => {
    if (
      state.status !== 'authenticated' ||
      !selectedVisit ||
      workflow !== 'reschedule' ||
      !rescheduleForm.newCaregiverProfileId ||
      !canViewConflicts
    ) {
      setReschedulePreview(null);
      setReschedulePreviewLoading(false);
      return;
    }

    let cancelled = false;
    setReschedulePreviewLoading(true);
    setRescheduleError(null);

    void previewScheduleConflicts({
      ...authContext,
      visitId: selectedVisit.id,
      caregiverProfileId: rescheduleForm.newCaregiverProfileId,
      preferredLanguage:
        patients.find((patient) => patient.id === selectedVisit.patientId)?.language ?? undefined,
      enforcePatientOverlapCheck: true,
      requireAvailabilityFit: true,
    })
      .then((response) => {
        if (!cancelled) {
          setReschedulePreview(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setRescheduleError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to preview reschedule conflicts right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReschedulePreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, canViewConflicts, patients, rescheduleForm.newCaregiverProfileId, selectedVisit, state.status, workflow]);

  function updateSearchParams(
    updates: Record<string, string | null | undefined>,
    options?: { replace?: boolean },
  ) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: options?.replace ?? true });
  }

  function openVisit(visit: ScheduleBoardItem) {
    const next = new URLSearchParams(searchParams);
    next.delete('workflow');
    next.delete('creationMode');
    navigate(`/app/scheduling/visits/${visit.visitId}${next.toString() ? `?${next.toString()}` : ''}`);
  }

  function closeDrawer() {
    const next = new URLSearchParams(searchParams);
    navigate(`/app/scheduling${next.toString() ? `?${next.toString()}` : ''}`);
  }

  function openWorkflow(nextWorkflow: SchedulingWorkflow, options?: { creationMode?: string }) {
    const next = new URLSearchParams(searchParams);
    if (nextWorkflow === 'idle') {
      next.delete('workflow');
      next.delete('creationMode');
    } else {
      next.set('workflow', nextWorkflow);
      if (options?.creationMode) {
        next.set('creationMode', options.creationMode);
      } else {
        next.delete('creationMode');
      }
    }
    setSearchParams(next, { replace: true });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSearchParams({
      patientSearch: searchInput.trim() || null,
      patientId:
        searchInput.trim() && searchPatientResults.length === 1 ? searchPatientResults[0].id : null,
    });
  }

  function handleFilterChange(key: string, value: string) {
    updateSearchParams({ [key]: value === 'ALL' ? null : value });
  }

  function handleViewChange(nextView: ScheduleBoardView) {
    updateSearchParams({ view: nextView });
  }

  function handlePreviousWindow() {
    updateSearchParams({ date: shiftDate(date, view, -1) });
  }

  function handleNextWindow() {
    updateSearchParams({ date: shiftDate(date, view, 1) });
  }

  function handleVisitFormChange<Key extends keyof VisitFormState>(key: Key, value: VisitFormState[Key]) {
    setVisitForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleRecurringFormChange<Key extends keyof RecurringFormState>(
    key: Key,
    value: RecurringFormState[Key],
  ) {
    setRecurringForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleRescheduleFormChange<Key extends keyof RescheduleFormState>(
    key: Key,
    value: RescheduleFormState[Key],
  ) {
    setRescheduleForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleVisitSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validationMessage = validateVisitForm(visitForm);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    if (!canManageVisits) {
      setFormError('Your current access profile can view scheduling, but it cannot save visit changes.');
      return;
    }

    setFormSaving(true);

    try {
      const payload: ManageScheduleVisitRequest = {
        ...authContext,
        visitId: workflow === 'edit-visit' ? selectedVisit?.id : undefined,
        patientId: visitForm.patientId,
        branchId: visitForm.branchId || undefined,
        serviceLineId: visitForm.serviceLineId || undefined,
        visitTypeId: visitForm.visitTypeId || undefined,
        plannedStartAt: toOffsetDateTime(visitForm.plannedStartAt),
        plannedEndAt: toOffsetDateTime(visitForm.plannedEndAt),
        timezone: visitForm.timezone,
        priority: visitForm.priority,
        creationMode: visitForm.creationMode,
        notes: visitForm.notes,
      };

      const saved = await saveScheduleVisit(payload);
      setSelectedVisit(saved);
      updateBoardVisit(saved);
      setFormSuccess(
        workflow === 'edit-visit'
          ? 'Visit changes saved. The board refreshes against the backend schedule APIs, so conflicts and rescheduled state remain consistent. This scheduling change is logged.'
          : 'Visit created successfully. Use the board or open-shift panel to continue into staffing workflows. This scheduling change is logged.',
      );
      const next = new URLSearchParams(searchParams);
      next.delete('workflow');
      next.delete('creationMode');
      setSearchParams(next, { replace: true });
      navigate(
        `/app/scheduling/visits/${saved.id}${next.toString() ? `?${next.toString()}` : ''}`,
        { replace: true },
      );
    } catch (cause) {
      setFormError(
        cause instanceof ApiError ? cause.message : 'Unable to save the visit right now.',
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function handleAssignmentCommit() {
    if (!selectedVisit || !selectedCandidateId) {
      setAssignmentError('Choose a caregiver candidate before committing an assignment.');
      return;
    }
    if (!canAssignCaregivers) {
      setAssignmentError('Your current access profile cannot commit caregiver assignments.');
      return;
    }
    if (assignmentPreview?.outcome === 'BLOCKING') {
      setAssignmentError('This caregiver is blocked by schedule conflicts. Choose a different candidate.');
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    const previousSelectedVisit = selectedVisit;
    const previousBoard = board;
    const optimisticCaregiverId = selectedCandidateId;
    const optimisticStatus: SchedulingVisitStatus =
      selectedVisit.status === 'CANCELLED' ? 'CANCELLED' : 'ASSIGNED';

    setSelectedVisit({
      ...selectedVisit,
      activeCaregiverProfileId: optimisticCaregiverId,
      status: optimisticStatus,
      openShiftId: null,
    });
    setBoard((current) =>
      updateBoardState(current, previousSelectedVisit.id, {
        activeCaregiverProfileId: optimisticCaregiverId,
        openShift: false,
        status: optimisticStatus,
      }),
    );

    try {
      if (selectedVisit.openShiftId) {
        await assignFromOpenShift(selectedVisit.openShiftId, {
          ...authContext,
          caregiverProfileId: selectedCandidateId,
          branchId: selectedVisit.branchId ?? undefined,
          assignmentSource: 'BOARD_DND',
          notes: 'Assigned from scheduling board open-shift workflow.',
        });
      } else {
        await assignCaregiverToScheduleVisit({
          ...authContext,
          visitId: selectedVisit.id,
          caregiverProfileId: selectedCandidateId,
          branchId: selectedVisit.branchId ?? undefined,
          assignmentSource: 'BOARD_DND',
          notes: 'Assigned from scheduling board workflow.',
        });
      }

      setAssignmentSuccess(
        'Assignment saved. The board and detail drawer were updated immediately without waiting for a full manual refresh. This scheduling change is logged.',
      );
      openWorkflow('idle');
      navigate(`/app/scheduling/visits/${selectedVisit.id}?${baseSearchParams(searchParams)}`, {
        replace: true,
      });
    } catch (cause) {
      setSelectedVisit(previousSelectedVisit);
      setBoard(previousBoard);
      setAssignmentError(
        cause instanceof ApiError ? cause.message : 'Unable to save the assignment right now.',
      );
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleOpenShiftCreation() {
    if (!selectedVisit) {
      setAssignmentError('Open a visit before creating an open shift.');
      return;
    }
    if (!canManageOpenShifts) {
      setAssignmentError('Your current access profile cannot open staffing gaps as open shifts.');
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    try {
      const openShift = await createScheduleOpenShift({
        ...authContext,
        visitId: selectedVisit.id,
        branchId: selectedVisit.branchId ?? undefined,
        priority: selectedVisit.priority ?? undefined,
        notes: 'Opened from scheduling board workflow.',
      });
      setSelectedVisit({
        ...selectedVisit,
        status: 'OPEN_SHIFT',
        openShiftId: openShift.id,
      });
      setBoard((current) =>
        updateBoardState(current, selectedVisit.id, {
          status: 'OPEN_SHIFT',
          openShift: true,
        }),
      );
      setAssignmentSuccess('Open shift created. It is now visible in the board lane and open-shift pool. This scheduling change is logged.');
    } catch (cause) {
      setAssignmentError(
        cause instanceof ApiError ? cause.message : 'Unable to create the open shift right now.',
      );
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleRecurringSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecurringError(null);
    setRecurringSuccess(null);

    const validationMessage = validateRecurringForm(recurringForm);
    if (validationMessage) {
      setRecurringError(validationMessage);
      return;
    }
    if (!canManageVisits) {
      setRecurringError('Your current access profile cannot save recurring scheduling rules.');
      return;
    }

    setRecurringSaving(true);

    try {
      const saved = await saveRecurringVisitRule({
        ...authContext,
        recurringRuleId: recurringForm.recurringRuleId || undefined,
        patientId: recurringForm.patientId,
        branchId: recurringForm.branchId || undefined,
        serviceLineId: recurringForm.serviceLineId || undefined,
        visitTypeId: recurringForm.visitTypeId || undefined,
        cadence: recurringForm.cadence,
        weekdays: recurringForm.weekdays,
        effectiveStart: recurringForm.effectiveStart,
        effectiveEnd: recurringForm.effectiveEnd || undefined,
        plannedStartTime: recurringForm.plannedStartTime,
        plannedEndTime: recurringForm.plannedEndTime,
        timezone: recurringForm.timezone,
        priority: recurringForm.priority,
        creationMode: recurringForm.creationMode,
        notes: recurringForm.notes,
      });
      setRecurringForm(buildRecurringFormState(saved));
      setRecurringRules((current) => upsertRecurringRule(current, saved));
      setRecurringSuccess(
        recurringForm.recurringRuleId
          ? 'Recurring visit rule updated. Future occurrences will follow the revised cadence and timing. This scheduling change is logged.'
          : 'Recurring visit rule created. Use the preview action below to inspect generated future occurrences. This scheduling change is logged.',
      );
    } catch (cause) {
      setRecurringError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to save the recurring visit rule right now.',
      );
    } finally {
      setRecurringSaving(false);
    }
  }

  async function handleRecurringPreview() {
    if (!recurringForm.recurringRuleId) {
      setRecurringError('Save the recurring visit rule before previewing expanded occurrences.');
      return;
    }

    setRecurringPreviewLoading(true);
    setRecurringError(null);

    try {
      const preview = await expandRecurringVisitRule({
        ...authContext,
        recurringRuleId: recurringForm.recurringRuleId,
        windowStart: recurringForm.effectiveStart,
        windowEnd:
          recurringForm.effectiveEnd ||
          shiftDate(recurringForm.effectiveStart, 'MONTH', 1),
      });
      setRecurringPreview(preview);
    } catch (cause) {
      setRecurringError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to preview recurring occurrences right now.',
      );
    } finally {
      setRecurringPreviewLoading(false);
    }
  }

  async function handleRecurringDeactivate(ruleId: string) {
    setRecurringError(null);
    setRecurringSuccess(null);

    try {
      const saved = await deactivateRecurringVisitRule(ruleId, authContext);
      setRecurringRules((current) => upsertRecurringRule(current, saved));
      if (recurringForm.recurringRuleId === ruleId) {
        setRecurringForm(buildRecurringFormState(saved));
      }
      setRecurringSuccess('Recurring visit rule deactivated. Existing future updates should now stop at the backend rule level. This scheduling change is logged.');
    } catch (cause) {
      setRecurringError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to deactivate the recurring rule right now.',
      );
    }
  }

  async function handleRescheduleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVisit) {
      setRescheduleError('Open a visit before rescheduling.');
      return;
    }
    if (!canRescheduleVisits) {
      setRescheduleError('Your current access profile cannot reschedule visits.');
      return;
    }
    const validationMessage = validateRescheduleForm(rescheduleForm);
    if (validationMessage) {
      setRescheduleError(validationMessage);
      return;
    }
    if (reschedulePreview?.outcome === 'BLOCKING') {
      setRescheduleError('The selected reschedule option is blocked by conflicts. Resolve them before saving.');
      return;
    }

    setRescheduleSaving(true);
    setRescheduleError(null);

    try {
      const response = await rescheduleScheduleVisit({
        ...authContext,
        visitId: selectedVisit.id,
        newPlannedStartAt: toOffsetDateTime(rescheduleForm.newPlannedStartAt),
        newPlannedEndAt: toOffsetDateTime(rescheduleForm.newPlannedEndAt),
        timezone: rescheduleForm.timezone,
        branchId: rescheduleForm.branchId || undefined,
        newCaregiverProfileId: rescheduleForm.newCaregiverProfileId || undefined,
        reason: rescheduleForm.reason,
      } satisfies ScheduleRescheduleRequest);

      const updatedVisit: ScheduleVisitDetail = {
        ...selectedVisit,
        plannedStartAt: response.newPlannedStartAt,
        plannedEndAt: response.newPlannedEndAt,
        timezone: rescheduleForm.timezone,
        branchId: rescheduleForm.branchId || selectedVisit.branchId,
        activeCaregiverProfileId:
          response.newCaregiverProfileId ?? selectedVisit.activeCaregiverProfileId,
        status: 'RESCHEDULED',
      };
      setSelectedVisit(updatedVisit);
      updateBoardVisit(updatedVisit);
      setRescheduleSuccess(
        'Visit rescheduled. The board and detail drawer now show the new timing while preserving the before-vs-after context below. This scheduling change is logged.',
      );
      openWorkflow('idle');
    } catch (cause) {
      setRescheduleError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to reschedule the visit right now.',
      );
    } finally {
      setRescheduleSaving(false);
    }
  }

  async function handleCancelSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVisit) {
      setCancelError('Open a visit before cancelling.');
      return;
    }
    if (!canCancelVisits) {
      setCancelError('Your current access profile cannot cancel visits.');
      return;
    }
    if (!cancelForm.confirmed) {
      setCancelError('Confirm the destructive cancellation action before saving.');
      return;
    }

    setCancelSaving(true);
    setCancelError(null);

    try {
      await cancelScheduleVisit({
        ...authContext,
        visitId: selectedVisit.id,
        cancellationParty: cancelForm.cancellationParty,
        reason: cancelForm.reason,
      });
      const updatedVisit: ScheduleVisitDetail = {
        ...selectedVisit,
        status: 'CANCELLED',
      };
      setSelectedVisit(updatedVisit);
      updateBoardVisit(updatedVisit);
      setCancelSuccess(
        'Visit cancelled. The cancelled state is now visible on the board and the detail drawer. This scheduling change is logged.',
      );
      openWorkflow('idle');
    } catch (cause) {
      setCancelError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to cancel the visit right now.',
      );
    } finally {
      setCancelSaving(false);
    }
  }

  function updateBoardVisit(visit: ScheduleVisitDetail) {
    setBoard((current) =>
      updateBoardState(current, visit.id, {
        branchId: visit.branchId,
        serviceLineId: visit.serviceLineId,
        visitTypeId: visit.visitTypeId,
        plannedStartAt: visit.plannedStartAt,
        plannedEndAt: visit.plannedEndAt,
        timezone: visit.timezone,
        status: visit.status,
        priority: visit.priority,
        activeCaregiverProfileId: visit.activeCaregiverProfileId,
        activeAssignmentId: visit.activeAssignmentId,
        openShift: Boolean(visit.openShiftId),
      }),
    );
  }

  function selectRecurringRule(rule: ScheduleRecurringVisitRule) {
    setRecurringForm(buildRecurringFormState(rule));
    setRecurringPreview([]);
    setRecurringSuccess(null);
    setRecurringError(null);
  }

  function handleDragStart(candidateId: string) {
    setDraggedCandidateId(candidateId);
    setAssignmentDropIntent(candidateId);
  }

  function handleDropOnAssignment(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (draggedCandidateId) {
      setSelectedCandidateId(draggedCandidateId);
      setAssignmentDropIntent(draggedCandidateId);
    }
  }

  function renderConflictItems(items: SchedulingConflictItem[]) {
    if (!items.length) {
      return (
        <SchedulingModuleState
          title="No conflict items returned."
          description="The backend currently considers this assignment or preview clean."
          variant="info"
        />
      );
    }

    return (
      <div className="scheduling-conflict-list">
        {items.map((item) => (
          <article
            key={`${item.code}-${item.message}`}
            className={`scheduling-conflict-card scheduling-conflict-card-${item.outcome.toLowerCase()}`}
          >
            <strong>{item.code}</strong>
            <span className={`status-pill status-${item.outcome.toLowerCase()}`}>{item.outcome}</span>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    );
  }

  function renderSchedulingAuditCallout(actionType: string, title: string, description: string) {
    return (
      <div className="scheduling-audit-callout">
        <strong>{title}</strong>
        <p>{description}</p>
        <Link className="scheduling-audit-link" to={schedulingAuditHref(actionType)}>
          Open matching audit activity
        </Link>
      </div>
    );
  }

  return (
    <SchedulingWorkspaceShell
      eyebrow="Epic 5 scheduling workspace"
      title="Schedule board and decision support"
      description="Epic 5 Phase C extends the live scheduling workspace with assignment, matching, recurrence, reschedule, cancellation, conflict guidance, and travel-aware operational workflows."
    >
      <SchedulingWorkspaceGrid>
        <SchedulingPanel
          title="Scheduling overview and quick entry"
          description="The board summary remains the coordinator home for visit volume, open-shift pressure, and quick paths into new, recurring, or recovery workflows."
        >
          <div className="scheduling-summary-cards">
            <article className="scheduling-summary-card">
              <span className="eyebrow">Today&apos;s scheduled visits</span>
              <strong>{todayVisitCount ?? 'Unavailable'}</strong>
              <p>Live count from the day-board query for today.</p>
            </article>
            <article className="scheduling-summary-card">
              <span className="eyebrow">Filtered visits</span>
              <strong>{filteredVisitCount ?? boardItems.length}</strong>
              <p>Board filters stay in the URL so staffing links and board refreshes remain aligned.</p>
            </article>
            <article className="scheduling-summary-card">
              <span className="eyebrow">Open shifts</span>
              <strong>{openShiftItems.length}</strong>
              <p>Unassigned or open-shift visits waiting on staffing action.</p>
            </article>
            <article className="scheduling-summary-card">
              <span className="eyebrow">Match blockers</span>
              <strong>{boardConflictCount}</strong>
              <p>Candidate blockers currently visible in the assignment workflow.</p>
            </article>
          </div>
          <div className="button-row">
            <button className="button" onClick={() => openWorkflow('new-visit')} type="button">
              New visit
            </button>
            <button
              className="button button-secondary"
              onClick={() => openWorkflow('open-shifts')}
              type="button"
            >
              Review open shifts
            </button>
            <button
              className="button button-secondary"
              onClick={() => openWorkflow('recurring', { creationMode: 'RECURRING_TEMPLATE' })}
              type="button"
            >
              Manage recurring visits
            </button>
          </div>
        </SchedulingPanel>

        <SchedulingPanel
          title="Board controls"
          description="The board keeps date navigation and operational filters together so all decision-support workflows start from the same visible schedule slice."
        >
          <SchedulingBoardHeader
            view={view}
            windowStart={board?.windowStart ?? date}
            windowEnd={board?.windowEnd ?? date}
            onPrevious={handlePreviousWindow}
            onNext={handleNextWindow}
            onViewChange={handleViewChange}
            openShiftsOnly={openShiftsOnly}
            onOpenShiftsOnlyChange={(checked) =>
              updateSearchParams({ openShiftsOnly: checked ? 'true' : null })
            }
          />
          <form className="stack-form-light scheduling-filter-grid" onSubmit={handleSearchSubmit}>
            <label className="field field-light">
              <span>Patient search</span>
              <input
                className="input input-light"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search active patients for a quick board filter"
                value={searchInput}
              />
            </label>
            <label className="field field-light">
              <span>Patient</span>
              <select
                className="input input-light"
                onChange={(event) => handleFilterChange('patientId', event.target.value)}
                value={patientFilter}
              >
                <option value="ALL">All patients</option>
                {searchPatientResults.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-light">
              <span>Caregiver</span>
              <select
                className="input input-light"
                onChange={(event) => handleFilterChange('caregiverId', event.target.value)}
                value={caregiverFilter}
              >
                <option value="ALL">All caregivers</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-light">
              <span>Branch</span>
              <select
                className="input input-light"
                onChange={(event) => handleFilterChange('branchId', event.target.value)}
                value={branchFilter}
              >
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-light">
              <span>Visit state</span>
              <select
                className="input input-light"
                onChange={(event) => handleFilterChange('status', event.target.value)}
                value={statusFilter}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="scheduling-filter-actions">
              <button className="button" type="submit">
                Search
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearchPatientResults(patients);
                  setSearchParams(new URLSearchParams({ view, date }), { replace: true });
                }}
                type="button"
              >
                Reset filters
              </button>
            </div>
          </form>
          <div className="scheduling-filter-summary">
            <strong>Current board scope</strong>
            <p>
              {selectedBranch ? `${selectedBranch.name}. ` : 'All branches. '}
              {selectedCaregiver ? `${selectedCaregiver.displayName}. ` : 'All caregivers. '}
              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}. ` : 'All patients. '}
              {statusFilter === 'ALL' ? 'All visit states.' : `${statusFilter} only.`}
              {openShiftsOnly ? ' Open shifts only.' : ''}
            </p>
            {searchPatientLoading ? <span>Refreshing patient suggestions...</span> : null}
            {optionsError ? <p className="alert">{optionsError}</p> : null}
          </div>
        </SchedulingPanel>

        <SchedulingPanel
          title="Schedule board"
          description="Visit cards stay clickable and visually distinct, while the same board now feeds assignment, reschedule, cancellation, and recurrence workflows."
        >
          {boardError ? <p className="alert">{boardError}</p> : null}
          {boardLoading ? <p>Loading schedule board...</p> : null}
          {!boardLoading && !boardItems.length ? (
            <SchedulingModuleState
              title="No visits match the current board scope."
              description="Adjust the date window or filters, or create a new visit from the quick-entry actions above."
              variant="empty"
            />
          ) : null}
          {!boardLoading && boardItems.length ? (
            <div className="scheduling-board-columns">
              {boardColumns.map((column) => (
                <section key={column.key} className="scheduling-board-column">
                  <div className="scheduling-board-column-header">
                    <strong>{column.label}</strong>
                    <span>{column.items.length} visits</span>
                  </div>
                  <div className="scheduling-board-grid">
                    {column.items.length ? (
                      column.items.map((item) => (
                        <div key={item.visitId} onClick={() => openVisit(item)} role="presentation">
                          <SchedulingVisitCard
                            item={item}
                            to={`/app/scheduling/visits/${item.visitId}?${baseSearchParams(searchParams)}`}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="scheduling-board-empty-lane">
                        <span>No scheduled visits in this lane.</span>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </SchedulingPanel>

        <SchedulingPanel
          title="Open-shift pool"
          description="The open-shift queue remains distinct from the board and now routes directly into match, drag-and-drop assignment, and open-shift-specific staffing recovery."
        >
          {openShiftItems.length === 0 ? (
            <SchedulingModuleState
              title="No open shifts in the current board scope."
              description="When a visit is unassigned or explicitly flagged as an open shift, it will appear here for review."
              variant="empty"
            />
          ) : (
            <div className="scheduling-open-shift-list">
              {openShiftItems.map((item) => (
                <article key={item.visitId} className="scheduling-open-shift-card">
                  <div className="scheduling-open-shift-header">
                    <strong>{item.patientDisplayName}</strong>
                    <span className={`status-pill status-${item.status.toLowerCase().replace('_', '-')}`}>
                      {item.status}
                    </span>
                  </div>
                  <p>
                    {formatDateTime(item.plannedStartAt)} to {formatDateTime(item.plannedEndAt)}
                  </p>
                  <p>
                    Branch:{' '}
                    {branches.find((branch) => branch.id === item.branchId)?.name ?? 'Unspecified'}
                  </p>
                  <div className="scheduling-open-shift-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => openVisit(item)}
                      type="button"
                    >
                      Inspect
                    </button>
                    <button
                      className="button button-small"
                      disabled={!canAssignCaregivers}
                      onClick={() => {
                        openVisit(item);
                        openWorkflow('assign');
                      }}
                      type="button"
                    >
                      {canAssignCaregivers ? 'Review matches' : 'Assignment restricted'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SchedulingPanel>

        {visitId ? (
          <SchedulingDetailDrawer
            title={selectedVisit ? `Visit ${selectedVisit.id}` : 'Visit detail'}
            description="The route-backed detail drawer remains the anchor for assignment, reschedule, and cancellation workflows without losing the current board context."
            onClose={closeDrawer}
          >
            {selectedVisitLoading ? <p>Loading visit detail...</p> : null}
            {selectedVisitError ? <p className="alert">{selectedVisitError}</p> : null}
            {selectedVisit ? (
              <>
                <dl className="scheduling-detail-meta">
                  <div>
                    <dt>Patient</dt>
                    <dd>{patientLabel(patients, selectedVisit.patientId)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span
                        className={`status-pill status-${selectedVisit.status
                          .toLowerCase()
                          .replace('_', '-')}`}
                      >
                        {selectedVisit.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Window</dt>
                    <dd>
                      {formatDateTime(selectedVisit.plannedStartAt)} to{' '}
                      {formatDateTime(selectedVisit.plannedEndAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{selectedVisit.timezone}</dd>
                  </div>
                  <div>
                    <dt>Caregiver</dt>
                    <dd>{caregiverLabel(caregivers, selectedVisit.activeCaregiverProfileId)}</dd>
                  </div>
                  <div>
                    <dt>Open shift</dt>
                    <dd>{selectedVisit.openShiftId ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
                <div className="scheduling-drawer-actions">
                  <button
                    className="button"
                    disabled={!canAssignCaregivers}
                    onClick={() => openWorkflow('assign')}
                    type="button"
                  >
                    {canAssignCaregivers ? 'Assignment workflow' : 'Assignment restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canRescheduleVisits}
                    onClick={() => openWorkflow('reschedule')}
                    type="button"
                  >
                    {canRescheduleVisits ? 'Reschedule workflow' : 'Reschedule restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canCancelVisits}
                    onClick={() => openWorkflow('cancel')}
                    type="button"
                  >
                    {canCancelVisits ? 'Cancel workflow' : 'Cancellation restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => openWorkflow('recurring', { creationMode: 'RECURRING_TEMPLATE' })}
                    type="button"
                  >
                    Recurring workflow
                  </button>
                </div>
                {selectedVisit.notes ? (
                  <div className="scheduling-detail-notes">
                    <strong>Visit notes</strong>
                    <p>{selectedVisit.notes}</p>
                  </div>
                ) : null}
              </>
            ) : null}
          </SchedulingDetailDrawer>
        ) : null}

        {workflow === 'new-visit' || workflow === 'edit-visit' ? (
          <SchedulingMutationFrame
            title={workflow === 'edit-visit' ? 'Edit scheduled visit' : 'Create scheduled visit'}
            helper="Visit creation and edits remain inside the board workspace so validation, timing context, and staffing follow-up stay visible."
            mode={canManageVisits ? 'editable' : 'read-only'}
            tone={formError ? 'conflict' : formSuccess ? 'success' : undefined}
            toneMessage={formError ?? formSuccess ?? undefined}
          >
            {renderSchedulingAuditCallout(
              workflow === 'edit-visit' ? 'SCHEDULE_VISIT_UPDATED' : 'SCHEDULE_VISIT_CREATED',
              'Schedule mutations are logged',
              'Creating or updating schedule visits is an audit-sensitive scheduling action. Use the filtered audit view when you need to confirm who changed visit timing or board context.',
            )}
            <form className="stack-form-light scheduling-visit-form" onSubmit={handleVisitSave}>
              <div className="patient-form-grid">
                <label className="field field-light">
                  <span>Patient</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('patientId', event.target.value)}
                    value={visitForm.patientId}
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-light">
                  <span>Branch</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('branchId', event.target.value)}
                    value={visitForm.branchId}
                  >
                    <option value="">Unspecified branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-light">
                  <span>Service line</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => {
                      handleVisitFormChange('serviceLineId', event.target.value);
                      handleVisitFormChange('visitTypeId', '');
                    }}
                    value={visitForm.serviceLineId}
                  >
                    <option value="">Optional service line</option>
                    {serviceLines.map((serviceLine) => (
                      <option key={serviceLine.id} value={serviceLine.id}>
                        {serviceLine.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-light">
                  <span>Visit type</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('visitTypeId', event.target.value)}
                    value={visitForm.visitTypeId}
                  >
                    <option value="">Optional visit type</option>
                    {filteredVisitTypes.map((visitType) => (
                      <option key={visitType.id} value={visitType.id}>
                        {visitType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-light">
                  <span>Planned start</span>
                  <input
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('plannedStartAt', event.target.value)}
                    type="datetime-local"
                    value={visitForm.plannedStartAt}
                  />
                </label>
                <label className="field field-light">
                  <span>Planned end</span>
                  <input
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('plannedEndAt', event.target.value)}
                    type="datetime-local"
                    value={visitForm.plannedEndAt}
                  />
                </label>
                <label className="field field-light">
                  <span>Timezone</span>
                  <input
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('timezone', event.target.value)}
                    placeholder="America/Chicago"
                    value={visitForm.timezone}
                  />
                </label>
                <label className="field field-light">
                  <span>Priority</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('priority', event.target.value)}
                    value={visitForm.priority}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>
                <label className="field field-light">
                  <span>Visit mode</span>
                  <select
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleVisitFormChange('creationMode', event.target.value)}
                    value={visitForm.creationMode}
                  >
                    <option value="MANUAL">One-time visit</option>
                    <option value="RECURRING_TEMPLATE">Recurring template start</option>
                  </select>
                </label>
              </div>
              <label className="field field-light">
                <span>Notes</span>
                <textarea
                  className="input input-light"
                  disabled={!canManageVisits}
                  onChange={(event) => handleVisitFormChange('notes', event.target.value)}
                  rows={4}
                  value={visitForm.notes}
                />
              </label>
              <div className="button-row">
                <button className="button" disabled={formSaving || !canManageVisits} type="submit">
                  {formSaving ? 'Saving visit...' : workflow === 'edit-visit' ? 'Save visit' : 'Create visit'}
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => openWorkflow('idle')}
                  type="button"
                >
                  Close form
                </button>
              </div>
            </form>
          </SchedulingMutationFrame>
        ) : null}

        {workflow === 'assign' || workflow === 'open-shifts' ? (
          <SchedulingMutationFrame
            title="Caregiver assignment and match panel"
            helper="Phase C keeps matching, drag-and-drop intent, conflict preview, travel indicators, and final assignment commit in one scheduling workflow."
            mode={canAssignCaregivers ? 'editable' : 'read-only'}
            tone={assignmentError ? 'conflict' : assignmentSuccess ? 'success' : undefined}
            toneMessage={assignmentError ?? assignmentSuccess ?? undefined}
          >
            {renderSchedulingAuditCallout(
              'SCHEDULE_CAREGIVER_ASSIGNED',
              'Assignment decisions are logged',
              'Assignment commits and staffing-gap recovery are controlled scheduling mutations. Use the filtered audit view when you need to confirm who staffed a visit or resolved an open shift.',
            )}
            {!selectedVisit ? (
              <SchedulingModuleState
                title="Choose a visit before reviewing matches."
                description="Open a visit from the board or open-shift pool to start assignment review."
                variant="empty"
              />
            ) : (
              <div className="scheduling-assignment-layout">
                <div className="scheduling-match-panel">
                  <div className="scheduling-inline-callout">
                    <strong>Match candidates</strong>
                    <p>
                      Ranked candidates combine availability, overlap checks, overtime outlook, and
                      travel feasibility without exposing raw internal rule-engine metadata.
                    </p>
                  </div>
                  {matchesLoading ? <p>Loading candidate matches...</p> : null}
                  {matchesError ? <p className="alert">{matchesError}</p> : null}
                  {!matchesLoading && !matches.length ? (
                    <SchedulingModuleState
                      title="No match candidates returned."
                      description="The selected visit may need setup changes, a broader board scope, or a manual staffing escalation."
                      variant="empty"
                    />
                  ) : null}
                  <div className="scheduling-match-list">
                    {matches.map((candidate, index) => (
                      <article
                        key={candidate.caregiverProfileId}
                        className={`scheduling-match-card ${
                          candidate.caregiverProfileId === selectedCandidateId
                            ? 'scheduling-match-card-selected'
                            : ''
                        }`}
                        draggable={canAssignCaregivers}
                        onClick={() => setSelectedCandidateId(candidate.caregiverProfileId)}
                        onDragStart={() => handleDragStart(candidate.caregiverProfileId)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="scheduling-match-card-header">
                          <strong>{candidate.caregiverDisplayName}</strong>
                          <span className="scheduling-match-rank">#{index + 1}</span>
                        </div>
                        <div className="scheduling-match-card-meta">
                          <span>Score {candidate.score}</span>
                          <span className={`status-pill status-${candidate.outcome.toLowerCase()}`}>
                            {candidate.outcome}
                          </span>
                        </div>
                        <p>{summarizeFactors(candidate.factors)}</p>
                        <div className="scheduling-travel-summary">
                          <span>{formatTravelLabel(candidate.travelAwareness)}</span>
                          <span>{formatOvertimeLabel(candidate.overtimeEvaluation)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="scheduling-assignment-dropzone-wrapper">
                  <div
                    className={`scheduling-assignment-dropzone ${
                      assignmentDropIntent ? 'scheduling-assignment-dropzone-active' : ''
                    }`}
                    onDragEnd={() => setDraggedCandidateId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDropOnAssignment}
                  >
                    <strong>
                      {selectedCandidate
                        ? `Assignment intent: ${selectedCandidate.caregiverDisplayName}`
                        : 'Drag a caregiver candidate here or click one from the ranked list.'}
                    </strong>
                    <p>
                      The drop target makes assignment intent explicit before commit, so blocked
                      drops and warnings can be reviewed rather than saved blindly.
                    </p>
                    {selectedVisit.openShiftId && canManageOpenShifts ? (
                      <button
                        className="button button-secondary button-small"
                        onClick={handleOpenShiftCreation}
                        type="button"
                      >
                        Re-open staffing gap as open shift
                      </button>
                    ) : null}
                  </div>

                  {assignmentPreviewLoading ? <p>Previewing conflicts and travel guidance...</p> : null}
                  {assignmentPreview ? (
                    <div className="scheduling-preview-stack">
                      <div className="scheduling-inline-callout">
                        <strong>Assignment preview</strong>
                        <p>
                          Blocking conflicts stop the assignment. Warnings surface overlap, overtime,
                          or route-tightness concerns before the board is changed.
                        </p>
                      </div>
                      <div className="scheduling-guidance-grid">
                        <article className="scheduling-guidance-card">
                          <strong>Travel awareness</strong>
                          <p>{formatTravelLabel(assignmentPreview.travelAwareness)}</p>
                        </article>
                        <article className="scheduling-guidance-card">
                          <strong>Overtime and overlap</strong>
                          <p>{formatOvertimeLabel(assignmentPreview.overtimeEvaluation)}</p>
                        </article>
                      </div>
                      {renderConflictItems(assignmentPreview.items)}
                    </div>
                  ) : null}
                  <div className="button-row">
                    <button
                      className="button"
                      disabled={assignmentSaving || !selectedCandidateId || !canAssignCaregivers}
                      onClick={handleAssignmentCommit}
                      type="button"
                    >
                      {assignmentSaving ? 'Saving assignment...' : 'Commit assignment'}
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => openWorkflow('idle')}
                      type="button"
                    >
                      Close assignment workflow
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SchedulingMutationFrame>
        ) : null}

        {workflow === 'recurring' ? (
          <SchedulingMutationFrame
            title="Recurring visit management"
            helper="Recurring cadence, weekdays, effective windows, and future-occurrence scope live in one workflow so schedulers can create or edit repeat patterns confidently."
            mode={canManageVisits ? 'editable' : 'read-only'}
            tone={recurringError ? 'conflict' : recurringSuccess ? 'success' : 'warning'}
            toneMessage={
              recurringError ??
              recurringSuccess ??
              'Updating a recurring rule affects future occurrences generated from that rule. Existing historical visits remain visible through the schedule board.'
            }
          >
            {renderSchedulingAuditCallout(
              recurringForm.recurringRuleId
                ? 'SCHEDULE_RECURRING_RULE_UPDATED'
                : 'SCHEDULE_RECURRING_RULE_CREATED',
              'Recurring rule changes are logged',
              'Recurring rule creates and updates are audit-visible scheduling mutations because they affect future generated visits without exposing internal expansion metadata.',
            )}
            <div className="scheduling-recurring-layout">
              <div className="scheduling-recurring-list">
                <strong>Existing recurring rules</strong>
                {recurringLoading ? <p>Loading recurring visit rules...</p> : null}
                {!recurringLoading && !recurringRules.length ? (
                  <SchedulingModuleState
                    title="No recurring rules for the current patient yet."
                    description="Start by saving a recurring rule below, then preview the future occurrences generated by it."
                    variant="empty"
                  />
                ) : null}
                {recurringRules.map((rule) => (
                  <article
                    key={rule.id}
                    className={`scheduling-recurring-card ${
                      recurringForm.recurringRuleId === rule.id ? 'scheduling-recurring-card-selected' : ''
                    }`}
                  >
                    <div className="scheduling-open-shift-header">
                      <strong>{rule.cadence}</strong>
                      <span className={`status-pill status-${rule.status.toLowerCase()}`}>{rule.status}</span>
                    </div>
                    <p>
                      {rule.weekdays.join(', ') || 'No weekdays'} • {rule.plannedStartTime} to{' '}
                      {rule.plannedEndTime}
                    </p>
                    <div className="scheduling-open-shift-actions">
                      <button
                        className="button button-secondary button-small"
                        onClick={() => selectRecurringRule(rule)}
                        type="button"
                      >
                        Edit rule
                      </button>
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleRecurringDeactivate(rule.id)}
                        type="button"
                      >
                        Deactivate
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <form className="stack-form-light scheduling-visit-form" onSubmit={handleRecurringSave}>
                <div className="patient-form-grid">
                  <label className="field field-light">
                    <span>Patient</span>
                    <select
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('patientId', event.target.value)}
                      value={recurringForm.patientId}
                    >
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-light">
                    <span>Cadence</span>
                    <select
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) =>
                        handleRecurringFormChange('cadence', event.target.value as RecurringVisitCadence)
                      }
                      value={recurringForm.cadence}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </label>
                  <label className="field field-light">
                    <span>Branch</span>
                    <select
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('branchId', event.target.value)}
                      value={recurringForm.branchId}
                    >
                      <option value="">Unspecified branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-light">
                    <span>Service line</span>
                    <select
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => {
                        handleRecurringFormChange('serviceLineId', event.target.value);
                        handleRecurringFormChange('visitTypeId', '');
                      }}
                      value={recurringForm.serviceLineId}
                    >
                      <option value="">Optional service line</option>
                      {serviceLines.map((serviceLine) => (
                        <option key={serviceLine.id} value={serviceLine.id}>
                          {serviceLine.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-light">
                    <span>Visit type</span>
                    <select
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('visitTypeId', event.target.value)}
                      value={recurringForm.visitTypeId}
                    >
                      <option value="">Optional visit type</option>
                      {recurringVisitTypes.map((visitType) => (
                        <option key={visitType.id} value={visitType.id}>
                          {visitType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-light">
                    <span>Effective start</span>
                    <input
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('effectiveStart', event.target.value)}
                      type="date"
                      value={recurringForm.effectiveStart}
                    />
                  </label>
                  <label className="field field-light">
                    <span>Effective end</span>
                    <input
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('effectiveEnd', event.target.value)}
                      type="date"
                      value={recurringForm.effectiveEnd}
                    />
                  </label>
                  <label className="field field-light">
                    <span>Planned start time</span>
                    <input
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('plannedStartTime', event.target.value)}
                      type="time"
                      value={recurringForm.plannedStartTime}
                    />
                  </label>
                  <label className="field field-light">
                    <span>Planned end time</span>
                    <input
                      className="input input-light"
                      disabled={!canManageVisits}
                      onChange={(event) => handleRecurringFormChange('plannedEndTime', event.target.value)}
                      type="time"
                      value={recurringForm.plannedEndTime}
                    />
                  </label>
                </div>

                <div className="selection-grid">
                  {RECURRENCE_WEEKDAYS.map((weekday) => (
                    <label key={weekday} className="checkbox-card">
                      <input
                        checked={recurringForm.weekdays.includes(weekday)}
                        disabled={!canManageVisits}
                        onChange={(event) => {
                          setRecurringForm((current) => ({
                            ...current,
                            weekdays: event.target.checked
                              ? [...current.weekdays, weekday]
                              : current.weekdays.filter((value) => value !== weekday),
                          }));
                        }}
                        type="checkbox"
                      />
                      <div>
                        <strong>{weekday}</strong>
                        <p>Select the weekdays this recurring pattern should generate.</p>
                      </div>
                    </label>
                  ))}
                </div>

                <label className="field field-light">
                  <span>Notes</span>
                  <textarea
                    className="input input-light"
                    disabled={!canManageVisits}
                    onChange={(event) => handleRecurringFormChange('notes', event.target.value)}
                    rows={4}
                    value={recurringForm.notes}
                  />
                </label>
                <div className="button-row">
                  <button className="button" disabled={recurringSaving || !canManageVisits} type="submit">
                    {recurringSaving
                      ? 'Saving recurring rule...'
                      : recurringForm.recurringRuleId
                        ? 'Save recurring rule'
                        : 'Create recurring rule'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!recurringForm.recurringRuleId}
                    onClick={handleRecurringPreview}
                    type="button"
                  >
                    {recurringPreviewLoading ? 'Previewing...' : 'Preview occurrences'}
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => openWorkflow('idle')}
                    type="button"
                  >
                    Close recurring workflow
                  </button>
                </div>
              </form>
            </div>

            {recurringPreview.length ? (
              <div className="scheduling-preview-list">
                <strong>Expanded occurrence preview</strong>
                <div className="scheduling-open-shift-list">
                  {recurringPreview.map((visit) => (
                    <article key={visit.id} className="scheduling-open-shift-card">
                      <strong>{formatDateTime(visit.plannedStartAt)}</strong>
                      <p>
                        {formatDateTime(visit.plannedStartAt)} to {formatDateTime(visit.plannedEndAt)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </SchedulingMutationFrame>
        ) : null}

        {workflow === 'reschedule' ? (
          <SchedulingMutationFrame
            title="Reschedule workflow"
            helper="The reschedule flow shows before-versus-after timing, optional caregiver change, and previewed conflicts before the change is committed."
            mode={canRescheduleVisits ? 'editable' : 'read-only'}
            tone={rescheduleError ? 'conflict' : rescheduleSuccess ? 'success' : undefined}
            toneMessage={rescheduleError ?? rescheduleSuccess ?? undefined}
          >
            {renderSchedulingAuditCallout(
              'SCHEDULE_VISIT_RESCHEDULED',
              'Reschedule actions are logged',
              'Rescheduling changes the visit timeline and can affect staffing history. Use the filtered audit view when you need to confirm who changed the schedule and when.',
            )}
            {!selectedVisit ? (
              <SchedulingModuleState
                title="Choose a visit before rescheduling."
                description="Open a visit from the board to compare its current timing against the proposed schedule."
                variant="empty"
              />
            ) : (
              <>
                <div className="scheduling-guidance-grid">
                  <article className="scheduling-guidance-card">
                    <strong>Current schedule</strong>
                    <p>
                      {formatDateTime(selectedVisit.plannedStartAt)} to {formatDateTime(selectedVisit.plannedEndAt)}
                    </p>
                    <p>{caregiverLabel(caregivers, selectedVisit.activeCaregiverProfileId)}</p>
                  </article>
                  <article className="scheduling-guidance-card">
                    <strong>Proposed schedule</strong>
                    <p>
                      {rescheduleForm.newPlannedStartAt
                        ? `${formatDateTime(toOffsetDateTime(rescheduleForm.newPlannedStartAt))} to ${formatDateTime(
                            toOffsetDateTime(rescheduleForm.newPlannedEndAt),
                          )}`
                        : 'Choose a new date and time.'}
                    </p>
                    <p>{caregiverLabel(caregivers, rescheduleForm.newCaregiverProfileId || null)}</p>
                  </article>
                </div>
                <form className="stack-form-light scheduling-visit-form" onSubmit={handleRescheduleSave}>
                  <div className="patient-form-grid">
                    <label className="field field-light">
                      <span>New planned start</span>
                      <input
                        className="input input-light"
                        disabled={!canRescheduleVisits}
                        onChange={(event) =>
                          handleRescheduleFormChange('newPlannedStartAt', event.target.value)
                        }
                        type="datetime-local"
                        value={rescheduleForm.newPlannedStartAt}
                      />
                    </label>
                    <label className="field field-light">
                      <span>New planned end</span>
                      <input
                        className="input input-light"
                        disabled={!canRescheduleVisits}
                        onChange={(event) =>
                          handleRescheduleFormChange('newPlannedEndAt', event.target.value)
                        }
                        type="datetime-local"
                        value={rescheduleForm.newPlannedEndAt}
                      />
                    </label>
                    <label className="field field-light">
                      <span>Timezone</span>
                      <input
                        className="input input-light"
                        disabled={!canRescheduleVisits}
                        onChange={(event) => handleRescheduleFormChange('timezone', event.target.value)}
                        value={rescheduleForm.timezone}
                      />
                    </label>
                    <label className="field field-light">
                      <span>New caregiver</span>
                      <select
                        className="input input-light"
                        disabled={!canRescheduleVisits}
                        onChange={(event) =>
                          handleRescheduleFormChange('newCaregiverProfileId', event.target.value)
                        }
                        value={rescheduleForm.newCaregiverProfileId}
                      >
                        <option value="">Keep current caregiver</option>
                        {caregivers.map((caregiver) => (
                          <option key={caregiver.id} value={caregiver.id}>
                            {caregiver.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field field-light">
                    <span>Reason</span>
                    <textarea
                      className="input input-light"
                      disabled={!canRescheduleVisits}
                      onChange={(event) => handleRescheduleFormChange('reason', event.target.value)}
                      rows={3}
                      value={rescheduleForm.reason}
                    />
                  </label>
                  {reschedulePreviewLoading ? <p>Previewing reschedule conflicts...</p> : null}
                  {reschedulePreview ? renderConflictItems(reschedulePreview.items) : null}
                  <div className="button-row">
                    <button className="button" disabled={rescheduleSaving || !canRescheduleVisits} type="submit">
                      {rescheduleSaving ? 'Saving reschedule...' : 'Commit reschedule'}
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => openWorkflow('idle')}
                      type="button"
                    >
                      Close reschedule workflow
                    </button>
                  </div>
                </form>
              </>
            )}
          </SchedulingMutationFrame>
        ) : null}

        {workflow === 'cancel' ? (
          <SchedulingMutationFrame
            title="Cancellation workflow"
            helper="Cancellation remains explicit and destructive, with reason capture and visible downstream effects on board state."
            mode={canCancelVisits ? 'editable' : 'read-only'}
            tone={cancelError ? 'conflict' : cancelSuccess ? 'success' : 'warning'}
            toneMessage={
              cancelError ??
              cancelSuccess ??
              'Cancelled visits remain visible on the board with a distinct lifecycle state so schedulers do not lose context.'
            }
          >
            {renderSchedulingAuditCallout(
              'SCHEDULE_VISIT_CANCELLED',
              'Cancellation actions are logged',
              'Visit cancellations are audit-sensitive scheduling mutations. Use the filtered audit view when you need to confirm who cancelled the visit or why staffing stopped.',
            )}
            {!selectedVisit ? (
              <SchedulingModuleState
                title="Choose a visit before cancelling."
                description="Open a visit from the board or drawer to start cancellation."
                variant="empty"
              />
            ) : (
              <form className="stack-form-light scheduling-visit-form" onSubmit={handleCancelSave}>
                <div className="scheduling-inline-callout">
                  <strong>Destructive action</strong>
                  <p>
                    Cancelling a visit changes the board state immediately and should only be used
                    when the visit should no longer be staffed or completed.
                  </p>
                </div>
                <div className="patient-form-grid">
                  <label className="field field-light">
                    <span>Cancellation party</span>
                    <select
                      className="input input-light"
                      disabled={!canCancelVisits}
                      onChange={(event) =>
                        setCancelForm((current) => ({
                          ...current,
                          cancellationParty: event.target.value as VisitCancellationParty,
                        }))
                      }
                      value={cancelForm.cancellationParty}
                    >
                      <option value="AGENCY">Agency</option>
                      <option value="CAREGIVER">Caregiver</option>
                      <option value="PATIENT">Patient</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </label>
                </div>
                <label className="field field-light">
                  <span>Reason</span>
                  <textarea
                    className="input input-light"
                    disabled={!canCancelVisits}
                    onChange={(event) =>
                      setCancelForm((current) => ({ ...current, reason: event.target.value }))
                    }
                    rows={3}
                    value={cancelForm.reason}
                  />
                </label>
                <label className="checkbox-card">
                  <input
                    checked={cancelForm.confirmed}
                    disabled={!canCancelVisits}
                    onChange={(event) =>
                      setCancelForm((current) => ({ ...current, confirmed: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <div>
                    <strong>Confirm cancellation</strong>
                    <p>I understand this visit will move to cancelled state on the schedule board.</p>
                  </div>
                </label>
                <div className="button-row">
                  <button className="button" disabled={cancelSaving || !canCancelVisits} type="submit">
                    {cancelSaving ? 'Cancelling visit...' : 'Cancel visit'}
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => openWorkflow('idle')}
                    type="button"
                  >
                    Close cancellation workflow
                  </button>
                </div>
              </form>
            )}
          </SchedulingMutationFrame>
        ) : null}
      </SchedulingWorkspaceGrid>
    </SchedulingWorkspaceShell>
  );
}

function normalizeView(value: string | null): ScheduleBoardView {
  if (value === 'DAY' || value === 'MONTH') {
    return value;
  }
  return 'WEEK';
}

function normalizeStatus(value: string | null): SchedulingVisitStatus | 'ALL' {
  if (
    value === 'PLANNED' ||
    value === 'ASSIGNED' ||
    value === 'OPEN_SHIFT' ||
    value === 'RESCHEDULED' ||
    value === 'CANCELLED'
  ) {
    return value;
  }
  return 'ALL';
}

function normalizeWorkflow(value: string | null): SchedulingWorkflow {
  if (
    value === 'new-visit' ||
    value === 'edit-visit' ||
    value === 'assign' ||
    value === 'open-shifts' ||
    value === 'recurring' ||
    value === 'reschedule' ||
    value === 'cancel'
  ) {
    return value;
  }
  return 'idle';
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(value: string, view: ScheduleBoardView, amount: number): string {
  const base = new Date(`${value}T12:00:00`);
  if (view === 'DAY') {
    base.setDate(base.getDate() + amount);
  } else if (view === 'WEEK') {
    base.setDate(base.getDate() + amount * 7);
  } else {
    base.setMonth(base.getMonth() + amount);
  }
  return toIsoDate(base);
}

function baseSearchParams(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete('workflow');
  next.delete('creationMode');
  return next.toString();
}

function buildBoardColumns(board: ScheduleBoardResponse | null): BoardColumn[] {
  if (!board) {
    return [];
  }

  const grouped = new Map<string, ScheduleBoardItem[]>();
  const start = new Date(`${board.windowStart}T12:00:00`);
  const end = new Date(`${board.windowEnd}T12:00:00`);
  const cursor = new Date(start);

  while (cursor <= end) {
    grouped.set(toIsoDate(cursor), []);
    cursor.setDate(cursor.getDate() + 1);
  }

  board.items.forEach((item) => {
    const key = toIsoDate(new Date(item.plannedStartAt));
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    label: new Intl.DateTimeFormat(undefined, {
      weekday: board.view === 'DAY' ? 'long' : 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${key}T12:00:00`)),
    items: items.sort((left, right) => left.plannedStartAt.localeCompare(right.plannedStartAt)),
  }));
}

function buildFormStateFromVisit(visit: ScheduleVisitDetail): VisitFormState {
  return {
    patientId: visit.patientId,
    branchId: visit.branchId ?? '',
    serviceLineId: visit.serviceLineId ?? '',
    visitTypeId: visit.visitTypeId ?? '',
    plannedStartAt: toDateTimeLocal(visit.plannedStartAt),
    plannedEndAt: toDateTimeLocal(visit.plannedEndAt),
    timezone: visit.timezone,
    priority: visit.priority ?? 'STANDARD',
    creationMode: visit.creationMode ?? 'MANUAL',
    notes: visit.notes ?? '',
  };
}

function buildRecurringFormState(rule: ScheduleRecurringVisitRule): RecurringFormState {
  return {
    recurringRuleId: rule.id,
    patientId: rule.patientId,
    branchId: rule.branchId ?? '',
    serviceLineId: rule.serviceLineId ?? '',
    visitTypeId: rule.visitTypeId ?? '',
    cadence: rule.cadence,
    weekdays: rule.weekdays,
    effectiveStart: rule.effectiveStart,
    effectiveEnd: rule.effectiveEnd ?? '',
    plannedStartTime: rule.plannedStartTime,
    plannedEndTime: rule.plannedEndTime,
    timezone: rule.timezone,
    priority: rule.priority ?? 'STANDARD',
    creationMode: rule.creationMode ?? 'RECURRING_TEMPLATE',
    notes: rule.notes ?? '',
  };
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function toOffsetDateTime(value: string): string {
  return new Date(value).toISOString();
}

function validateVisitForm(form: VisitFormState): string | null {
  if (!form.patientId) {
    return 'Select a patient before saving the scheduled visit.';
  }
  if (!form.plannedStartAt || !form.plannedEndAt) {
    return 'Both planned start and planned end are required.';
  }
  if (!form.timezone.trim()) {
    return 'Timezone is required so the board and recurrence behavior remain understandable.';
  }
  if (new Date(form.plannedEndAt).getTime() <= new Date(form.plannedStartAt).getTime()) {
    return 'Planned end must be later than planned start.';
  }
  return null;
}

function validateRecurringForm(form: RecurringFormState): string | null {
  if (!form.patientId) {
    return 'Select a patient before saving the recurring rule.';
  }
  if (!form.effectiveStart) {
    return 'Effective start is required.';
  }
  if (!form.plannedStartTime || !form.plannedEndTime) {
    return 'Planned start and end times are required.';
  }
  if (form.plannedEndTime <= form.plannedStartTime) {
    return 'Planned end time must be later than planned start time.';
  }
  if (!form.timezone.trim()) {
    return 'Timezone is required.';
  }
  if (!form.weekdays.length) {
    return 'Select at least one weekday for the recurring pattern.';
  }
  return null;
}

function validateRescheduleForm(form: RescheduleFormState): string | null {
  if (!form.newPlannedStartAt || !form.newPlannedEndAt) {
    return 'New planned start and end times are required.';
  }
  if (!form.timezone.trim()) {
    return 'Timezone is required.';
  }
  if (new Date(form.newPlannedEndAt).getTime() <= new Date(form.newPlannedStartAt).getTime()) {
    return 'The rescheduled end time must be later than the rescheduled start time.';
  }
  return null;
}

function updateBoardState(
  current: ScheduleBoardResponse | null,
  visitId: string,
  updates: Partial<ScheduleBoardItem>,
): ScheduleBoardResponse | null {
  if (!current) {
    return current;
  }
  return {
    ...current,
    items: current.items.map((item) =>
      item.visitId === visitId
        ? {
            ...item,
            ...updates,
          }
        : item,
    ),
  };
}

function upsertRecurringRule(
  current: ScheduleRecurringVisitRule[],
  nextRule: ScheduleRecurringVisitRule,
): ScheduleRecurringVisitRule[] {
  const existing = current.some((rule) => rule.id === nextRule.id);
  if (existing) {
    return current.map((rule) => (rule.id === nextRule.id ? nextRule : rule));
  }
  return [nextRule, ...current];
}

function caregiverLabel(caregivers: CaregiverSummary[], caregiverId: string | null): string {
  return caregivers.find((caregiver) => caregiver.id === caregiverId)?.displayName ?? 'Unassigned';
}

function patientLabel(patients: PatientSummary[], patientId: string): string {
  const patient = patients.find((entry) => entry.id === patientId);
  return patient ? `${patient.firstName} ${patient.lastName}` : patientId;
}

function summarizeFactors(items: SchedulingConflictItem[]): string {
  if (!items.length) {
    return 'No specific backend match factors were returned.';
  }
  return items
    .slice(0, 2)
    .map((item) => item.message)
    .join(' ');
}

function formatTravelLabel(travelAwareness: TravelAwareness): string {
  if (!travelAwareness) {
    return 'Travel data unavailable';
  }
  return `${travelAwareness.level} • ${travelAwareness.estimatedTravelMinutes} min travel, ${travelAwareness.gapMinutes} min gap`;
}

function formatOvertimeLabel(overtime: OvertimeEvaluation): string {
  if (!overtime) {
    return 'Overtime guidance unavailable';
  }
  return `${overtime.outcome} • ${overtime.message ?? `${overtime.projectedScheduledMinutes} projected min`}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
