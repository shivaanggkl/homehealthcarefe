import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  type CertificationPeriodRecord,
  type CertificationPeriodStatus,
  type ComplianceChecklistResult,
  type ComplianceChecklistResultStatus,
  type ComplianceDashboardAggregate,
  type ComplianceDashboardPatientSummary,
  type ComplianceReadinessStatus,
  type ConsentAcknowledgmentRecord,
  type PatientComplianceWorkspace,
  type PatientRiskReminder,
  createCertificationPeriod,
  createComplianceAcknowledgment,
  createPatientRiskReminder,
  fetchBranches,
  fetchComplianceChecklistResults,
  fetchComplianceDashboard,
  fetchComplianceDashboardPatients,
  fetchComplianceDocumentationResults,
  fetchPatientComplianceWorkspace,
  recalculateComplianceStatus,
  revokeComplianceAcknowledgment,
  updateCertificationPeriod,
  updateComplianceAcknowledgment,
  updatePatientRiskReminder,
  closeCertificationPeriod,
  resolvePatientRiskReminder,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ComplianceAuditCallout,
  ComplianceModuleState,
  ComplianceMutationNotice,
  CompliancePanel,
  ComplianceSectionNavigation,
  ComplianceStatusBanner,
  ComplianceWorkspaceCards,
  ComplianceWorkspaceGrid,
  ComplianceWorkspaceShell,
} from '../components/ComplianceWorkspaceFoundation';

type DashboardReadinessFilter = ComplianceReadinessStatus | 'ALL';
type DashboardCertificationFilter = CertificationPeriodStatus | 'ALL';
type RouteSection =
  | 'summary'
  | 'checklist'
  | 'documentation-gaps'
  | 'acknowledgments'
  | 'certification-periods'
  | 'risk-reminders';

type AcknowledgmentFormState = {
  acknowledgmentType: string;
  effectiveAt: string;
  expiresAt: string;
  captureMethod: string;
  supportingArtifactType: string;
  supportingArtifactId: string;
};

type CertificationFormState = {
  patientPayerLinkId: string;
  programContext: string;
  startDate: string;
  endDate: string;
  source: string;
  closed: boolean;
};

type ReminderFormState = {
  visitOccurrenceId: string;
  documentationRecordId: string;
  riskType: string;
  severityLabel: string;
  summary: string;
  effectiveAt: string;
  expiresAt: string;
  sourceContextType: string;
  sourceRecordId: string;
};

type MutationState = 'idle' | 'saving' | 'saved' | 'retry';

const EMPTY_ACKNOWLEDGMENT_FORM: AcknowledgmentFormState = {
  acknowledgmentType: '',
  effectiveAt: '',
  expiresAt: '',
  captureMethod: '',
  supportingArtifactType: '',
  supportingArtifactId: '',
};

const EMPTY_CERTIFICATION_FORM: CertificationFormState = {
  patientPayerLinkId: '',
  programContext: '',
  startDate: '',
  endDate: '',
  source: '',
  closed: false,
};

const EMPTY_REMINDER_FORM: ReminderFormState = {
  visitOccurrenceId: '',
  documentationRecordId: '',
  riskType: '',
  severityLabel: '',
  summary: '',
  effectiveAt: '',
  expiresAt: '',
  sourceContextType: '',
  sourceRecordId: '',
};

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
    return '';
  }
  return new Date(value).toISOString();
}

function statusTone(
  value: string | null | undefined,
): 'info' | 'success' | 'warning' | 'readonly' {
  if (!value) {
    return 'readonly';
  }
  if (
    value === 'READY' ||
    value === 'CURRENT' ||
    value === 'PASS' ||
    value === 'ACTIVE' ||
    value === 'RESOLVED'
  ) {
    return 'success';
  }
  if (
    value === 'WARNING' ||
    value === 'UPCOMING_EXPIRY' ||
    value === 'EXPIRED' ||
    value === 'FAIL' ||
    value === 'MISSING' ||
    value === 'NON_COMPLIANT'
  ) {
    return 'warning';
  }
  return 'info';
}

function resultPriority(status: ComplianceChecklistResultStatus) {
  switch (status) {
    case 'FAIL':
      return 0;
    case 'WARNING':
      return 1;
    case 'PASS':
      return 2;
    default:
      return 3;
  }
}

function complianceEvidenceLink(
  patientId: string,
  result: ComplianceChecklistResult,
  canViewDocumentation: boolean,
  canViewPatient: boolean,
) {
  if (canViewDocumentation && result.satisfiedByRecordId) {
    return {
      label: 'Open documentation evidence',
      to: `/app/documentation/records/${result.satisfiedByRecordId}/printable`,
    };
  }
  if (canViewDocumentation && result.evidenceSourceType?.includes('VISIT') && result.evidenceSourceId) {
    return {
      label: 'Open visit documentation',
      to: `/app/documentation/visits/${result.evidenceSourceId}`,
    };
  }
  if (canViewPatient) {
    return {
      label: 'Open patient workspace',
      to: `/app/patients/${patientId}`,
    };
  }
  return null;
}

function routeSection(pathname: string): RouteSection {
  if (pathname.includes('/checklist')) {
    return 'checklist';
  }
  if (pathname.includes('/documentation-gaps')) {
    return 'documentation-gaps';
  }
  if (pathname.includes('/acknowledgments')) {
    return 'acknowledgments';
  }
  if (pathname.includes('/certification-periods')) {
    return 'certification-periods';
  }
  if (pathname.includes('/risk-reminders')) {
    return 'risk-reminders';
  }
  return 'summary';
}

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

export function ComplianceWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const { patientId } = useParams();

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [dashboard, setDashboard] = useState<ComplianceDashboardAggregate[]>([]);
  const [patients, setPatients] = useState<ComplianceDashboardPatientSummary[]>([]);
  const [workspace, setWorkspace] = useState<PatientComplianceWorkspace | null>(null);
  const [checklistResults, setChecklistResults] = useState<ComplianceChecklistResult[]>([]);
  const [documentationResults, setDocumentationResults] = useState<ComplianceChecklistResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL');
  const [readinessFilter, setReadinessFilter] = useState<DashboardReadinessFilter>('ALL');
  const [certificationFilter, setCertificationFilter] =
    useState<DashboardCertificationFilter>('ALL');
  const [riskSeverityFilter, setRiskSeverityFilter] = useState('');

  const [acknowledgmentForm, setAcknowledgmentForm] =
    useState<AcknowledgmentFormState>(EMPTY_ACKNOWLEDGMENT_FORM);
  const [editingAcknowledgmentId, setEditingAcknowledgmentId] = useState<string | null>(null);

  const [certificationForm, setCertificationForm] =
    useState<CertificationFormState>(EMPTY_CERTIFICATION_FORM);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);

  const [reminderForm, setReminderForm] = useState<ReminderFormState>(EMPTY_REMINDER_FORM);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  const [requiredAcknowledgmentTypes, setRequiredAcknowledgmentTypes] = useState('RIGHT_TO_CARE');
  const [warningDays, setWarningDays] = useState('14');
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Compliance mutations will refresh the patient summary in place after backend success.',
  );

  const currentSection = routeSection(location.pathname);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canViewWorkspace = canAccessPermission(profile, 'view_compliance_workspace');
  const canViewDashboard = canAccessPermission(profile, 'view_compliance_dashboard');
  const canManageAcknowledgments = canAccessPermission(profile, 'manage_patient_acknowledgments');
  const canManageCertification = canAccessPermission(profile, 'manage_certification_periods');
  const canManageRisk = canAccessPermission(profile, 'manage_patient_risk_reminders');
  const canRecalculate = canAccessPermission(profile, 'recalculate_compliance_status');
  const canViewDocumentation = canAccessPermission(profile, 'view_documentation_workspace');
  const canViewPatient = canAccessPermission(profile, 'view_patient_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  const activeBranchId =
    workspace?.projection?.branchId ??
    workspace?.acknowledgments[0]?.branchId ??
    workspace?.certificationPeriods[0]?.branchId ??
    workspace?.reminders[0]?.branchId ??
    branchValue(branchFilter) ??
    null;

  const sortedChecklistResults = useMemo(
    () => [...checklistResults].sort((left, right) => resultPriority(left.resultStatus) - resultPriority(right.resultStatus)),
    [checklistResults],
  );
  const sortedDocumentationResults = useMemo(
    () =>
      [...documentationResults].sort(
        (left, right) => resultPriority(left.resultStatus) - resultPriority(right.resultStatus),
      ),
    [documentationResults],
  );

  async function loadDashboardData() {
    const [branchList, dashboardResponse, patientResponse] = await Promise.all([
      fetchBranches(authContext),
      fetchComplianceDashboard({
        ...authContext,
        branchId: branchValue(branchFilter),
        readinessStatus: readinessFilter,
      }),
      fetchComplianceDashboardPatients({
        ...authContext,
        branchId: branchValue(branchFilter),
        readinessStatus: readinessFilter,
        certificationPeriodStatus: certificationFilter,
        riskSeverity: riskSeverityFilter.trim() || undefined,
        page: 0,
        size: 20,
      }),
    ]);
    setBranches(branchList);
    setDashboard(dashboardResponse);
    setPatients(patientResponse.content);
  }

  async function loadPatientWorkspaceData(currentPatientId: string) {
    const [branchList, workspaceResponse, checklistResponse, documentationResponse] = await Promise.all([
      fetchBranches(authContext),
      fetchPatientComplianceWorkspace({
        ...authContext,
        patientId: currentPatientId,
        branchId: activeBranchId ?? undefined,
      }),
      fetchComplianceChecklistResults({
        ...authContext,
        patientId: currentPatientId,
        branchId: activeBranchId ?? undefined,
      }),
      fetchComplianceDocumentationResults({
        ...authContext,
        patientId: currentPatientId,
        branchId: activeBranchId ?? undefined,
      }),
    ]);
    setBranches(branchList);
    setWorkspace(workspaceResponse);
    setChecklistResults(checklistResponse);
    setDocumentationResults(documentationResponse);
    const defaultTypes = Array.from(
      new Set(workspaceResponse.acknowledgments.map((item) => item.acknowledgmentType).filter(Boolean)),
    );
    if (defaultTypes.length > 0) {
      setRequiredAcknowledgmentTypes(defaultTypes.join(', '));
    }
  }

  async function refreshCurrentView() {
    if (!patientId) {
      await loadDashboardData();
      return;
    }
    await loadPatientWorkspaceData(patientId);
  }

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        if (patientId) {
          await loadPatientWorkspaceData(patientId);
        } else {
          await loadDashboardData();
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load the compliance workspace right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [
    authContext,
    branchFilter,
    canViewWorkspace,
    certificationFilter,
    patientId,
    readinessFilter,
    riskSeverityFilter,
    state.status,
  ]);

  useEffect(() => {
    setMutationState('idle');
    setMutationMessage(
      'Compliance mutations will refresh the patient summary in place after backend success.',
    );
    setAcknowledgmentForm(EMPTY_ACKNOWLEDGMENT_FORM);
    setEditingAcknowledgmentId(null);
    setCertificationForm(EMPTY_CERTIFICATION_FORM);
    setEditingCertificationId(null);
    setReminderForm(EMPTY_REMINDER_FORM);
    setEditingReminderId(null);
  }, [patientId]);

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE11-01"
          title="Compliance workspace is not available for this role."
          message="Epic 11 compliance routes respect backend workspace permissions and branch-aware reviewer access."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Stories FE11-02 · FE11-03"
          title="Compliance visibility is restricted."
          message="This role cannot open the requested compliance route for the current branch or patient context."
          primaryLabel="Back to compliance"
          primaryLink="/app/compliance"
        />
      </div>
    );
  }

  const sectionLinks = patientId
    ? [
        { path: `/app/compliance/patients/${patientId}`, label: 'Summary', state: 'available' as const },
        { path: `/app/compliance/patients/${patientId}/checklist`, label: 'Checklist', state: 'available' as const },
        {
          path: `/app/compliance/patients/${patientId}/documentation-gaps`,
          label: 'Documentation gaps',
          state: 'available' as const,
        },
        {
          path: `/app/compliance/patients/${patientId}/acknowledgments`,
          label: 'Acknowledgments',
          state: canManageAcknowledgments ? 'available' as const : 'read-only' as const,
        },
        {
          path: `/app/compliance/patients/${patientId}/certification-periods`,
          label: 'Certification',
          state: canManageCertification ? 'available' as const : 'read-only' as const,
        },
        {
          path: `/app/compliance/patients/${patientId}/risk-reminders`,
          label: 'Risk reminders',
          state: canManageRisk ? 'available' as const : 'read-only' as const,
        },
      ]
    : [{ path: '/app/compliance', label: 'Dashboard', state: 'available' as const }];

  const pageTitle = patientId ? 'Patient compliance detail' : 'Compliance workspace';
  const pageDescription = patientId
    ? 'Epic 11 patient compliance routes group checklist, documentation gaps, acknowledgments, certification periods, and risk reminders under one shared workspace shell.'
    : 'Epic 11 routes expose a dedicated compliance dashboard with branch and patient readiness visibility backed by the real backend APIs.';

  async function handleAcknowledgmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Saving patient acknowledgment...');
    try {
      const request = {
        ...authContext,
        patientId,
        branchId: activeBranchId,
        acknowledgmentType: acknowledgmentForm.acknowledgmentType.trim(),
        effectiveAt: toIsoDateTime(acknowledgmentForm.effectiveAt),
        expiresAt: acknowledgmentForm.expiresAt ? toIsoDateTime(acknowledgmentForm.expiresAt) : null,
        captureMethod: acknowledgmentForm.captureMethod.trim() || null,
        supportingArtifactType: acknowledgmentForm.supportingArtifactType.trim() || null,
        supportingArtifactId: acknowledgmentForm.supportingArtifactId.trim() || null,
      };
      if (editingAcknowledgmentId) {
        await updateComplianceAcknowledgment({ ...request, acknowledgmentId: editingAcknowledgmentId });
      } else {
        await createComplianceAcknowledgment(request);
      }
      await refreshCurrentView();
      setAcknowledgmentForm(EMPTY_ACKNOWLEDGMENT_FORM);
      setEditingAcknowledgmentId(null);
      setMutationState('saved');
      setMutationMessage('Acknowledgment state refreshed from the backend compliance workspace.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Acknowledgment save failed. Review the values and try again.',
      );
    }
  }

  async function handleAcknowledgmentRevoke(acknowledgmentId: string) {
    if (!patientId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Revoking acknowledgment...');
    try {
      await revokeComplianceAcknowledgment({
        ...authContext,
        patientId,
        acknowledgmentId,
        revokedAt: new Date().toISOString(),
      });
      await refreshCurrentView();
      setMutationState('saved');
      setMutationMessage('Acknowledgment status refreshed after revocation.');
      if (editingAcknowledgmentId === acknowledgmentId) {
        setEditingAcknowledgmentId(null);
        setAcknowledgmentForm(EMPTY_ACKNOWLEDGMENT_FORM);
      }
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Acknowledgment revoke failed. Try again.',
      );
    }
  }

  async function handleCertificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Saving certification period...');
    try {
      const request = {
        ...authContext,
        patientId,
        certificationPeriodId: editingCertificationId ?? undefined,
        branchId: activeBranchId,
        patientPayerLinkId: certificationForm.patientPayerLinkId.trim() || null,
        programContext: certificationForm.programContext.trim() || null,
        startDate: certificationForm.startDate,
        endDate: certificationForm.endDate,
        closed: certificationForm.closed,
        source: certificationForm.source.trim() || null,
      };
      if (editingCertificationId) {
        await updateCertificationPeriod({
          ...request,
          certificationPeriodId: editingCertificationId,
        });
      } else {
        await createCertificationPeriod(request);
      }
      await refreshCurrentView();
      setCertificationForm(EMPTY_CERTIFICATION_FORM);
      setEditingCertificationId(null);
      setMutationState('saved');
      setMutationMessage('Certification visibility refreshed from the backend period record.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Certification save failed. Review the period dates and try again.',
      );
    }
  }

  async function handleCertificationClose() {
    if (!patientId || !editingCertificationId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Closing certification period...');
    try {
      await closeCertificationPeriod({
        ...authContext,
        patientId,
        certificationPeriodId: editingCertificationId,
        branchId: activeBranchId,
        patientPayerLinkId: certificationForm.patientPayerLinkId.trim() || null,
        programContext: certificationForm.programContext.trim() || null,
        startDate: certificationForm.startDate,
        endDate: certificationForm.endDate,
        source: certificationForm.source.trim() || null,
      });
      await refreshCurrentView();
      setCertificationForm(EMPTY_CERTIFICATION_FORM);
      setEditingCertificationId(null);
      setMutationState('saved');
      setMutationMessage('Certification period closed and the compliance summary was refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Certification close failed. Try again.',
      );
    }
  }

  async function handleReminderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Saving patient risk reminder...');
    try {
      const request = {
        ...authContext,
        patientId,
        branchId: activeBranchId,
        visitOccurrenceId: reminderForm.visitOccurrenceId.trim() || null,
        documentationRecordId: reminderForm.documentationRecordId.trim() || null,
        riskType: reminderForm.riskType.trim(),
        severityLabel: reminderForm.severityLabel.trim() || null,
        summary: reminderForm.summary.trim(),
        effectiveAt: toIsoDateTime(reminderForm.effectiveAt),
        expiresAt: reminderForm.expiresAt ? toIsoDateTime(reminderForm.expiresAt) : null,
        sourceContextType: reminderForm.sourceContextType.trim() || null,
        sourceRecordId: reminderForm.sourceRecordId.trim() || null,
      };
      if (editingReminderId) {
        await updatePatientRiskReminder({ ...request, reminderId: editingReminderId });
      } else {
        await createPatientRiskReminder(request);
      }
      await refreshCurrentView();
      setReminderForm(EMPTY_REMINDER_FORM);
      setEditingReminderId(null);
      setMutationState('saved');
      setMutationMessage('Risk reminder visibility refreshed from the backend patient summary.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Risk reminder save failed. Review the reminder values and try again.',
      );
    }
  }

  async function handleReminderResolve(reminderId: string) {
    if (!patientId) {
      return;
    }
    setMutationState('saving');
    setMutationMessage('Resolving patient risk reminder...');
    try {
      await resolvePatientRiskReminder({
        ...authContext,
        patientId,
        reminderId,
      });
      await refreshCurrentView();
      setMutationState('saved');
      setMutationMessage('Risk reminder state refreshed after resolution.');
      if (editingReminderId === reminderId) {
        setEditingReminderId(null);
        setReminderForm(EMPTY_REMINDER_FORM);
      }
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Risk reminder resolution failed. Try again.',
      );
    }
  }

  async function handleRecalculate() {
    if (!patientId) {
      return;
    }
    const parsedTypes = requiredAcknowledgmentTypes
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (parsedTypes.length === 0) {
      setMutationState('retry');
      setMutationMessage('Add at least one acknowledgment type before recalculating compliance.');
      return;
    }
    setMutationState('saving');
    setMutationMessage('Recalculating patient compliance status...');
    try {
      await recalculateComplianceStatus({
        ...authContext,
        patientId,
        branchId: activeBranchId,
        serviceLineId: workspace?.projection?.serviceLineId ?? null,
        requiredAcknowledgmentTypes: parsedTypes,
        certificationExpiryWarningDays: Number.parseInt(warningDays, 10) || 14,
        evaluatedAt: new Date().toISOString(),
      });
      await refreshCurrentView();
      setMutationState('saved');
      setMutationMessage('Compliance projection recalculated and the live patient summary was refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Compliance recalculation failed. Try again.',
      );
    }
  }

  function renderDashboard() {
    return (
      <>
        <CompliancePanel
          title="Dashboard filters"
          description="Branch, readiness, certification, and severity filters keep the Epic 11 dashboard focused without forcing reviewers into individual patient records."
        >
          <div className="compliance-filter-grid">
            <label className="field">
              <span>Branch</span>
              <select className="input" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Readiness</span>
              <select
                className="input"
                value={readinessFilter}
                onChange={(event) => setReadinessFilter(event.target.value as DashboardReadinessFilter)}
              >
                <option value="ALL">All readiness states</option>
                <option value="READY">Ready</option>
                <option value="WARNING">Warning</option>
                <option value="NON_COMPLIANT">Non-compliant</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </label>
            <label className="field">
              <span>Certification</span>
              <select
                className="input"
                value={certificationFilter}
                onChange={(event) =>
                  setCertificationFilter(event.target.value as DashboardCertificationFilter)
                }
              >
                <option value="ALL">All certification states</option>
                <option value="CURRENT">Current</option>
                <option value="UPCOMING_EXPIRY">Upcoming expiry</option>
                <option value="EXPIRED">Expired</option>
                <option value="MISSING">Missing</option>
              </select>
            </label>
            <label className="field">
              <span>Risk severity</span>
              <input
                className="input"
                placeholder="Filter by severity label"
                value={riskSeverityFilter}
                onChange={(event) => setRiskSeverityFilter(event.target.value)}
              />
            </label>
          </div>
        </CompliancePanel>

        <CompliancePanel
          title="Compliance status summary"
          description="Branch-level cards surface readiness mix, risk reminders, and acknowledgment gaps without forcing patient-by-patient review."
        >
          {loading ? <p className="session-note">Loading compliance dashboard...</p> : null}
          {error ? (
            <ComplianceModuleState title="Workspace load failed" description={error} variant="error" />
          ) : null}
          {!loading && !error && dashboard.length === 0 ? (
            <ComplianceModuleState
              title="No compliance dashboard rows"
              description="The selected filter combination did not return any branch-level compliance summaries."
              variant="empty"
            />
          ) : null}
          {!loading && !error ? (
            <div className="compliance-summary-grid">
              {dashboard.map((item) => (
                <div key={`${item.branchId ?? 'unscoped'}-${item.branchName}`} className="compliance-status-banner compliance-status-banner-info">
                  <strong>{item.branchName}</strong>
                  <p>
                    {item.totalPatients} patient(s) · {item.warningCount} warning · {item.nonCompliantCount} non-compliant
                  </p>
                  <p>
                    {item.activeRiskReminderCount} active risk reminder(s) · {item.acknowledgmentGapCount} acknowledgment gap(s)
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CompliancePanel>

        <CompliancePanel
          title="Patient compliance snapshots"
          description="Patient-level readiness rows combine compliance status, certification state, risks, and gap counts so reviewers can drill into the right patient route quickly."
        >
          {!loading && !error && patients.length === 0 ? (
            <ComplianceModuleState
              title="No patient compliance snapshots"
              description="The selected filter combination did not return any patient-level compliance summary rows."
              variant="empty"
            />
          ) : null}
          {patients.map((item) => (
            <Link key={item.patientId} className="compliance-list-row" to={`/app/compliance/patients/${item.patientId}`}>
              <div>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>
                  {item.branchName} · Evaluated {formatDateTime(item.evaluatedAt)}
                </p>
              </div>
              <div className="compliance-list-meta">
                <span>{humanizeToken(item.readinessStatus)}</span>
                <span>{humanizeToken(item.certificationPeriodStatus)}</span>
                <span>{item.gapCount} gap(s)</span>
                <span>{item.activeRiskReminderCount} active risk</span>
              </div>
            </Link>
          ))}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware dashboard operations"
          description="The dashboard stays coordinator-friendly while still giving authorized users a direct path into the controlled compliance audit trail."
        >
          <ComplianceAuditCallout
            title="Controlled compliance visibility"
            body={
              canViewAudit
                ? 'Dashboard-driven follow-up, recalculation review, and downstream patient drill-in decisions can be confirmed against the audit trail when needed.'
                : 'Dashboard follow-up stays minimal here. Detailed audit activity only appears for roles with explicit audit visibility.'
            }
            links={[
              { to: '/app/compliance/command-center', label: 'Open compliance command center' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
                      label: 'Open recalculation audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderPatientSummary() {
    return (
      <>
        <CompliancePanel
          title="Patient compliance summary"
          description="The patient workspace keeps the overall readiness picture, certification state, active risks, and gap counts visible before reviewers drill into a specific compliance section."
        >
          {loading ? <p className="session-note">Loading patient compliance detail...</p> : null}
          {error ? (
            <ComplianceModuleState title="Patient detail failed to load" description={error} variant="error" />
          ) : null}
          {!loading && !error && workspace?.projection ? (
            <div className="compliance-summary-grid">
              <ComplianceStatusBanner
                status={humanizeToken(workspace.projection.readinessStatus)}
                summary={`Evaluated ${formatDateTime(workspace.projection.evaluatedAt)}`}
                tone={statusTone(workspace.projection.readinessStatus)}
              />
              <ComplianceStatusBanner
                status={humanizeToken(workspace.projection.certificationPeriodStatus)}
                summary="Current certification-window projection from the backend patient compliance summary."
                tone={statusTone(workspace.projection.certificationPeriodStatus)}
              />
              <ComplianceStatusBanner
                status={`${workspace.projection.documentationUnsatisfiedCount} documentation gap(s)`}
                summary={`${workspace.projection.checklistWarningCount + workspace.projection.checklistFailCount} checklist warning or fail result(s)`}
                tone={
                  workspace.projection.documentationUnsatisfiedCount > 0 ||
                  workspace.projection.checklistFailCount > 0
                    ? 'warning'
                    : 'info'
                }
              />
              <ComplianceStatusBanner
                status={`${workspace.projection.activeRiskReminderCount} active risk`}
                summary={`${workspace.projection.missingAcknowledgmentCount + workspace.projection.expiredAcknowledgmentCount} acknowledgment gap(s)`}
                tone={
                  workspace.projection.activeRiskReminderCount > 0 ||
                  workspace.projection.missingAcknowledgmentCount > 0 ||
                  workspace.projection.expiredAcknowledgmentCount > 0
                    ? 'warning'
                    : 'success'
                }
              />
            </div>
          ) : null}
        </CompliancePanel>

        <CompliancePanel
          title="Section visibility"
          description="Checklist, documentation, acknowledgment, certification, and risk panels stay grouped under one patient compliance route model."
        >
          <ComplianceWorkspaceCards
            cards={[
              {
                path: `/app/compliance/patients/${patientId}/checklist`,
                label: 'Checklist findings',
                description: `${checklistResults.length} checklist result(s) currently visible.`,
                state: 'available',
              },
              {
                path: `/app/compliance/patients/${patientId}/documentation-gaps`,
                label: 'Documentation gaps',
                description: `${documentationResults.length} documentation result(s) currently visible.`,
                state: 'available',
              },
              {
                path: `/app/compliance/patients/${patientId}/acknowledgments`,
                label: 'Acknowledgments',
                description: `${workspace?.acknowledgments.length ?? 0} acknowledgment record(s) currently loaded.`,
                state: canManageAcknowledgments ? 'available' : 'read-only',
              },
              {
                path: `/app/compliance/patients/${patientId}/certification-periods`,
                label: 'Certification periods',
                description: `${workspace?.certificationPeriods.length ?? 0} certification period(s) currently loaded.`,
                state: canManageCertification ? 'available' : 'read-only',
              },
              {
                path: `/app/compliance/patients/${patientId}/risk-reminders`,
                label: 'Risk reminders',
                description: `${workspace?.reminders.length ?? 0} risk reminder(s) currently visible.`,
                state: canManageRisk ? 'available' : 'read-only',
              },
            ]}
          />
        </CompliancePanel>

        <CompliancePanel
          title="Live priority findings"
          description="The patient detail view groups checklist and documentation results by backend outcome so reviewers can see why the patient is warning or non-compliant."
        >
          {!loading && !error && sortedChecklistResults.length === 0 && sortedDocumentationResults.length === 0 ? (
            <ComplianceModuleState
              title="No compliance findings"
              description="No checklist or documentation results are currently available for this patient."
              variant="empty"
            />
          ) : null}
          {sortedChecklistResults.slice(0, 3).map((item) => (
            <div key={item.id} className="compliance-result-card">
              <header>
                <strong>{humanizeToken(item.resultCode)}</strong>
                <span>{humanizeToken(item.resultStatus)}</span>
              </header>
              <p>{item.evidenceSummary || item.missingReason || 'Checklist result available from the backend compliance engine.'}</p>
            </div>
          ))}
          {sortedDocumentationResults.slice(0, 3).map((item) => (
            <div key={item.id} className="compliance-result-card">
              <header>
                <strong>{humanizeToken(item.resultCode)}</strong>
                <span>{humanizeToken(item.resultStatus)}</span>
              </header>
              <p>{item.missingReason || item.evidenceSummary || 'Documentation requirement result available from the backend compliance engine.'}</p>
            </div>
          ))}
        </CompliancePanel>

        <CompliancePanel
          title="Recalculation and mutation state"
          description="Epic 11 recalculation refreshes the live patient compliance projection after acknowledgment, certification, or reminder changes."
        >
          <ComplianceMutationNotice state={mutationState} message={mutationMessage} />
          {canRecalculate ? (
            <div className="compliance-form-grid">
              <label className="field">
                <span>Required acknowledgment types</span>
                <input
                  className="input"
                  value={requiredAcknowledgmentTypes}
                  onChange={(event) => setRequiredAcknowledgmentTypes(event.target.value)}
                  placeholder="RIGHT_TO_CARE, CONSENT"
                />
              </label>
              <label className="field">
                <span>Expiry warning days</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={warningDays}
                  onChange={(event) => setWarningDays(event.target.value)}
                />
              </label>
              <div className="button-row compliance-action-row">
                <button className="button" type="button" onClick={handleRecalculate}>
                  Recalculate compliance
                </button>
              </div>
            </div>
          ) : (
            <ComplianceModuleState
              title="Recalculation is read only"
              description="This role can inspect compliance results but cannot trigger a recalculation workflow."
              variant="readonly"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware patient follow-up"
          description="Patient compliance edits should stay traceable without forcing a reviewer to leave the workspace blind."
        >
          <ComplianceAuditCallout
            title="Traceable compliance change path"
            body={
              canViewAudit
                ? 'Acknowledgment, certification, reminder, and recalculation changes can be cross-checked from the audit log without exposing unnecessary raw record detail in the patient summary.'
                : 'The patient summary keeps mutation feedback inline. Audit trail visibility remains restricted to authorized roles.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Return to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
                      label: 'Open compliance audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderChecklistSection() {
    return (
      <>
        <CompliancePanel
          title="Checklist findings"
          description="Checklist detail stays grouped by backend result status so reviewers can quickly separate passes from warnings and failures."
        >
          {sortedChecklistResults.length === 0 ? (
            <ComplianceModuleState
              title="No checklist findings"
              description="No checklist-specific compliance evaluations are currently available for this patient."
              variant="empty"
            />
          ) : null}
          {sortedChecklistResults.map((item) => (
            <div key={item.id} className="compliance-result-card">
              <header>
                <strong>{humanizeToken(item.resultCode)}</strong>
                <span>{humanizeToken(item.resultStatus)}</span>
              </header>
              <p>
                {item.evidenceSummary ||
                  (item.missingReason ? humanizeToken(item.missingReason) : null) ||
                  'Checklist evaluation loaded from the backend result set.'}
              </p>
              <small>
                Period {item.contextPeriodStart || 'not set'} to {item.contextPeriodEnd || 'not set'} · Evaluated {formatDateTime(item.evaluatedAt)}
              </small>
            </div>
          ))}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware checklist review"
          description="Checklist results are read-only here, but downstream correction or recalculation still needs a clear trace path."
        >
          <ComplianceAuditCallout
            title="Checklist follow-up remains auditable"
            body={
              canViewAudit
                ? 'Checklist-driven compliance investigation can be cross-checked against the compliance audit log when reviewers need to explain why readiness changed.'
                : 'Checklist visibility remains inline. Audit activity is only available to roles with audit access.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Return to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
                      label: 'Open checklist-related audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderDocumentationSection() {
    return (
      <>
        <CompliancePanel
          title="Documentation gaps and evidence"
          description="Documentation-gap visibility uses the Epic 11 backend results and routes into related documentation or patient context when a supporting record is available."
        >
          {sortedDocumentationResults.length === 0 ? (
            <ComplianceModuleState
              title="No documentation findings"
              description="No required-documentation results are currently available for this patient."
              variant="empty"
            />
          ) : null}
          {sortedDocumentationResults.map((item) => {
            const evidenceLink = patientId
              ? complianceEvidenceLink(patientId, item, canViewDocumentation, canViewPatient)
              : null;
            return (
              <div key={item.id} className="compliance-result-card">
                <header>
                  <strong>{humanizeToken(item.resultCode)}</strong>
                  <span>{humanizeToken(item.resultStatus)}</span>
                </header>
                <p>
                  {(item.missingReason ? humanizeToken(item.missingReason) : null) ||
                    item.evidenceSummary ||
                    'Documentation result loaded from the backend compliance engine.'}
                </p>
                <small>
                  Requirement {item.documentationRequirementId || 'not linked'} · Satisfied by{' '}
                  {item.satisfiedByRecordType
                    ? humanizeToken(item.satisfiedByRecordType)
                    : 'not available'}
                </small>
                {evidenceLink ? (
                  <Link className="text-link" to={evidenceLink.to}>
                    {evidenceLink.label}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware documentation follow-up"
          description="Documentation gaps often lead into other Epic workflows, so the follow-up path needs to stay explicit and reviewable."
        >
          <ComplianceAuditCallout
            title="Documentation evidence remains traceable"
            body={
              canViewAudit
                ? 'When readiness changes because documentation was added, corrected, or recalculated, reviewers can verify the compliance-side action trail from here.'
                : 'Documentation evidence links remain available where permitted. Audit follow-up is reserved for roles with audit visibility.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Return to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
                      label: 'Open documentation-related audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderAcknowledgmentsSection() {
    return (
      <>
        <CompliancePanel
          title="Acknowledgment status"
          description="Missing, current, expired, and revoked acknowledgment records stay visible here with a focused editor for create and update operations."
        >
          {workspace?.acknowledgments.length ? (
            workspace.acknowledgments.map((item) => (
              <div key={item.id} className="compliance-result-card">
                <header>
                  <strong>{humanizeToken(item.acknowledgmentType)}</strong>
                  <span>{humanizeToken(item.status)}</span>
                </header>
                <p>
                  Effective {formatDateTime(item.effectiveAt)} · Expires {formatDateTime(item.expiresAt)}
                </p>
                <small>
                  {item.captureMethod ? `Capture method ${humanizeToken(item.captureMethod)}` : 'No capture method recorded'}
                </small>
                <div className="button-row compliance-action-row">
                  {canManageAcknowledgments ? (
                    <>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setEditingAcknowledgmentId(item.id);
                          setAcknowledgmentForm({
                            acknowledgmentType: item.acknowledgmentType,
                            effectiveAt: toDateTimeInput(item.effectiveAt),
                            expiresAt: toDateTimeInput(item.expiresAt),
                            captureMethod: item.captureMethod ?? '',
                            supportingArtifactType: item.supportingArtifactType ?? '',
                            supportingArtifactId: item.supportingArtifactId ?? '',
                          });
                        }}
                      >
                        Edit acknowledgment
                      </button>
                      {item.status !== 'REVOKED' ? (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleAcknowledgmentRevoke(item.id)}
                        >
                          Revoke
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="session-note">Read only for this role.</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <ComplianceModuleState
              title="No acknowledgment records"
              description="Add the first patient acknowledgment record here when a consent or right-to-care artifact is available."
              variant="empty"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title={editingAcknowledgmentId ? 'Edit acknowledgment' : 'Add acknowledgment'}
          description="Acknowledgment edits use the real Epic 11 backend APIs and keep effective, expiration, and capture-method data together."
        >
          {canManageAcknowledgments ? (
            <form className="compliance-form-grid" onSubmit={handleAcknowledgmentSubmit}>
              <label className="field">
                <span>Type</span>
                <input
                  className="input"
                  required
                  value={acknowledgmentForm.acknowledgmentType}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({
                      ...current,
                      acknowledgmentType: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Effective at</span>
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={acknowledgmentForm.effectiveAt}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({ ...current, effectiveAt: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Expires at</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={acknowledgmentForm.expiresAt}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Capture method</span>
                <input
                  className="input"
                  value={acknowledgmentForm.captureMethod}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({ ...current, captureMethod: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Supporting artifact type</span>
                <input
                  className="input"
                  value={acknowledgmentForm.supportingArtifactType}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({
                      ...current,
                      supportingArtifactType: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Supporting artifact ID</span>
                <input
                  className="input"
                  value={acknowledgmentForm.supportingArtifactId}
                  onChange={(event) =>
                    setAcknowledgmentForm((current) => ({
                      ...current,
                      supportingArtifactId: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="button-row compliance-action-row">
                <button className="button" type="submit">
                  {editingAcknowledgmentId ? 'Save acknowledgment' : 'Create acknowledgment'}
                </button>
                {editingAcknowledgmentId ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setEditingAcknowledgmentId(null);
                      setAcknowledgmentForm(EMPTY_ACKNOWLEDGMENT_FORM);
                    }}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <ComplianceModuleState
              title="Acknowledgment editing is unavailable"
              description="This role can inspect patient acknowledgment records but cannot create or update them."
              variant="readonly"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware acknowledgment follow-up"
          description="Acknowledgment creation, edits, and revocation should remain explainable after the patient summary refreshes."
        >
          <ComplianceAuditCallout
            title="Acknowledgment changes are audit-sensitive"
            body={
              canViewAudit
                ? 'Create, update, and revoke actions can be confirmed from the compliance audit log when patient consent or right-to-care history is questioned.'
                : 'Acknowledgment actions refresh the patient summary inline. Audit detail remains restricted.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Back to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_CONSENT_ACKNOWLEDGMENT_RECORDED',
                      label: 'Open acknowledgment audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderCertificationSection() {
    const certificationStatus = workspace?.projection?.certificationPeriodStatus;
    return (
      <>
        <CompliancePanel
          title="Certification period visibility"
          description="Certification periods show current, missing, and expiring windows together so operations can fix date issues before they become compliance failures."
        >
          <ComplianceStatusBanner
            status={humanizeToken(certificationStatus)}
            summary="Current certification readiness from the backend compliance projection."
            tone={statusTone(certificationStatus)}
          />
          {workspace?.certificationPeriods.length ? (
            workspace.certificationPeriods.map((item) => (
              <div key={item.id} className="compliance-result-card">
                <header>
                  <strong>{item.programContext || 'Certification period'}</strong>
                  <span>{humanizeToken(item.recordState)}</span>
                </header>
                <p>
                  {formatDate(item.startDate)} to {formatDate(item.endDate)}
                </p>
                <small>{item.source ? `Source ${humanizeToken(item.source)}` : 'No source recorded'}</small>
                <div className="button-row compliance-action-row">
                  {canManageCertification ? (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        setEditingCertificationId(item.id);
                        setCertificationForm({
                          patientPayerLinkId: item.patientPayerLinkId ?? '',
                          programContext: item.programContext ?? '',
                          startDate: toDateInput(item.startDate),
                          endDate: toDateInput(item.endDate),
                          source: item.source ?? '',
                          closed: item.recordState === 'CLOSED',
                        });
                      }}
                    >
                      Edit period
                    </button>
                  ) : (
                    <span className="session-note">Read only for this role.</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <ComplianceModuleState
              title="No certification periods"
              description="Add the first certification window when patient program or payer context becomes available."
              variant="empty"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title={editingCertificationId ? 'Edit certification period' : 'Add certification period'}
          description="Certification edits use the live Epic 11 APIs and surface backend lifecycle and date-window errors directly."
        >
          {canManageCertification ? (
            <form className="compliance-form-grid" onSubmit={handleCertificationSubmit}>
              <label className="field">
                <span>Program or payer context</span>
                <input
                  className="input"
                  value={certificationForm.programContext}
                  onChange={(event) =>
                    setCertificationForm((current) => ({ ...current, programContext: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Patient payer link ID</span>
                <input
                  className="input"
                  value={certificationForm.patientPayerLinkId}
                  onChange={(event) =>
                    setCertificationForm((current) => ({
                      ...current,
                      patientPayerLinkId: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Start date</span>
                <input
                  className="input"
                  required
                  type="date"
                  value={certificationForm.startDate}
                  onChange={(event) =>
                    setCertificationForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  className="input"
                  required
                  type="date"
                  value={certificationForm.endDate}
                  onChange={(event) =>
                    setCertificationForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Source</span>
                <input
                  className="input"
                  value={certificationForm.source}
                  onChange={(event) =>
                    setCertificationForm((current) => ({ ...current, source: event.target.value }))
                  }
                />
              </label>
              <label className="checkbox">
                <input
                  checked={certificationForm.closed}
                  onChange={(event) =>
                    setCertificationForm((current) => ({ ...current, closed: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Closed period</span>
              </label>
              <div className="button-row compliance-action-row">
                <button className="button" type="submit">
                  {editingCertificationId ? 'Save period' : 'Create period'}
                </button>
                {editingCertificationId ? (
                  <>
                    <button className="button button-secondary" type="button" onClick={() => void handleCertificationClose()}>
                      Close current period
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        setEditingCertificationId(null);
                        setCertificationForm(EMPTY_CERTIFICATION_FORM);
                      }}
                    >
                      Cancel edit
                    </button>
                  </>
                ) : null}
              </div>
            </form>
          ) : (
            <ComplianceModuleState
              title="Certification editing is unavailable"
              description="This role can inspect certification periods but cannot create or update them."
              variant="readonly"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware certification follow-up"
          description="Certification changes affect compliance readiness and should stay traceable to the period workflow that caused them."
        >
          <ComplianceAuditCallout
            title="Certification updates are traceable"
            body={
              canViewAudit
                ? 'Create, edit, close, and recalculation follow-up can be reviewed from the audit log when certification readiness changes need a timestamped explanation.'
                : 'Certification changes remain visible through the refreshed period list and patient summary.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Back to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_CERTIFICATION_PERIOD_RECORDED',
                      label: 'Open certification audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderRiskSection() {
    return (
      <>
        <CompliancePanel
          title="Patient risk reminders"
          description="Risk reminders stay visible here and in the patient summary so high-risk signals are not lost in note detail."
        >
          {workspace?.reminders.length ? (
            workspace.reminders.map((item) => (
              <div key={item.id} className="compliance-result-card">
                <header>
                  <strong>{humanizeToken(item.riskType)}</strong>
                  <span>{humanizeToken(item.status)}</span>
                </header>
                <p>{item.summary}</p>
                <small>
                  {item.severityLabel ? `Severity ${item.severityLabel}` : 'Severity not recorded'} · Effective {formatDateTime(item.effectiveAt)}
                </small>
                <div className="button-row compliance-action-row">
                  {canManageRisk ? (
                    <>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setEditingReminderId(item.id);
                          setReminderForm({
                            visitOccurrenceId: item.visitOccurrenceId ?? '',
                            documentationRecordId: item.documentationRecordId ?? '',
                            riskType: item.riskType,
                            severityLabel: item.severityLabel ?? '',
                            summary: item.summary,
                            effectiveAt: toDateTimeInput(item.effectiveAt),
                            expiresAt: toDateTimeInput(item.expiresAt),
                            sourceContextType: item.sourceContextType ?? '',
                            sourceRecordId: item.sourceRecordId ?? '',
                          });
                        }}
                      >
                        Edit reminder
                      </button>
                      {item.status === 'ACTIVE' ? (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleReminderResolve(item.id)}
                        >
                          Resolve
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="session-note">Read only for this role.</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <ComplianceModuleState
              title="No risk reminders"
              description="Add the first structured risk reminder when clinical operations wants a visible follow-up cue."
              variant="empty"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title={editingReminderId ? 'Edit risk reminder' : 'Add risk reminder'}
          description="Reminder edits use the real backend APIs and keep summary, timing, and optional source references together."
        >
          {canManageRisk ? (
            <form className="compliance-form-grid" onSubmit={handleReminderSubmit}>
              <label className="field">
                <span>Risk type</span>
                <input
                  className="input"
                  required
                  value={reminderForm.riskType}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, riskType: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Severity</span>
                <input
                  className="input"
                  value={reminderForm.severityLabel}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, severityLabel: event.target.value }))
                  }
                />
              </label>
              <label className="field compliance-form-grid-full">
                <span>Summary</span>
                <textarea
                  className="input compliance-textarea"
                  required
                  value={reminderForm.summary}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Effective at</span>
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={reminderForm.effectiveAt}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, effectiveAt: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Expires at</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={reminderForm.expiresAt}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Visit occurrence ID</span>
                <input
                  className="input"
                  value={reminderForm.visitOccurrenceId}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, visitOccurrenceId: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Documentation record ID</span>
                <input
                  className="input"
                  value={reminderForm.documentationRecordId}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      documentationRecordId: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Source context type</span>
                <input
                  className="input"
                  value={reminderForm.sourceContextType}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      sourceContextType: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Source record ID</span>
                <input
                  className="input"
                  value={reminderForm.sourceRecordId}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, sourceRecordId: event.target.value }))
                  }
                />
              </label>
              <div className="button-row compliance-action-row">
                <button className="button" type="submit">
                  {editingReminderId ? 'Save reminder' : 'Create reminder'}
                </button>
                {editingReminderId ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setEditingReminderId(null);
                      setReminderForm(EMPTY_REMINDER_FORM);
                    }}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <ComplianceModuleState
              title="Risk-reminder editing is unavailable"
              description="This role can inspect reminders but cannot create or update them."
              variant="readonly"
            />
          )}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware reminder follow-up"
          description="Risk-reminder lifecycle changes need a direct trail for coordinators and reviewers when risk communication is escalated."
        >
          <ComplianceAuditCallout
            title="Risk reminder follow-up is reviewable"
            body={
              canViewAudit
                ? 'Reminder creates, edits, resolves, and recalculation follow-up can be verified from the compliance audit log when risk communication is questioned.'
                : 'Reminder lifecycle changes stay visible in the refreshed patient summary and reminder list.'
            }
            links={[
              { to: `/app/compliance/patients/${patientId}`, label: 'Back to patient summary' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_RISK_REMINDER_RECORDED',
                      label: 'Open reminder audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </>
    );
  }

  function renderPatientSection() {
    const mutationPanel = (
      <CompliancePanel
        title="Route state"
        description="The shared compliance mutation framework keeps save, resolve, revoke, and recalculation behavior understandable across the patient detail routes."
      >
        <ComplianceMutationNotice state={mutationState} message={mutationMessage} />
      </CompliancePanel>
    );

    switch (currentSection) {
      case 'checklist':
        return (
          <>
            {renderChecklistSection()}
            {mutationPanel}
          </>
        );
      case 'documentation-gaps':
        return (
          <>
            {renderDocumentationSection()}
            {mutationPanel}
          </>
        );
      case 'acknowledgments':
        return (
          <>
            {renderAcknowledgmentsSection()}
            {mutationPanel}
          </>
        );
      case 'certification-periods':
        return (
          <>
            {renderCertificationSection()}
            {mutationPanel}
          </>
        );
      case 'risk-reminders':
        return (
          <>
            {renderRiskSection()}
            {mutationPanel}
          </>
        );
      case 'summary':
      default:
        return renderPatientSummary();
    }
  }

  return (
    <ComplianceWorkspaceShell
      eyebrow="Frontend Stories FE11-01 · FE11-08 · FE11-09"
      title={pageTitle}
      description={pageDescription}
    >
      <ComplianceSectionNavigation links={sectionLinks} />
      <ComplianceWorkspaceGrid>{patientId ? renderPatientSection() : renderDashboard()}</ComplianceWorkspaceGrid>
    </ComplianceWorkspaceShell>
  );
}
