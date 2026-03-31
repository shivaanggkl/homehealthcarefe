import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  addPatientEventWoundHistory,
  type BranchSummary,
  completePatientEventFollowUp,
  createPatientEventInfection,
  type IncidentRecordStatus,
  type IncidentResponse,
  createPatientEventWound,
  type InfectionRecordStatus,
  type InfectionResponse,
  type PatientEventAlertResponse,
  type PatientEventEscalationResponse,
  type PatientEventEvidenceLinkResponse,
  type PatientEventFollowUpResponse,
  type PatientEventSummaryResponse,
  type PatientEventTargetType,
  type PatientEventTimelineEntry,
  type WoundHistoryResponse,
  type WoundRecordStatus,
  type WoundResponse,
  assignPatientEventFollowUp,
  clearPatientEventEscalation,
  createPatientEventEscalation,
  createPatientEventIncident,
  fetchBranches,
  fetchPatientEventAlerts,
  fetchPatientEventEscalations,
  fetchPatientEventEvidenceLinks,
  fetchPatientEventFollowUps,
  fetchPatientEventIncident,
  fetchPatientEventIncidents,
  fetchPatientEventInfection,
  fetchPatientEventInfections,
  fetchPatientEventSummary,
  fetchPatientEventTimeline,
  fetchPatientEventWound,
  fetchPatientEventWoundHistory,
  fetchPatientEventWounds,
  linkPatientEventEvidence,
  resolvePatientEventIncident,
  resolvePatientEventInfection,
  resolvePatientEventWound,
  unlinkPatientEventEvidence,
  updatePatientEventFollowUp,
  updatePatientEventIncident,
  updatePatientEventInfection,
  updatePatientEventWound,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  PatientEventAuditCallout,
  PatientEventContextLinks,
  PatientEventEscalationBadge,
  PatientEventModuleState,
  PatientEventMutationNotice,
  PatientEventPanel,
  PatientEventSectionNavigation,
  PatientEventStatusBanner,
  PatientEventWorkspaceGrid,
  PatientEventWorkspaceShell,
} from '../components/PatientEventWorkspaceFoundation';

type RouteSection =
  | 'overview'
  | 'incidents'
  | 'infections'
  | 'wounds'
  | 'follow-ups'
  | 'escalations'
  | 'timeline';

type MutationState = 'idle' | 'saving' | 'saved' | 'retry';

type IncidentDraft = {
  patientId: string;
  branchId: string;
  visitOccurrenceId: string;
  incidentType: string;
  severityLabel: string;
  occurredAt: string;
  reportedAt: string;
  summary: string;
  status: IncidentRecordStatus;
};

type InfectionDraft = {
  patientId: string;
  branchId: string;
  relatedIncidentId: string;
  onsetDate: string;
  identifiedAt: string;
  infectionType: string;
  summary: string;
  status: InfectionRecordStatus;
};

type WoundDraft = {
  patientId: string;
  branchId: string;
  identifiedAt: string;
  woundTypeOrSite: string;
  currentStatus: WoundRecordStatus;
  baselineSummary: string;
};

type WoundHistoryDraft = {
  capturedAt: string;
  observationSummary: string;
  lengthCm: string;
  widthCm: string;
  depthCm: string;
  progressionMarker: string;
};

type EvidenceDraft = {
  patientAttachmentId: string;
  mobileArtifactId: string;
  documentationAttachmentLinkId: string;
};

type FollowUpDraft = {
  id?: string;
  ownerMembershipId: string;
  dueAt: string;
  followUpNote: string;
};

type EscalationDraft = {
  severityLabel: string;
  reasonTag: string;
};

const EMPTY_INCIDENT_DRAFT: IncidentDraft = {
  patientId: '',
  branchId: '',
  visitOccurrenceId: '',
  incidentType: '',
  severityLabel: '',
  occurredAt: '',
  reportedAt: '',
  summary: '',
  status: 'OPEN',
};

const EMPTY_INFECTION_DRAFT: InfectionDraft = {
  patientId: '',
  branchId: '',
  relatedIncidentId: '',
  onsetDate: '',
  identifiedAt: '',
  infectionType: '',
  summary: '',
  status: 'ACTIVE',
};

const EMPTY_WOUND_DRAFT: WoundDraft = {
  patientId: '',
  branchId: '',
  identifiedAt: '',
  woundTypeOrSite: '',
  currentStatus: 'ACTIVE',
  baselineSummary: '',
};

const EMPTY_WOUND_HISTORY_DRAFT: WoundHistoryDraft = {
  capturedAt: '',
  observationSummary: '',
  lengthCm: '',
  widthCm: '',
  depthCm: '',
  progressionMarker: '',
};

const EMPTY_EVIDENCE_DRAFT: EvidenceDraft = {
  patientAttachmentId: '',
  mobileArtifactId: '',
  documentationAttachmentLinkId: '',
};

const EMPTY_FOLLOW_UP_DRAFT: FollowUpDraft = {
  ownerMembershipId: '',
  dueAt: '',
  followUpNote: '',
};

const EMPTY_ESCALATION_DRAFT: EscalationDraft = {
  severityLabel: 'HIGH',
  reasonTag: '',
};

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
  return value ? new Date(value).toISOString() : '';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleDateString();
}

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

function statusTone(value: string | null | undefined): 'info' | 'success' | 'warning' | 'readonly' {
  if (!value) {
    return 'readonly';
  }
  if (['RESOLVED', 'CLEARED', 'COMPLETED', 'STABLE', 'IMPROVING'].includes(value)) {
    return 'success';
  }
  if (['OPEN', 'ACTIVE', 'IN_REVIEW', 'MONITORING', 'DETERIORATING'].includes(value)) {
    return 'warning';
  }
  return 'info';
}

function routeSection(pathname: string): RouteSection {
  if (pathname.includes('/incidents')) {
    return 'incidents';
  }
  if (pathname.includes('/infections')) {
    return 'infections';
  }
  if (pathname.includes('/wounds')) {
    return 'wounds';
  }
  if (pathname.includes('/follow-ups')) {
    return 'follow-ups';
  }
  if (pathname.includes('/escalations')) {
    return 'escalations';
  }
  if (pathname.includes('/timeline')) {
    return 'timeline';
  }
  return 'overview';
}

function targetTypeForSection(section: RouteSection): PatientEventTargetType | null {
  switch (section) {
    case 'incidents':
      return 'INCIDENT_RECORD';
    case 'infections':
      return 'INFECTION_RECORD';
    case 'wounds':
      return 'WOUND_RECORD';
    default:
      return null;
  }
}

function eventRoute(targetType: PatientEventTargetType, targetId: string) {
  switch (targetType) {
    case 'INCIDENT_RECORD':
      return `/app/patient-events/incidents/${targetId}`;
    case 'INFECTION_RECORD':
      return `/app/patient-events/infections/${targetId}`;
    case 'WOUND_RECORD':
      return `/app/patient-events/wounds/${targetId}`;
    default:
      return '/app/patient-events';
  }
}

export function PatientEventWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const { incidentId, infectionId, woundId, patientId } = useParams();

  const currentSection = routeSection(location.pathname);
  const selectedTargetId = incidentId ?? infectionId ?? woundId ?? null;
  const selectedTargetType = targetTypeForSection(currentSection);

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [infections, setInfections] = useState<InfectionResponse[]>([]);
  const [wounds, setWounds] = useState<WoundResponse[]>([]);
  const [followUps, setFollowUps] = useState<PatientEventFollowUpResponse[]>([]);
  const [escalations, setEscalations] = useState<PatientEventEscalationResponse[]>([]);
  const [timeline, setTimeline] = useState<PatientEventTimelineEntry[]>([]);
  const [alerts, setAlerts] = useState<PatientEventAlertResponse[]>([]);
  const [summary, setSummary] = useState<PatientEventSummaryResponse | null>(null);
  const [evidenceLinks, setEvidenceLinks] = useState<PatientEventEvidenceLinkResponse[]>([]);
  const [woundHistory, setWoundHistory] = useState<WoundHistoryResponse[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);
  const [selectedInfection, setSelectedInfection] = useState<InfectionResponse | null>(null);
  const [selectedWound, setSelectedWound] = useState<WoundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [patientFilter, setPatientFilter] = useState('');
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Patient-event actions refresh list, detail, and timeline data after backend success.',
  );

  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft>(EMPTY_INCIDENT_DRAFT);
  const [incidentEditor, setIncidentEditor] = useState<IncidentDraft>(EMPTY_INCIDENT_DRAFT);
  const [infectionEditor, setInfectionEditor] = useState<InfectionDraft>(EMPTY_INFECTION_DRAFT);
  const [woundEditor, setWoundEditor] = useState<WoundDraft>(EMPTY_WOUND_DRAFT);
  const [infectionDraft, setInfectionDraft] = useState<InfectionDraft>(EMPTY_INFECTION_DRAFT);
  const [woundDraft, setWoundDraft] = useState<WoundDraft>(EMPTY_WOUND_DRAFT);
  const [woundHistoryDraft, setWoundHistoryDraft] = useState<WoundHistoryDraft>(EMPTY_WOUND_HISTORY_DRAFT);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>(EMPTY_EVIDENCE_DRAFT);
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft>(EMPTY_FOLLOW_UP_DRAFT);
  const [escalationDraft, setEscalationDraft] = useState<EscalationDraft>(EMPTY_ESCALATION_DRAFT);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canViewWorkspace = canAccessPermission(profile, 'view_patient_event_workspace');
  const canCreateIncident = canAccessPermission(profile, 'create_incident_records');
  const canManageInfection = canAccessPermission(profile, 'manage_infection_records');
  const canManageWound = canAccessPermission(profile, 'manage_wound_records');
  const canLinkEvidence = canAccessPermission(profile, 'link_patient_event_evidence');
  const canAssignFollowUp = canAccessPermission(profile, 'assign_patient_event_follow_up');
  const canEscalate = canAccessPermission(profile, 'escalate_patient_events');
  const canResolve = canAccessPermission(profile, 'resolve_patient_events');
  const canViewPatient = canAccessPermission(profile, 'view_patient_workspace');
  const canViewScheduling = canAccessPermission(profile, 'view_scheduling_workspace');
  const canViewDocumentation = canAccessPermission(profile, 'view_documentation_workspace');
  const canViewMessaging = canAccessPermission(profile, 'view_messaging_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  const selectedPatientId =
    patientId ??
    selectedIncident?.patientId ??
    selectedInfection?.patientId ??
    selectedWound?.patientId ??
    null;

  const activeEscalationByTarget = useMemo(() => {
    const map = new Map<string, PatientEventEscalationResponse[]>();
    escalations.forEach((escalation) => {
      const key = `${escalation.targetType}:${escalation.targetId}`;
      const current = map.get(key) ?? [];
      current.push(escalation);
      map.set(key, current);
    });
    return map;
  }, [escalations]);

  useEffect(() => {
    if (selectedIncident) {
      setIncidentEditor({
        patientId: selectedIncident.patientId,
        branchId: selectedIncident.branchId ?? '',
        visitOccurrenceId: selectedIncident.visitOccurrenceId ?? '',
        incidentType: selectedIncident.incidentType,
        severityLabel: selectedIncident.severityLabel ?? '',
        occurredAt: toDateTimeInput(selectedIncident.occurredAt),
        reportedAt: toDateTimeInput(selectedIncident.reportedAt),
        summary: selectedIncident.summary,
        status: selectedIncident.status,
      });
    }
  }, [selectedIncident]);

  useEffect(() => {
    if (selectedInfection) {
      setInfectionEditor({
        patientId: selectedInfection.patientId,
        branchId: selectedInfection.branchId ?? '',
        relatedIncidentId: selectedInfection.relatedIncidentId ?? '',
        onsetDate: selectedInfection.onsetDate ?? '',
        identifiedAt: toDateTimeInput(selectedInfection.identifiedAt),
        infectionType: selectedInfection.infectionType,
        summary: selectedInfection.summary,
        status: selectedInfection.status,
      });
    }
  }, [selectedInfection]);

  useEffect(() => {
    if (selectedWound) {
      setWoundEditor({
        patientId: selectedWound.patientId,
        branchId: selectedWound.branchId ?? '',
        identifiedAt: toDateTimeInput(selectedWound.identifiedAt),
        woundTypeOrSite: selectedWound.woundTypeOrSite,
        currentStatus: selectedWound.currentStatus,
        baselineSummary: selectedWound.baselineSummary ?? '',
      });
    }
  }, [selectedWound]);

  async function loadWorkspace() {
    if (!canViewWorkspace) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const effectiveBranchId = branchFilter !== 'ALL' ? branchFilter : undefined;
      const effectivePatientId = patientFilter.trim() || selectedPatientId || undefined;

      const [
        branchResponse,
        incidentResponse,
        infectionResponse,
        woundResponse,
        followUpResponse,
        escalationResponse,
        incidentDetail,
        infectionDetail,
        woundDetail,
      ] = await Promise.all([
        fetchBranches(authContext),
        fetchPatientEventIncidents({
          ...authContext,
          branchId: effectiveBranchId,
          patientId: effectivePatientId,
        }),
        fetchPatientEventInfections({
          ...authContext,
          branchId: effectiveBranchId,
          patientId: effectivePatientId,
        }),
        fetchPatientEventWounds({
          ...authContext,
          branchId: effectiveBranchId,
          patientId: effectivePatientId,
        }),
        fetchPatientEventFollowUps({
          ...authContext,
          patientId: effectivePatientId,
          targetId: selectedTargetId ?? undefined,
          targetType: selectedTargetType ?? undefined,
        }),
        fetchPatientEventEscalations({
          ...authContext,
          patientId: effectivePatientId,
          targetId: selectedTargetId ?? undefined,
          targetType: selectedTargetType ?? undefined,
        }),
        incidentId ? fetchPatientEventIncident(incidentId, authContext) : Promise.resolve(null),
        infectionId ? fetchPatientEventInfection(infectionId, authContext) : Promise.resolve(null),
        woundId ? fetchPatientEventWound(woundId, authContext) : Promise.resolve(null),
      ]);

      setBranches(branchResponse);
      setIncidents(incidentResponse);
      setInfections(infectionResponse);
      setWounds(woundResponse);
      setFollowUps(followUpResponse);
      setEscalations(escalationResponse);
      setSelectedIncident(incidentDetail);
      setSelectedInfection(infectionDetail);
      setSelectedWound(woundDetail);

      const effectiveSummaryPatientId =
        patientId ?? incidentDetail?.patientId ?? infectionDetail?.patientId ?? woundDetail?.patientId;

      const [timelineResponse, alertResponse, summaryResponse, evidenceResponse, woundHistoryResponse] =
        await Promise.all([
          effectiveSummaryPatientId
            ? fetchPatientEventTimeline({ ...authContext, patientId: effectiveSummaryPatientId })
            : Promise.resolve([]),
          effectiveSummaryPatientId
            ? fetchPatientEventAlerts({ ...authContext, patientId: effectiveSummaryPatientId })
            : Promise.resolve([]),
          effectiveSummaryPatientId
            ? fetchPatientEventSummary({ ...authContext, patientId: effectiveSummaryPatientId })
            : Promise.resolve(null),
          selectedTargetId && selectedTargetType
            ? fetchPatientEventEvidenceLinks({
                ...authContext,
                targetId: selectedTargetId,
                targetType: selectedTargetType,
              })
            : Promise.resolve([]),
          woundId ? fetchPatientEventWoundHistory({ ...authContext, woundId }) : Promise.resolve([]),
        ]);

      setTimeline(timelineResponse);
      setAlerts(alertResponse);
      setSummary(summaryResponse);
      setEvidenceLinks(evidenceResponse);
      setWoundHistory(woundHistoryResponse);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        setUnauthorized(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load patient-event workspace.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [branchFilter, patientFilter, incidentId, infectionId, woundId, patientId, canViewWorkspace]);

  async function runMutation(actionLabel: string, callback: () => Promise<void>) {
    setMutationState('saving');
    setMutationMessage(`${actionLabel} is being sent to the backend and will refresh the workspace on success.`);
    try {
      await callback();
      await loadWorkspace();
      setMutationState('saved');
      setMutationMessage(
        `${actionLabel} completed and the latest patient-event state is now in view. Authorized users can review matching audit activity for this controlled change.`,
      );
    } catch (mutationError) {
      setMutationState('retry');
      setMutationMessage(
        mutationError instanceof Error
          ? mutationError.message
          : `${actionLabel} failed. Retry after reviewing the request details.`,
      );
    }
  }

  function resetIncidentDraft() {
    setIncidentDraft({
      ...EMPTY_INCIDENT_DRAFT,
      branchId: branchFilter !== 'ALL' ? branchFilter : '',
      patientId: selectedPatientId ?? '',
    });
  }

  function resetInfectionDraft() {
    setInfectionDraft({
      ...EMPTY_INFECTION_DRAFT,
      branchId: branchFilter !== 'ALL' ? branchFilter : '',
      patientId: selectedPatientId ?? '',
    });
  }

  function resetWoundDraft() {
    setWoundDraft({
      ...EMPTY_WOUND_DRAFT,
      branchId: branchFilter !== 'ALL' ? branchFilter : '',
      patientId: selectedPatientId ?? '',
    });
  }

  async function handleCreateIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incidentDraft.patientId.trim() || !incidentDraft.incidentType.trim() || !incidentDraft.summary.trim()) {
      setMutationState('retry');
      setMutationMessage('Patient, incident type, and summary are required before creating an incident.');
      return;
    }

    await runMutation('Incident create', async () => {
      await createPatientEventIncident({
        ...authContext,
        patientId: incidentDraft.patientId.trim(),
        branchId: incidentDraft.branchId.trim() || undefined,
        visitOccurrenceId: incidentDraft.visitOccurrenceId.trim() || undefined,
        incidentType: incidentDraft.incidentType.trim(),
        severityLabel: incidentDraft.severityLabel.trim() || undefined,
        occurredAt: toIsoDateTime(incidentDraft.occurredAt),
        reportedAt: toIsoDateTime(incidentDraft.reportedAt || incidentDraft.occurredAt),
        summary: incidentDraft.summary.trim(),
      });
      resetIncidentDraft();
    });
  }

  async function handleUpdateIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incidentId) {
      return;
    }
    await runMutation('Incident update', async () => {
      await updatePatientEventIncident({
        ...authContext,
        incidentId,
        branchId: incidentEditor.branchId.trim() || undefined,
        visitOccurrenceId: incidentEditor.visitOccurrenceId.trim() || undefined,
        incidentType: incidentEditor.incidentType.trim(),
        severityLabel: incidentEditor.severityLabel.trim() || undefined,
        occurredAt: toIsoDateTime(incidentEditor.occurredAt),
        reportedAt: toIsoDateTime(incidentEditor.reportedAt),
        summary: incidentEditor.summary.trim(),
        status: incidentEditor.status,
      });
    });
  }

  async function handleUpdateInfection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!infectionId) {
      return;
    }
    await runMutation('Infection update', async () => {
      await updatePatientEventInfection({
        ...authContext,
        infectionId,
        branchId: infectionEditor.branchId.trim() || undefined,
        relatedIncidentId: infectionEditor.relatedIncidentId.trim() || undefined,
        onsetDate: infectionEditor.onsetDate || undefined,
        identifiedAt: toIsoDateTime(infectionEditor.identifiedAt),
        infectionType: infectionEditor.infectionType.trim(),
        summary: infectionEditor.summary.trim(),
        status: infectionEditor.status,
      });
    });
  }

  async function handleCreateInfection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !infectionDraft.patientId.trim() ||
      !infectionDraft.identifiedAt ||
      !infectionDraft.infectionType.trim() ||
      !infectionDraft.summary.trim()
    ) {
      setMutationState('retry');
      setMutationMessage('Patient, identified time, infection type, and summary are required before creating an infection record.');
      return;
    }

    await runMutation('Infection create', async () => {
      await createPatientEventInfection({
        ...authContext,
        patientId: infectionDraft.patientId.trim(),
        branchId: infectionDraft.branchId.trim() || undefined,
        relatedIncidentId: infectionDraft.relatedIncidentId.trim() || undefined,
        onsetDate: infectionDraft.onsetDate || undefined,
        identifiedAt: toIsoDateTime(infectionDraft.identifiedAt),
        infectionType: infectionDraft.infectionType.trim(),
        summary: infectionDraft.summary.trim(),
        status: infectionDraft.status,
      });
      resetInfectionDraft();
    });
  }

  async function handleUpdateWound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!woundId) {
      return;
    }
    await runMutation('Wound update', async () => {
      await updatePatientEventWound({
        ...authContext,
        woundId,
        branchId: woundEditor.branchId.trim() || undefined,
        woundTypeOrSite: woundEditor.woundTypeOrSite.trim(),
        currentStatus: woundEditor.currentStatus,
        baselineSummary: woundEditor.baselineSummary.trim() || undefined,
      });
    });
  }

  async function handleCreateWound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!woundDraft.patientId.trim() || !woundDraft.identifiedAt || !woundDraft.woundTypeOrSite.trim()) {
      setMutationState('retry');
      setMutationMessage('Patient, identified time, and wound type or site are required before creating a wound record.');
      return;
    }

    await runMutation('Wound create', async () => {
      await createPatientEventWound({
        ...authContext,
        patientId: woundDraft.patientId.trim(),
        branchId: woundDraft.branchId.trim() || undefined,
        identifiedAt: toIsoDateTime(woundDraft.identifiedAt),
        woundTypeOrSite: woundDraft.woundTypeOrSite.trim(),
        currentStatus: woundDraft.currentStatus,
        baselineSummary: woundDraft.baselineSummary.trim() || undefined,
      });
      resetWoundDraft();
    });
  }

  async function handleAddWoundHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!woundId || !woundHistoryDraft.capturedAt || !woundHistoryDraft.observationSummary.trim()) {
      setMutationState('retry');
      setMutationMessage('Captured time and observation summary are required before adding a wound history entry.');
      return;
    }

    const parseNumber = (value: string) => (value.trim() ? Number(value) : undefined);

    await runMutation('Wound history add', async () => {
      await addPatientEventWoundHistory({
        ...authContext,
        woundId,
        branchId: selectedWound?.branchId ?? undefined,
        capturedAt: toIsoDateTime(woundHistoryDraft.capturedAt),
        observationSummary: woundHistoryDraft.observationSummary.trim(),
        lengthCm: parseNumber(woundHistoryDraft.lengthCm),
        widthCm: parseNumber(woundHistoryDraft.widthCm),
        depthCm: parseNumber(woundHistoryDraft.depthCm),
        progressionMarker: woundHistoryDraft.progressionMarker.trim() || undefined,
      });
      setWoundHistoryDraft(EMPTY_WOUND_HISTORY_DRAFT);
    });
  }

  async function handleLinkEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTargetId || !selectedTargetType) {
      return;
    }
    if (
      !evidenceDraft.patientAttachmentId.trim() &&
      !evidenceDraft.mobileArtifactId.trim() &&
      !evidenceDraft.documentationAttachmentLinkId.trim()
    ) {
      setMutationState('retry');
      setMutationMessage('Provide at least one patient attachment, mobile artifact, or documentation attachment link id before linking evidence.');
      return;
    }

    await runMutation('Evidence link', async () => {
      await linkPatientEventEvidence({
        ...authContext,
        targetId: selectedTargetId,
        targetType: selectedTargetType,
        branchId:
          selectedIncident?.branchId ?? selectedInfection?.branchId ?? selectedWound?.branchId ?? undefined,
        patientAttachmentId: evidenceDraft.patientAttachmentId.trim() || undefined,
        mobileArtifactId: evidenceDraft.mobileArtifactId.trim() || undefined,
        documentationAttachmentLinkId: evidenceDraft.documentationAttachmentLinkId.trim() || undefined,
        linkedAt: new Date().toISOString(),
      });
      setEvidenceDraft(EMPTY_EVIDENCE_DRAFT);
    });
  }

  async function handleUnlinkEvidence(evidenceLinkId: string) {
    if (!window.confirm('Remove this evidence link from the patient-event record?')) {
      return;
    }
    await runMutation('Evidence unlink', async () => {
      await unlinkPatientEventEvidence(evidenceLinkId, authContext);
    });
  }

  async function handleResolveSelected() {
    if (!selectedTargetId) {
      return;
    }
    if (!window.confirm('Resolve this patient-event record? This is a controlled operation.')) {
      return;
    }
    await runMutation('Record resolve', async () => {
      const resolvedAt = new Date().toISOString();
      if (incidentId) {
        await resolvePatientEventIncident({ ...authContext, incidentId, resolvedAt });
      } else if (infectionId) {
        await resolvePatientEventInfection({ ...authContext, infectionId, resolvedAt });
      } else if (woundId) {
        await resolvePatientEventWound({ ...authContext, woundId, resolvedAt });
      }
    });
  }

  async function handleAssignFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTargetId || !selectedTargetType) {
      return;
    }
    if (!followUpDraft.dueAt) {
      setMutationState('retry');
      setMutationMessage('A due date is required before assigning patient-event follow-up.');
      return;
    }
    await runMutation('Follow-up assignment', async () => {
      await assignPatientEventFollowUp({
        ...authContext,
        targetId: selectedTargetId,
        targetType: selectedTargetType,
        branchId:
          selectedIncident?.branchId ?? selectedInfection?.branchId ?? selectedWound?.branchId ?? undefined,
        ownerMembershipId: followUpDraft.ownerMembershipId.trim() || undefined,
        assignedAt: new Date().toISOString(),
        dueAt: toIsoDateTime(followUpDraft.dueAt),
        followUpNote: followUpDraft.followUpNote.trim() || undefined,
      });
      setFollowUpDraft(EMPTY_FOLLOW_UP_DRAFT);
    });
  }

  async function handleUpdateFollowUp(
    event: FormEvent<HTMLFormElement>,
    followUpId: string,
    branchId: string | null,
  ) {
    event.preventDefault();
    if (!followUpDraft.dueAt) {
      setMutationState('retry');
      setMutationMessage('A due date is required before updating a follow-up item.');
      return;
    }
    await runMutation('Follow-up update', async () => {
      await updatePatientEventFollowUp({
        ...authContext,
        followUpId,
        branchId: branchId ?? undefined,
        ownerMembershipId: followUpDraft.ownerMembershipId.trim() || undefined,
        dueAt: toIsoDateTime(followUpDraft.dueAt),
        followUpNote: followUpDraft.followUpNote.trim() || undefined,
      });
      setFollowUpDraft(EMPTY_FOLLOW_UP_DRAFT);
    });
  }

  async function handleCompleteFollowUp(followUpId: string, followUpNote?: string | null) {
    if (!window.confirm('Complete this follow-up item and mark the accountable action as done?')) {
      return;
    }
    await runMutation('Follow-up completion', async () => {
      await completePatientEventFollowUp({
        ...authContext,
        followUpId,
        completionAt: new Date().toISOString(),
        followUpNote: followUpNote ?? undefined,
      });
      setFollowUpDraft(EMPTY_FOLLOW_UP_DRAFT);
    });
  }

  async function handleCreateEscalation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTargetId || !selectedTargetType) {
      return;
    }
    await runMutation('Escalation create', async () => {
      await createPatientEventEscalation({
        ...authContext,
        targetId: selectedTargetId,
        targetType: selectedTargetType,
        branchId:
          selectedIncident?.branchId ?? selectedInfection?.branchId ?? selectedWound?.branchId ?? undefined,
        severityLabel: escalationDraft.severityLabel.trim() || undefined,
        reasonTag: escalationDraft.reasonTag.trim() || undefined,
        escalatedAt: new Date().toISOString(),
      });
      setEscalationDraft(EMPTY_ESCALATION_DRAFT);
    });
  }

  async function handleClearEscalation(escalationId: string) {
    if (!window.confirm('Clear this escalation? This should only be done after risk review is complete.')) {
      return;
    }
    await runMutation('Escalation clear', async () => {
      await clearPatientEventEscalation({
        ...authContext,
        escalationId,
        clearedAt: new Date().toISOString(),
      });
    });
  }

  const navItems = [
    { to: '/app/patient-events', label: 'Overview', active: currentSection === 'overview' },
    { to: '/app/patient-events/incidents', label: 'Incidents', active: currentSection === 'incidents' },
    { to: '/app/patient-events/infections', label: 'Infections', active: currentSection === 'infections' },
    { to: '/app/patient-events/wounds', label: 'Wounds', active: currentSection === 'wounds' },
    { to: '/app/patient-events/follow-ups', label: 'Follow-up', active: currentSection === 'follow-ups' },
    { to: '/app/patient-events/escalations', label: 'Escalations', active: currentSection === 'escalations' },
    {
      to: selectedPatientId
        ? `/app/patient-events/patients/${selectedPatientId}/timeline`
        : '/app/patient-events',
      label: 'Timeline',
      active: currentSection === 'timeline',
    },
  ];

  const contextLinks = {
    patientHref: selectedPatientId && canViewPatient ? `/app/patients/${selectedPatientId}` : undefined,
    visitHref:
      selectedIncident?.visitOccurrenceId && canViewScheduling
        ? `/app/scheduling/visits/${selectedIncident.visitOccurrenceId}`
        : undefined,
    documentationHref:
      evidenceLinks.some((item) => item.documentationAttachmentLinkId) && canViewDocumentation
        ? '/app/documentation'
        : undefined,
    messagingHref:
      selectedPatientId && canViewMessaging ? `/app/patients/${selectedPatientId}/discussion` : undefined,
  };

  const timelinePatientId = patientId ?? (patientFilter.trim() || selectedPatientId);

  if (!canViewWorkspace) {
    return (
      <AccessDeniedPanel
        message="Only roles with Epic 12 patient-event workspace access can open incident, infection, wound, follow-up, and timeline routes."
        title="Patient-event workspace is not available for this role."
      />
    );
  }

  if (loading) {
    return (
      <PatientEventWorkspaceShell
        description="Restoring incident, infection, wound, follow-up, escalation, and timeline state from the backend."
        eyebrow="Epic 12"
        title="Patient Event Workspace"
      >
        <PatientEventModuleState
          title="Loading patient-event workspace"
          description="Waiting on incident, infection, wound, and timeline APIs."
          variant="loading"
        />
      </PatientEventWorkspaceShell>
    );
  }

  if (unauthorized) {
    return (
      <AccessDeniedPanel
        message="This patient-event route is outside your authorized branch or role scope."
        title="Patient-event route is not available in the current scope."
      />
    );
  }

  if (error) {
    return (
      <PatientEventWorkspaceShell
        description="The patient-event workspace could not complete its initial backend load."
        eyebrow="Epic 12"
        title="Patient Event Workspace"
      >
        <PatientEventModuleState title="Workspace load failed" description={error} variant="error" />
      </PatientEventWorkspaceShell>
    );
  }

  return (
    <PatientEventWorkspaceShell
      description="Shared Epic 12 workspace for incidents, infections, wounds, follow-up accountability, escalations, and longitudinal patient-event visibility."
      eyebrow="Epic 12"
      title="Patient Event Workspace"
    >
      <PatientEventSectionNavigation items={navItems} />
      <PatientEventMutationNotice message={mutationMessage} state={mutationState} />
      <PatientEventStatusBanner title="Privacy-aware operational view" tone="readonly">
        Lists keep patient and evidence detail minimal while still linking authorized users back into
        patient, visit, documentation, and messaging context where needed.
      </PatientEventStatusBanner>
      <div className="patient-event-toolbar">
        <label>
          Branch
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="ALL">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Patient
          <input
            onChange={(event) => setPatientFilter(event.target.value)}
            placeholder="Filter by patient id"
            value={patientFilter}
          />
        </label>
      </div>
      <PatientEventWorkspaceGrid>
        <PatientEventPanel
          title={
            currentSection === 'overview'
              ? 'Workspace overview'
              : currentSection === 'timeline'
                ? 'Patient timeline'
                : humanizeToken(currentSection)
          }
          description="Route-aware patient-event list, detail, and longitudinal visibility."
        >
          {currentSection === 'overview' ? (
            <div className="patient-event-card-grid">
              <Link className="patient-event-summary-card" to="/app/patient-events/incidents">
                <strong>{incidents.length}</strong>
                <span>Incidents</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/infections">
                <strong>{infections.length}</strong>
                <span>Infections</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/wounds">
                <strong>{wounds.length}</strong>
                <span>Wounds</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/follow-ups">
                <strong>{followUps.length}</strong>
                <span>Open follow-up items</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/escalations">
                <strong>{escalations.length}</strong>
                <span>Escalations</span>
              </Link>
              {selectedPatientId ? (
                <Link
                  className="patient-event-summary-card"
                  to={`/app/patient-events/patients/${selectedPatientId}/timeline`}
                >
                  <strong>{timeline.length}</strong>
                  <span>Timeline entries</span>
                </Link>
              ) : null}
            </div>
          ) : null}

          {currentSection === 'incidents' ? (
            <div className="patient-event-list">
              {incidents.length ? (
                incidents.map((incident) => (
                  <Link
                    className="patient-event-list-item"
                    key={incident.id}
                    to={`/app/patient-events/incidents/${incident.id}`}
                  >
                    <div>
                      <strong>{incident.incidentType}</strong>
                      <p>{incident.summary}</p>
                    </div>
                    <div className="patient-event-list-meta">
                      <span>{formatDateTime(incident.reportedAt)}</span>
                      <PatientEventEscalationBadge
                        label={humanizeToken(incident.status)}
                        tone={statusTone(incident.status) === 'warning' ? 'warning' : 'default'}
                      />
                      {activeEscalationByTarget.get(`INCIDENT_RECORD:${incident.id}`)?.some(
                        (item) => item.status === 'ACTIVE',
                      ) ? <PatientEventEscalationBadge label="Escalated" tone="danger" /> : null}
                    </div>
                  </Link>
                ))
              ) : (
                <PatientEventModuleState
                  title="No incidents yet"
                  description="This route will fill as incident APIs return records for the selected branch or patient."
                  variant="empty"
                />
              )}
            </div>
          ) : null}

          {currentSection === 'infections' ? (
            <div className="patient-event-list">
              {infections.length ? (
                infections.map((infection) => (
                  <Link
                    className="patient-event-list-item"
                    key={infection.id}
                    to={`/app/patient-events/infections/${infection.id}`}
                  >
                    <div>
                      <strong>{infection.infectionType}</strong>
                      <p>{infection.summary}</p>
                    </div>
                    <div className="patient-event-list-meta">
                      <span>{formatDateTime(infection.identifiedAt)}</span>
                      <PatientEventEscalationBadge label={humanizeToken(infection.status)} />
                      {activeEscalationByTarget.get(`INFECTION_RECORD:${infection.id}`)?.some(
                        (item) => item.status === 'ACTIVE',
                      ) ? <PatientEventEscalationBadge label="Escalated" tone="danger" /> : null}
                    </div>
                  </Link>
                ))
              ) : (
                <PatientEventModuleState
                  title="No infections yet"
                  description="This route will fill as infection APIs return records for the selected branch or patient."
                  variant="empty"
                />
              )}
            </div>
          ) : null}

          {currentSection === 'wounds' ? (
            <div className="patient-event-list">
              {wounds.length ? (
                wounds.map((wound) => (
                  <Link
                    className="patient-event-list-item"
                    key={wound.id}
                    to={`/app/patient-events/wounds/${wound.id}`}
                  >
                    <div>
                      <strong>{wound.woundTypeOrSite}</strong>
                      <p>{wound.baselineSummary || 'No baseline summary recorded.'}</p>
                    </div>
                    <div className="patient-event-list-meta">
                      <span>{formatDateTime(wound.identifiedAt)}</span>
                      <PatientEventEscalationBadge label={humanizeToken(wound.currentStatus)} />
                      {activeEscalationByTarget.get(`WOUND_RECORD:${wound.id}`)?.some(
                        (item) => item.status === 'ACTIVE',
                      ) ? <PatientEventEscalationBadge label="Escalated" tone="danger" /> : null}
                    </div>
                  </Link>
                ))
              ) : (
                <PatientEventModuleState
                  title="No wounds yet"
                  description="This route will fill as wound APIs return records for the selected branch or patient."
                  variant="empty"
                />
              )}
            </div>
          ) : null}

          {currentSection === 'follow-ups' ? (
            <div className="patient-event-list">
              {followUps.length ? (
                followUps.map((followUp) => (
                  <div className="patient-event-list-item" key={followUp.id}>
                    <div>
                      <strong>{humanizeToken(followUp.targetType)}</strong>
                      <p>{followUp.followUpNote || 'No follow-up note recorded.'}</p>
                      <p>
                        Owner {followUp.ownerMembershipId || humanizeToken(followUp.ownerRole)} | Status{' '}
                        {humanizeToken(followUp.status)}
                      </p>
                    </div>
                    <div className="patient-event-list-meta">
                      <span>Due {formatDateTime(followUp.dueAt)}</span>
                      <PatientEventEscalationBadge label={humanizeToken(followUp.status)} />
                      <Link className="patient-event-inline-link" to={eventRoute(followUp.targetType, followUp.targetId)}>
                        Open record
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <PatientEventModuleState
                  title="No follow-up items"
                  description="Follow-up assignments will appear here when patient-event records need accountable next steps."
                  variant="empty"
                />
              )}
            </div>
          ) : null}

          {currentSection === 'escalations' ? (
            <div className="patient-event-list">
              {escalations.length ? (
                escalations.map((escalation) => (
                  <div className="patient-event-list-item" key={escalation.id}>
                    <div>
                      <strong>{humanizeToken(escalation.targetType)}</strong>
                      <p>{escalation.reasonTag || 'Escalation reason not supplied.'}</p>
                      <p>{escalation.severityLabel || 'Severity not supplied'}</p>
                    </div>
                    <div className="patient-event-list-meta">
                      <span>{formatDateTime(escalation.escalatedAt)}</span>
                      <PatientEventEscalationBadge label={humanizeToken(escalation.status)} tone="danger" />
                      <Link className="patient-event-inline-link" to={eventRoute(escalation.targetType, escalation.targetId)}>
                        Open record
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <PatientEventModuleState
                  title="No escalations"
                  description="Escalations will appear here when a patient-event record requires higher-severity routing."
                  variant="empty"
                />
              )}
            </div>
          ) : null}

          {currentSection === 'timeline' ? (
            <div className="patient-event-timeline">
              {timeline.length ? (
                timeline.map((entry) => (
                  <div className="patient-event-timeline-entry" key={`${entry.targetId}-${entry.occurredAt}`}>
                    <strong>{humanizeToken(entry.historyEntryType)}</strong>
                    <p>{entry.summary}</p>
                    <div className="patient-event-list-meta">
                      <span>{humanizeToken(entry.targetType)}</span>
                      {entry.status ? <PatientEventEscalationBadge label={humanizeToken(entry.status)} /> : null}
                      {entry.severity ? <PatientEventEscalationBadge label={humanizeToken(entry.severity)} tone="warning" /> : null}
                      <Link className="patient-event-inline-link" to={eventRoute(entry.targetType, entry.targetId)}>
                        Open record
                      </Link>
                    </div>
                    <span>{formatDateTime(entry.occurredAt)}</span>
                  </div>
                ))
              ) : (
                <PatientEventModuleState
                  title="No timeline history"
                  description="Pick a patient-linked route or filter by patient id to load incident, infection, wound, follow-up, and escalation milestones."
                  variant="empty"
                />
              )}
            </div>
          ) : null}
        </PatientEventPanel>

        <div className="patient-event-sidebar">
          {currentSection === 'incidents' && canCreateIncident ? (
            <PatientEventPanel
              title="Create incident"
              description="Shared create pattern for controlled Epic 12 incident logging."
            >
              <form className="patient-event-form" onSubmit={handleCreateIncident}>
                <label>
                  Patient id
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, patientId: event.target.value }))
                    }
                    value={incidentDraft.patientId}
                  />
                </label>
                <label>
                  Branch id
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, branchId: event.target.value }))
                    }
                    value={incidentDraft.branchId}
                  />
                </label>
                <label>
                  Visit id
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, visitOccurrenceId: event.target.value }))
                    }
                    value={incidentDraft.visitOccurrenceId}
                  />
                </label>
                <label>
                  Incident type
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, incidentType: event.target.value }))
                    }
                    value={incidentDraft.incidentType}
                  />
                </label>
                <label>
                  Severity
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, severityLabel: event.target.value }))
                    }
                    value={incidentDraft.severityLabel}
                  />
                </label>
                <label>
                  Occurred at
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, occurredAt: event.target.value }))
                    }
                    type="datetime-local"
                    value={incidentDraft.occurredAt}
                  />
                </label>
                <label>
                  Reported at
                  <input
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, reportedAt: event.target.value }))
                    }
                    type="datetime-local"
                    value={incidentDraft.reportedAt}
                  />
                </label>
                <label>
                  Summary
                  <textarea
                    onChange={(event) =>
                      setIncidentDraft((current) => ({ ...current, summary: event.target.value }))
                    }
                    value={incidentDraft.summary}
                  />
                </label>
                <button type="submit">Create incident</button>
              </form>
            </PatientEventPanel>
          ) : null}

          {currentSection === 'infections' && canManageInfection ? (
            <PatientEventPanel
              title="Create infection"
              description="Clinical infection-log creation backed by the Epic 12 API."
            >
              <form className="patient-event-form" onSubmit={handleCreateInfection}>
                <label>
                  Patient id
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({ ...current, patientId: event.target.value }))
                    }
                    value={infectionDraft.patientId}
                  />
                </label>
                <label>
                  Branch id
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({ ...current, branchId: event.target.value }))
                    }
                    value={infectionDraft.branchId}
                  />
                </label>
                <label>
                  Related incident id
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({
                        ...current,
                        relatedIncidentId: event.target.value,
                      }))
                    }
                    value={infectionDraft.relatedIncidentId}
                  />
                </label>
                <label>
                  Onset date
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({ ...current, onsetDate: event.target.value }))
                    }
                    type="date"
                    value={infectionDraft.onsetDate}
                  />
                </label>
                <label>
                  Identified at
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({
                        ...current,
                        identifiedAt: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={infectionDraft.identifiedAt}
                  />
                </label>
                <label>
                  Infection type
                  <input
                    onChange={(event) =>
                      setInfectionDraft((current) => ({
                        ...current,
                        infectionType: event.target.value,
                      }))
                    }
                    value={infectionDraft.infectionType}
                  />
                </label>
                <label>
                  Summary
                  <textarea
                    onChange={(event) =>
                      setInfectionDraft((current) => ({ ...current, summary: event.target.value }))
                    }
                    value={infectionDraft.summary}
                  />
                </label>
                <button type="submit">Create infection</button>
              </form>
            </PatientEventPanel>
          ) : null}

          {currentSection === 'wounds' && canManageWound ? (
            <PatientEventPanel
              title="Create wound"
              description="Create a new wound record before longitudinal history entries begin."
            >
              <form className="patient-event-form" onSubmit={handleCreateWound}>
                <label>
                  Patient id
                  <input
                    onChange={(event) =>
                      setWoundDraft((current) => ({ ...current, patientId: event.target.value }))
                    }
                    value={woundDraft.patientId}
                  />
                </label>
                <label>
                  Branch id
                  <input
                    onChange={(event) =>
                      setWoundDraft((current) => ({ ...current, branchId: event.target.value }))
                    }
                    value={woundDraft.branchId}
                  />
                </label>
                <label>
                  Identified at
                  <input
                    onChange={(event) =>
                      setWoundDraft((current) => ({ ...current, identifiedAt: event.target.value }))
                    }
                    type="datetime-local"
                    value={woundDraft.identifiedAt}
                  />
                </label>
                <label>
                  Wound type or site
                  <input
                    onChange={(event) =>
                      setWoundDraft((current) => ({
                        ...current,
                        woundTypeOrSite: event.target.value,
                      }))
                    }
                    value={woundDraft.woundTypeOrSite}
                  />
                </label>
                <label>
                  Status
                  <select
                    onChange={(event) =>
                      setWoundDraft((current) => ({
                        ...current,
                        currentStatus: event.target.value as WoundRecordStatus,
                      }))
                    }
                    value={woundDraft.currentStatus}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="IMPROVING">Improving</option>
                    <option value="STABLE">Stable</option>
                    <option value="DETERIORATING">Deteriorating</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </label>
                <label>
                  Baseline summary
                  <textarea
                    onChange={(event) =>
                      setWoundDraft((current) => ({
                        ...current,
                        baselineSummary: event.target.value,
                      }))
                    }
                    value={woundDraft.baselineSummary}
                  />
                </label>
                <button type="submit">Create wound</button>
              </form>
            </PatientEventPanel>
          ) : null}

          {(selectedIncident || selectedInfection || selectedWound) ? (
            <PatientEventPanel title="Event detail" description="Route-backed detail with shared evidence, follow-up, escalation, and context panels.">
              {selectedIncident ? (
                <form className="patient-event-form" onSubmit={handleUpdateIncident}>
                  <label>
                    Status
                    <select
                      onChange={(event) =>
                        setIncidentEditor((current) => ({
                          ...current,
                          status: event.target.value as IncidentRecordStatus,
                        }))
                      }
                      value={incidentEditor.status}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_REVIEW">In review</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </label>
                  <label>
                    Type
                    <input
                      onChange={(event) =>
                        setIncidentEditor((current) => ({ ...current, incidentType: event.target.value }))
                      }
                      value={incidentEditor.incidentType}
                    />
                  </label>
                  <label>
                    Summary
                    <textarea
                      onChange={(event) =>
                        setIncidentEditor((current) => ({ ...current, summary: event.target.value }))
                      }
                      value={incidentEditor.summary}
                    />
                  </label>
                  <button type="submit">Save incident changes</button>
                </form>
              ) : null}
              {selectedInfection ? (
                <form className="patient-event-form" onSubmit={handleUpdateInfection}>
                  <label>
                    Status
                    <select
                      onChange={(event) =>
                        setInfectionEditor((current) => ({
                          ...current,
                          status: event.target.value as InfectionRecordStatus,
                        }))
                      }
                      value={infectionEditor.status}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MONITORING">Monitoring</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </label>
                  <label>
                    Onset date
                    <input
                      onChange={(event) =>
                        setInfectionEditor((current) => ({ ...current, onsetDate: event.target.value }))
                      }
                      type="date"
                      value={infectionEditor.onsetDate}
                    />
                  </label>
                  <label>
                    Identified at
                    <input
                      onChange={(event) =>
                        setInfectionEditor((current) => ({
                          ...current,
                          identifiedAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={infectionEditor.identifiedAt}
                    />
                  </label>
                  <label>
                    Infection type
                    <input
                      onChange={(event) =>
                        setInfectionEditor((current) => ({
                          ...current,
                          infectionType: event.target.value,
                        }))
                      }
                      value={infectionEditor.infectionType}
                    />
                  </label>
                  <label>
                    Summary
                    <textarea
                      onChange={(event) =>
                        setInfectionEditor((current) => ({ ...current, summary: event.target.value }))
                      }
                      value={infectionEditor.summary}
                    />
                  </label>
                  {canManageInfection ? <button type="submit">Save infection changes</button> : null}
                </form>
              ) : null}
              {selectedWound ? (
                <form className="patient-event-form" onSubmit={handleUpdateWound}>
                  <label>
                    Identified at
                    <input disabled type="datetime-local" value={woundEditor.identifiedAt} />
                  </label>
                  <label>
                    Current status
                    <select
                      onChange={(event) =>
                        setWoundEditor((current) => ({
                          ...current,
                          currentStatus: event.target.value as WoundRecordStatus,
                        }))
                      }
                      value={woundEditor.currentStatus}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MONITORING">Monitoring</option>
                      <option value="IMPROVING">Improving</option>
                      <option value="STABLE">Stable</option>
                      <option value="DETERIORATING">Deteriorating</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </label>
                  <label>
                    Wound type or site
                    <input
                      onChange={(event) =>
                        setWoundEditor((current) => ({
                          ...current,
                          woundTypeOrSite: event.target.value,
                        }))
                      }
                      value={woundEditor.woundTypeOrSite}
                    />
                  </label>
                  <label>
                    Baseline summary
                    <textarea
                      onChange={(event) =>
                        setWoundEditor((current) => ({ ...current, baselineSummary: event.target.value }))
                      }
                      value={woundEditor.baselineSummary}
                    />
                  </label>
                  {canManageWound ? <button type="submit">Save wound changes</button> : null}
                </form>
              ) : null}
              <PatientEventContextLinks {...contextLinks} />
              {canResolve ? (
                <button
                  className="patient-event-danger-button"
                  onClick={() => void handleResolveSelected()}
                  type="button"
                >
                  Resolve selected record
                </button>
              ) : null}
            </PatientEventPanel>
          ) : null}

          {(selectedTargetId && selectedTargetType) ? (
            <PatientEventPanel title="Evidence" description="Shared evidence panel that keeps backend metadata out of routine operational views.">
              {evidenceLinks.length ? (
                <div className="patient-event-list">
                  {evidenceLinks.map((link) => (
                    <div className="patient-event-list-item" key={link.id}>
                      <div>
                        <strong>{humanizeToken(link.sourceType)}</strong>
                        <p>Linked {formatDateTime(link.linkedAt)}</p>
                      </div>
                      {canLinkEvidence ? (
                        <div className="patient-event-list-meta">
                          <button onClick={() => void handleUnlinkEvidence(link.id)} type="button">
                            Unlink
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <PatientEventModuleState
                  title="No linked evidence"
                  description="Evidence links will appear here when Epic 12 record support is attached."
                  variant="empty"
                />
              )}
              {canLinkEvidence ? (
                <form className="patient-event-form" onSubmit={handleLinkEvidence}>
                  <label>
                    Patient attachment id
                    <input
                      onChange={(event) =>
                        setEvidenceDraft((current) => ({
                          ...current,
                          patientAttachmentId: event.target.value,
                        }))
                      }
                      value={evidenceDraft.patientAttachmentId}
                    />
                  </label>
                  <label>
                    Mobile artifact id
                    <input
                      onChange={(event) =>
                        setEvidenceDraft((current) => ({
                          ...current,
                          mobileArtifactId: event.target.value,
                        }))
                      }
                      value={evidenceDraft.mobileArtifactId}
                    />
                  </label>
                  <label>
                    Documentation attachment link id
                    <input
                      onChange={(event) =>
                        setEvidenceDraft((current) => ({
                          ...current,
                          documentationAttachmentLinkId: event.target.value,
                        }))
                      }
                      value={evidenceDraft.documentationAttachmentLinkId}
                    />
                  </label>
                  <button type="submit">Link evidence</button>
                </form>
              ) : null}
            </PatientEventPanel>
          ) : null}

          {selectedWound ? (
            <PatientEventPanel title="Wound history" description="Chronological wound progression entries from the backend history contract.">
              {woundHistory.length ? (
                <div className="patient-event-timeline">
                  {woundHistory.map((entry) => (
                    <div className="patient-event-timeline-entry" key={entry.id}>
                      <strong>{entry.progressionMarker || 'Observation captured'}</strong>
                      <p>{entry.observationSummary}</p>
                      <span>{formatDateTime(entry.capturedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <PatientEventModuleState
                  title="No wound history entries"
                  description="Append-only wound history will appear here when clinical updates are recorded."
                  variant="empty"
                />
              )}
              {canManageWound ? (
                <form className="patient-event-form" onSubmit={handleAddWoundHistory}>
                  <label>
                    Captured at
                    <input
                      onChange={(event) =>
                        setWoundHistoryDraft((current) => ({
                          ...current,
                          capturedAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={woundHistoryDraft.capturedAt}
                    />
                  </label>
                  <label>
                    Observation summary
                    <textarea
                      onChange={(event) =>
                        setWoundHistoryDraft((current) => ({
                          ...current,
                          observationSummary: event.target.value,
                        }))
                      }
                      value={woundHistoryDraft.observationSummary}
                    />
                  </label>
                  <div className="patient-event-form-inline">
                    <label>
                      Length (cm)
                      <input
                        onChange={(event) =>
                          setWoundHistoryDraft((current) => ({
                            ...current,
                            lengthCm: event.target.value,
                          }))
                        }
                        value={woundHistoryDraft.lengthCm}
                      />
                    </label>
                    <label>
                      Width (cm)
                      <input
                        onChange={(event) =>
                          setWoundHistoryDraft((current) => ({
                            ...current,
                            widthCm: event.target.value,
                          }))
                        }
                        value={woundHistoryDraft.widthCm}
                      />
                    </label>
                    <label>
                      Depth (cm)
                      <input
                        onChange={(event) =>
                          setWoundHistoryDraft((current) => ({
                            ...current,
                            depthCm: event.target.value,
                          }))
                        }
                        value={woundHistoryDraft.depthCm}
                      />
                    </label>
                  </div>
                  <label>
                    Progression marker
                    <input
                      onChange={(event) =>
                        setWoundHistoryDraft((current) => ({
                          ...current,
                          progressionMarker: event.target.value,
                        }))
                      }
                      value={woundHistoryDraft.progressionMarker}
                    />
                  </label>
                  <button type="submit">Add wound history entry</button>
                </form>
              ) : null}
            </PatientEventPanel>
          ) : null}

          {(selectedTargetId && selectedTargetType) ? (
            <PatientEventPanel title="Follow-up" description="Shared accountable follow-up panel with due-date handling and explicit mutation states.">
              {followUps.length ? (
                <div className="patient-event-list">
                  {followUps.map((followUp) => (
                    <div className="patient-event-list-item" key={followUp.id}>
                      <div>
                        <strong>{humanizeToken(followUp.status)}</strong>
                        <p>{followUp.followUpNote || 'No follow-up note recorded.'}</p>
                        <p>Owner {followUp.ownerMembershipId || humanizeToken(followUp.ownerRole)}</p>
                      </div>
                      <div className="patient-event-list-meta">
                        <span>Due {formatDateTime(followUp.dueAt)}</span>
                        {followUp.status === 'OPEN' && new Date(followUp.dueAt).getTime() < Date.now() ? (
                          <PatientEventEscalationBadge label="Overdue" tone="warning" />
                        ) : null}
                        {canAssignFollowUp ? (
                          <button
                            onClick={() =>
                              setFollowUpDraft({
                                id: followUp.id,
                                ownerMembershipId: followUp.ownerMembershipId ?? '',
                                dueAt: toDateTimeInput(followUp.dueAt),
                                followUpNote: followUp.followUpNote ?? '',
                              })
                            }
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canAssignFollowUp && followUp.status !== 'COMPLETED' ? (
                          <button onClick={() => void handleCompleteFollowUp(followUp.id, followUp.followUpNote)} type="button">
                            Complete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PatientEventModuleState
                  title="No follow-up assigned"
                  description="Use the shared follow-up form below to assign accountable next steps."
                  variant="empty"
                />
              )}
              {canAssignFollowUp ? (
                <form
                  className="patient-event-form"
                  onSubmit={(event) =>
                    followUpDraft.id
                      ? void handleUpdateFollowUp(
                          event,
                          followUpDraft.id,
                          selectedIncident?.branchId ?? selectedInfection?.branchId ?? selectedWound?.branchId ?? null,
                        )
                      : void handleAssignFollowUp(event)
                  }
                >
                  <label>
                    Owner membership id
                    <input
                      onChange={(event) =>
                        setFollowUpDraft((current) => ({ ...current, ownerMembershipId: event.target.value }))
                      }
                      value={followUpDraft.ownerMembershipId}
                    />
                  </label>
                  <label>
                    Due at
                    <input
                      onChange={(event) =>
                        setFollowUpDraft((current) => ({ ...current, dueAt: event.target.value }))
                      }
                      type="datetime-local"
                      value={followUpDraft.dueAt}
                    />
                  </label>
                  <label>
                    Note
                    <textarea
                      onChange={(event) =>
                        setFollowUpDraft((current) => ({ ...current, followUpNote: event.target.value }))
                      }
                      value={followUpDraft.followUpNote}
                    />
                  </label>
                  <div className="patient-event-form-inline">
                    <button type="submit">{followUpDraft.id ? 'Update follow-up' : 'Assign follow-up'}</button>
                    {followUpDraft.id ? (
                      <button onClick={() => setFollowUpDraft(EMPTY_FOLLOW_UP_DRAFT)} type="button">
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </PatientEventPanel>
          ) : null}

          {(selectedTargetId && selectedTargetType) ? (
            <PatientEventPanel title="Escalation" description="Shared escalation panel with active-state visibility and confirmed clear actions.">
              {escalations.length ? (
                <div className="patient-event-list">
                  {escalations.map((escalation) => (
                    <div className="patient-event-list-item" key={escalation.id}>
                      <div>
                        <strong>{escalation.severityLabel || 'Escalated'}</strong>
                        <p>{escalation.reasonTag || 'No escalation reason provided.'}</p>
                      </div>
                      <div className="patient-event-list-meta">
                        <PatientEventEscalationBadge
                          label={humanizeToken(escalation.status)}
                          tone={escalation.status === 'ACTIVE' ? 'danger' : 'success'}
                        />
                        {canEscalate && escalation.status === 'ACTIVE' ? (
                          <button onClick={() => void handleClearEscalation(escalation.id)} type="button">
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PatientEventModuleState
                  title="No active escalations"
                  description="Escalations will appear here when a patient-event record is routed for higher-severity review."
                  variant="empty"
                />
              )}
              {canEscalate ? (
                <form className="patient-event-form" onSubmit={handleCreateEscalation}>
                  <label>
                    Severity
                    <input
                      onChange={(event) =>
                        setEscalationDraft((current) => ({ ...current, severityLabel: event.target.value }))
                      }
                      value={escalationDraft.severityLabel}
                    />
                  </label>
                  <label>
                    Reason tag
                    <input
                      onChange={(event) =>
                        setEscalationDraft((current) => ({ ...current, reasonTag: event.target.value }))
                      }
                      value={escalationDraft.reasonTag}
                    />
                  </label>
                  <button type="submit">Create escalation</button>
                </form>
              ) : null}
            </PatientEventPanel>
          ) : null}

          {summary ? (
            <PatientEventPanel title="Patient summary" description="Backend summary and alert projection for the selected patient context.">
              <div className="patient-event-card-grid">
                <div className="patient-event-summary-card">
                  <strong>{summary.openIncidentCount}</strong>
                  <span>Open incidents</span>
                </div>
                <div className="patient-event-summary-card">
                  <strong>{summary.activeInfectionCount}</strong>
                  <span>Active infections</span>
                </div>
                <div className="patient-event-summary-card">
                  <strong>{summary.activeWoundCount}</strong>
                  <span>Active wounds</span>
                </div>
                <div className="patient-event-summary-card">
                  <strong>{summary.openFollowUpCount}</strong>
                  <span>Open follow-up</span>
                </div>
                <div className="patient-event-summary-card">
                  <strong>{summary.activeEscalationCount}</strong>
                  <span>Active escalations</span>
                </div>
              </div>
              {alerts.length ? (
                <div className="patient-event-list">
                  {alerts.map((alert) => (
                    <div className="patient-event-list-item" key={`${alert.alertType}-${alert.targetId}`}>
                      <div>
                        <strong>{humanizeToken(alert.alertType)}</strong>
                        <p>{alert.summary}</p>
                        <p>{alert.targetType ? humanizeToken(alert.targetType) : 'Patient-level alert'}</p>
                      </div>
                      <div className="patient-event-list-meta">
                        <PatientEventEscalationBadge label={humanizeToken(alert.severity)} tone="warning" />
                        {alert.targetId && alert.targetType ? (
                          <Link className="patient-event-inline-link" to={eventRoute(alert.targetType, alert.targetId)}>
                            Open record
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PatientEventModuleState
                  title="No active alerts"
                  description={
                    timelinePatientId
                      ? 'The patient summary is loaded and there are currently no active patient-event alerts.'
                      : 'Select or filter to a patient to load alert projection from the backend.'
                  }
                  variant="readonly"
                />
              )}
            </PatientEventPanel>
          ) : null}

          <PatientEventAuditCallout
            body="Incident, infection, wound, follow-up, and escalation actions are controlled operations. Authorized users can review later audit activity without exposing unnecessary backend metadata in the day-to-day workspace."
            href={canViewAudit ? '/app/admin/audit' : undefined}
            title="Audit-aware patient-event handling"
          />
        </div>
      </PatientEventWorkspaceGrid>
    </PatientEventWorkspaceShell>
  );
}
