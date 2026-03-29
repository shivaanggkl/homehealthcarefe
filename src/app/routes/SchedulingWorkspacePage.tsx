import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  BranchSummary,
  CaregiverSummary,
  fetchBranches,
  fetchCaregivers,
  fetchPatients,
  fetchScheduleBoard,
  fetchScheduleVisit,
  fetchScheduleVisits,
  fetchServiceLines,
  fetchVisitTypes,
  ManageScheduleVisitRequest,
  PatientSummary,
  ScheduleBoardItem,
  ScheduleBoardResponse,
  ScheduleBoardView,
  SchedulingVisitStatus,
  ScheduleVisitDetail,
  saveScheduleVisit,
  ServiceLineSummary,
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
  | 'recurring';

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
  const unassignedItems = boardItems.filter((item) => !item.activeCaregiverProfileId);
  const rescheduledItems = boardItems.filter((item) => item.status === 'RESCHEDULED');
  const boardColumns = buildBoardColumns(board);
  const filteredVisitTypes = visitForm.serviceLineId
    ? visitTypes.filter((visitType) => visitType.serviceLineId === visitForm.serviceLineId)
    : visitTypes;

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
    navigate(`/app/scheduling/visits/${visit.visitId}?${next.toString()}`);
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
      setFormSuccess(
        workflow === 'edit-visit'
          ? 'Visit changes saved. The board refreshes against the backend schedule APIs, so conflicts and rescheduled state remain consistent.'
          : 'Visit created successfully. Use the board or open-shift panel to continue into staffing workflows.',
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
        cause instanceof ApiError
          ? cause.message
          : 'Unable to save the visit right now.',
      );
    } finally {
      setFormSaving(false);
    }
  }

  const selectedPatient = patients.find((patient) => patient.id === patientFilter);
  const selectedCaregiver = caregivers.find((caregiver) => caregiver.id === caregiverFilter);
  const selectedBranch = branches.find((branch) => branch.id === branchFilter);
  const mutationTone =
    formError ? 'conflict' : formSuccess ? 'success' : workflow === 'recurring' ? 'warning' : undefined;
  const mutationMessage =
    formError ??
    formSuccess ??
    (workflow === 'recurring'
      ? 'Recurring visit creation starts here with a recurrence-aware form mode. The dedicated rule editor arrives later, but the current workflow already preserves a recurrence intent for schedulers.'
      : undefined);

  return (
    <SchedulingWorkspaceShell
      eyebrow="Epic 5 scheduling workspace"
      title="Schedule board and visit coordination"
      description="Epic 5 now uses the live scheduling APIs for board views, filter persistence, open-shift review, and visit create or edit flows from the same route-backed workspace."
    >
      <SchedulingWorkspaceGrid>
        <SchedulingPanel
          title="Scheduling overview and quick entry"
          description="FE5-16 keeps the operational summary at the top of the board so schedulers can move quickly into new visits, open-shift review, and recurring planning without leaving the workspace."
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
              <p>Current board filters stay in the URL so the board and quick actions remain aligned.</p>
            </article>
            <article className="scheduling-summary-card">
              <span className="eyebrow">Open shifts</span>
              <strong>{openShiftItems.length}</strong>
              <p>Unassigned or open-shift visits available for staffing review.</p>
            </article>
            <article className="scheduling-summary-card">
              <span className="eyebrow">Board alerts</span>
              <strong>{rescheduledItems.length}</strong>
              <p>Rescheduled items are surfaced distinctly so coordinators can verify follow-through before staffing.</p>
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
              Start recurring visit
            </button>
          </div>
        </SchedulingPanel>

        <SchedulingPanel
          title="Board controls"
          description="FE5-02 and FE5-03 use route-backed day, week, and month board controls so navigation and filter state survive refreshes and direct links."
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
                  setSearchParams(
                    new URLSearchParams({
                      view,
                      date,
                    }),
                    { replace: true },
                  );
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
          title="Board and core schedule modules"
          description="FE5-02 renders schedule items from the board API, while FE5-05 keeps visit creation and edits in the same workspace so schedulers do not lose context."
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
          description="FE5-11 keeps open shifts visible as a dedicated staffing queue so schedulers can inspect candidates, keep pool-specific filters, and move into assignment workflows deliberately."
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
                      {canAssignCaregivers ? 'Stage assignment' : 'Assignment restricted'}
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
            description="The detail drawer stays route-backed so links from the board, the open-shift pool, and later scheduling workflows all resolve to the same visit record."
            onClose={closeDrawer}
          >
            {selectedVisitLoading ? <p>Loading visit detail...</p> : null}
            {selectedVisitError ? <p className="alert">{selectedVisitError}</p> : null}
            {selectedVisit ? (
              <>
                <dl className="scheduling-detail-meta">
                  <div>
                    <dt>Patient</dt>
                    <dd>
                      {patients.find((patient) => patient.id === selectedVisit.patientId)
                        ? `${patients.find((patient) => patient.id === selectedVisit.patientId)?.firstName} ${
                            patients.find((patient) => patient.id === selectedVisit.patientId)?.lastName
                          }`
                        : selectedVisit.patientId}
                    </dd>
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
                    <dd>
                      {caregivers.find(
                        (caregiver) => caregiver.id === selectedVisit.activeCaregiverProfileId,
                      )?.displayName ?? 'Unassigned'}
                    </dd>
                  </div>
                  <div>
                    <dt>Creation mode</dt>
                    <dd>{selectedVisit.creationMode ?? 'MANUAL'}</dd>
                  </div>
                </dl>
                <div className="scheduling-drawer-actions">
                  <button
                    className="button"
                    disabled={!canManageVisits}
                    onClick={() => openWorkflow('edit-visit')}
                    type="button"
                  >
                    {canManageVisits ? 'Edit visit' : 'Visit edits restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canAssignCaregivers}
                    onClick={() => openWorkflow('assign')}
                    type="button"
                  >
                    {canAssignCaregivers ? 'Create assignment flow' : 'Assignment restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canRescheduleVisits}
                    onClick={() => openWorkflow('edit-visit')}
                    type="button"
                  >
                    {canRescheduleVisits ? 'Prepare reschedule edit' : 'Reschedule restricted'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canCancelVisits}
                    onClick={() => openWorkflow('idle')}
                    type="button"
                  >
                    {canCancelVisits ? 'Cancellation via workflow API later' : 'Cancellation restricted'}
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

        {workflow === 'new-visit' || workflow === 'edit-visit' || workflow === 'recurring' ? (
          <SchedulingMutationFrame
            title={
              workflow === 'edit-visit'
                ? 'Edit scheduled visit'
                : workflow === 'recurring'
                  ? 'Recurring visit quick-start'
                  : 'Create scheduled visit'
            }
            helper="FE5-05 keeps visit creation and edits inside the scheduling workspace so validation, conflict feedback, and date context are visible without leaving the board."
            mode={canManageVisits ? 'editable' : 'read-only'}
            tone={mutationTone}
            toneMessage={mutationMessage}
          >
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
              {visitForm.creationMode === 'RECURRING_TEMPLATE' ? (
                <div className="scheduling-inline-callout">
                  <strong>Recurring scheduling intent</strong>
                  <p>
                    This Phase B form keeps recurring intent visible so staff understand they are
                    starting a repeatable pattern, even before the full recurrence rule editor lands.
                  </p>
                </div>
              ) : null}
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

        {workflow === 'assign' ? (
          <SchedulingMutationFrame
            title="Assignment workflow staging"
            helper="The selected visit is now staged for caregiver assignment from the board or open-shift pool. Matching and assignment persistence continue in the next Epic 5 workflow slice."
            mode={canAssignCaregivers ? 'editable' : 'read-only'}
            tone={canViewConflicts ? 'warning' : undefined}
            toneMessage={
              canViewConflicts
                ? 'Conflict and matching previews are permission-aware. Use the selected visit detail to review assignment readiness before persisting staffing actions.'
                : undefined
            }
          >
            <SchedulingModuleState
              title={
                selectedVisit
                  ? `Visit ${selectedVisit.id} is ready for assignment review.`
                  : 'Choose a visit from the board or open-shift pool first.'
              }
              description={
                selectedVisit
                  ? 'This keeps the open-shift and detail flows coherent while assignment persistence stays in the audited scheduling workflow layer.'
                  : 'Open a visit card to continue into the assignment workflow.'
              }
              variant={selectedVisit ? 'readonly' : 'empty'}
            />
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
    value === 'recurring'
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

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function toOffsetDateTime(value: string): string {
  const date = new Date(value);
  return date.toISOString();
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
