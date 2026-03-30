import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientEventWorkspacePage } from './PatientEventWorkspacePage';

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
    fetchPatientEventIncidents: vi.fn(),
    createPatientEventIncident: vi.fn(),
    fetchPatientEventIncident: vi.fn(),
    updatePatientEventIncident: vi.fn(),
    resolvePatientEventIncident: vi.fn(),
    fetchPatientEventInfections: vi.fn(),
    createPatientEventInfection: vi.fn(),
    fetchPatientEventInfection: vi.fn(),
    updatePatientEventInfection: vi.fn(),
    resolvePatientEventInfection: vi.fn(),
    fetchPatientEventWounds: vi.fn(),
    createPatientEventWound: vi.fn(),
    fetchPatientEventWound: vi.fn(),
    updatePatientEventWound: vi.fn(),
    resolvePatientEventWound: vi.fn(),
    fetchPatientEventWoundHistory: vi.fn(),
    addPatientEventWoundHistory: vi.fn(),
    fetchPatientEventEvidenceLinks: vi.fn(),
    linkPatientEventEvidence: vi.fn(),
    unlinkPatientEventEvidence: vi.fn(),
    fetchPatientEventFollowUps: vi.fn(),
    assignPatientEventFollowUp: vi.fn(),
    updatePatientEventFollowUp: vi.fn(),
    completePatientEventFollowUp: vi.fn(),
    fetchPatientEventEscalations: vi.fn(),
    createPatientEventEscalation: vi.fn(),
    clearPatientEventEscalation: vi.fn(),
    fetchPatientEventTimeline: vi.fn(),
    fetchPatientEventAlerts: vi.fn(),
    fetchPatientEventSummary: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('PatientEventWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));

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
        role: 'QA_CLINICAL_REVIEWER',
        roleLabel: 'QA Clinical Reviewer',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_patient_event_workspace',
          'create_incident_records',
          'manage_infection_records',
          'manage_wound_records',
          'link_patient_event_evidence',
          'assign_patient_event_follow_up',
          'escalate_patient_events',
          'resolve_patient_events',
          'view_patient_workspace',
          'view_documentation_workspace',
          'view_messaging_workspace',
          'view_audit_log',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      { id: 'branch-1', code: 'NORTH', name: 'North Branch', status: 'ACTIVE' },
    ]);
    vi.mocked(sessionApi.fetchPatientEventIncidents).mockResolvedValue([
      {
        id: 'incident-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        visitOccurrenceId: 'visit-1',
        incidentType: 'FALL',
        severityLabel: 'HIGH',
        occurredAt: '2026-08-01T10:00:00Z',
        reportedAt: '2026-08-01T10:30:00Z',
        summary: 'Patient fall in living room.',
        status: 'OPEN',
        reportedByMembershipId: 'membership-1',
        resolvedAt: null,
      },
    ]);
    vi.mocked(sessionApi.fetchPatientEventInfections).mockResolvedValue([]);
    vi.mocked(sessionApi.createPatientEventInfection).mockResolvedValue({
      id: 'infection-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      relatedIncidentId: 'incident-1',
      onsetDate: '2026-08-01',
      identifiedAt: '2026-08-02T09:00:00Z',
      infectionType: 'UTI',
      summary: 'Urinary tract infection.',
      status: 'ACTIVE',
      resolvedAt: null,
    });
    vi.mocked(sessionApi.fetchPatientEventWounds).mockResolvedValue([]);
    vi.mocked(sessionApi.createPatientEventWound).mockResolvedValue({
      id: 'wound-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      identifiedAt: '2026-08-02T09:00:00Z',
      woundTypeOrSite: 'Left heel',
      currentStatus: 'ACTIVE',
      baselineSummary: 'Pressure injury observed.',
      active: true,
      resolvedAt: null,
    });
    vi.mocked(sessionApi.fetchPatientEventFollowUps).mockResolvedValue([]);
    vi.mocked(sessionApi.fetchPatientEventEscalations).mockResolvedValue([]);
    vi.mocked(sessionApi.fetchPatientEventEvidenceLinks).mockResolvedValue([]);
    vi.mocked(sessionApi.linkPatientEventEvidence).mockResolvedValue({
      id: 'evidence-2',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      sourceType: 'PATIENT_ATTACHMENT',
      patientAttachmentId: 'attachment-1',
      mobileArtifactId: null,
      documentationAttachmentLinkId: null,
      linkedByMembershipId: 'membership-1',
      linkedAt: '2026-08-02T10:00:00Z',
    });
    vi.mocked(sessionApi.unlinkPatientEventEvidence).mockResolvedValue();
    vi.mocked(sessionApi.fetchPatientEventTimeline).mockResolvedValue([]);
    vi.mocked(sessionApi.fetchPatientEventAlerts).mockResolvedValue([]);
    vi.mocked(sessionApi.fetchPatientEventSummary).mockResolvedValue({
      patientId: 'patient-1',
      branchId: 'branch-1',
      openIncidentCount: 1,
      activeInfectionCount: 0,
      activeWoundCount: 0,
      openFollowUpCount: 0,
      activeEscalationCount: 0,
      alerts: [],
    });
    vi.mocked(sessionApi.fetchPatientEventWoundHistory).mockResolvedValue([]);
    vi.mocked(sessionApi.addPatientEventWoundHistory).mockResolvedValue({
      id: 'history-1',
      woundRecordId: 'wound-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      capturedAt: '2026-08-03T09:00:00Z',
      observationSummary: 'Reduced drainage.',
      lengthCm: 2.1,
      widthCm: 1.5,
      depthCm: 0.3,
      progressionMarker: 'IMPROVING',
      capturedByMembershipId: 'membership-1',
    });
    vi.mocked(sessionApi.createPatientEventIncident).mockResolvedValue({
      id: 'incident-2',
      patientId: 'patient-1',
      branchId: 'branch-1',
      visitOccurrenceId: null,
      incidentType: 'MEDICATION',
      severityLabel: null,
      occurredAt: '2026-08-02T09:00:00Z',
      reportedAt: '2026-08-02T09:10:00Z',
      summary: 'Medication variance.',
      status: 'OPEN',
      reportedByMembershipId: null,
      resolvedAt: null,
    });
    vi.mocked(sessionApi.assignPatientEventFollowUp).mockResolvedValue({
      id: 'follow-up-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      ownerMembershipId: 'membership-2',
      ownerRole: null,
      assignedAt: '2026-08-01T11:00:00Z',
      dueAt: '2026-08-02T11:00:00Z',
      completionAt: null,
      followUpNote: 'Review safety plan.',
      status: 'OPEN',
    });
    vi.mocked(sessionApi.updatePatientEventFollowUp).mockResolvedValue({
      id: 'follow-up-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      ownerMembershipId: 'membership-3',
      ownerRole: null,
      assignedAt: '2026-08-01T11:00:00Z',
      dueAt: '2026-08-03T11:00:00Z',
      completionAt: null,
      followUpNote: 'Updated follow-up plan.',
      status: 'OPEN',
    });
    vi.mocked(sessionApi.completePatientEventFollowUp).mockResolvedValue({
      id: 'follow-up-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      ownerMembershipId: 'membership-2',
      ownerRole: null,
      assignedAt: '2026-08-01T11:00:00Z',
      dueAt: '2026-08-02T11:00:00Z',
      completionAt: '2026-08-02T12:00:00Z',
      followUpNote: 'Review safety plan.',
      status: 'COMPLETED',
    });
    vi.mocked(sessionApi.createPatientEventEscalation).mockResolvedValue({
      id: 'escalation-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      status: 'ACTIVE',
      severityLabel: 'HIGH',
      reasonTag: 'CLINICAL_REVIEW',
      escalatedByMembershipId: 'membership-1',
      escalatedAt: '2026-08-01T11:00:00Z',
      clearedByMembershipId: null,
      clearedAt: null,
    });
    vi.mocked(sessionApi.clearPatientEventEscalation).mockResolvedValue({
      id: 'escalation-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      targetType: 'INCIDENT_RECORD',
      targetId: 'incident-1',
      status: 'CLEARED',
      severityLabel: 'HIGH',
      reasonTag: 'CLINICAL_REVIEW',
      escalatedByMembershipId: 'membership-1',
      escalatedAt: '2026-08-01T11:00:00Z',
      clearedByMembershipId: 'membership-1',
      clearedAt: '2026-08-02T12:00:00Z',
    });
    vi.mocked(sessionApi.fetchPatientEventIncident).mockResolvedValue({
      id: 'incident-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      visitOccurrenceId: 'visit-1',
      incidentType: 'FALL',
      severityLabel: 'HIGH',
      occurredAt: '2026-08-01T10:00:00Z',
      reportedAt: '2026-08-01T10:30:00Z',
      summary: 'Patient fall in living room.',
      status: 'OPEN',
      reportedByMembershipId: 'membership-1',
      resolvedAt: null,
    });
  });

  it('renders the incident route and supports shared create mutation messaging', async () => {
    render(
      <MemoryRouter initialEntries={['/app/patient-events/incidents']}>
        <Routes>
          <Route path="/app/patient-events/incidents" element={<PatientEventWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Patient Event Workspace')).toBeInTheDocument();
    expect(screen.getByText('Patient fall in living room.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Patient id'), { target: { value: 'patient-1' } });
    fireEvent.change(screen.getByLabelText('Incident type'), { target: { value: 'MEDICATION' } });
    fireEvent.change(screen.getByLabelText('Occurred at'), { target: { value: '2026-08-02T04:00' } });
    fireEvent.change(screen.getByLabelText('Reported at'), { target: { value: '2026-08-02T04:10' } });
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Medication variance.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create incident' }));

    await waitFor(() => {
      expect(sessionApi.createPatientEventIncident).toHaveBeenCalled();
    });
    expect(await screen.findByText('Workspace refreshed')).toBeInTheDocument();
  });

  it('renders incident detail with evidence, follow-up, escalation, and context panels', async () => {
    vi.mocked(sessionApi.fetchPatientEventEvidenceLinks).mockResolvedValue([
      {
        id: 'evidence-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        sourceType: 'DOCUMENTATION_ATTACHMENT_LINK',
        patientAttachmentId: null,
        mobileArtifactId: null,
        documentationAttachmentLinkId: 'doc-link-1',
        linkedByMembershipId: 'membership-1',
        linkedAt: '2026-08-01T11:00:00Z',
      },
    ]);
    vi.mocked(sessionApi.fetchPatientEventFollowUps).mockResolvedValue([
      {
        id: 'follow-up-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        ownerMembershipId: 'membership-2',
        ownerRole: null,
        assignedAt: '2026-08-01T11:00:00Z',
        dueAt: '2026-08-02T11:00:00Z',
        completionAt: null,
        followUpNote: 'Review safety plan.',
        status: 'OPEN',
      },
    ]);
    vi.mocked(sessionApi.fetchPatientEventEscalations).mockResolvedValue([
      {
        id: 'escalation-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        status: 'ACTIVE',
        severityLabel: 'HIGH',
        reasonTag: 'CLINICAL_REVIEW',
        escalatedByMembershipId: 'membership-1',
        escalatedAt: '2026-08-01T11:00:00Z',
        clearedByMembershipId: null,
        clearedAt: null,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/app/patient-events/incidents/incident-1']}>
        <Routes>
          <Route
            path="/app/patient-events/incidents/:incidentId"
            element={<PatientEventWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Event detail')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evidence' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Escalation' })).toBeInTheDocument();
    expect(screen.getByText('Patient workspace')).toBeInTheDocument();
    expect(screen.getByText('Care-team discussion')).toBeInTheDocument();
  });

  it('renders a controlled unauthorized state when workspace permission is missing', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'BILLING_BACK_OFFICE',
        roleLabel: 'Billing Back Office',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/patient-events']}>
        <Routes>
          <Route path="/app/patient-events" element={<PatientEventWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Patient-event workspace is not available for this role.'),
    ).toBeInTheDocument();
  });

  it('supports infection creation from the infection route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/patient-events/infections']}>
        <Routes>
          <Route path="/app/patient-events/infections" element={<PatientEventWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Create infection' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Patient id'), { target: { value: 'patient-1' } });
    fireEvent.change(screen.getByLabelText('Identified at'), {
      target: { value: '2026-08-02T04:00' },
    });
    fireEvent.change(screen.getByLabelText('Infection type'), { target: { value: 'UTI' } });
    fireEvent.change(screen.getByLabelText('Summary'), {
      target: { value: 'Urinary tract infection.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create infection' }));

    await waitFor(() => {
      expect(sessionApi.createPatientEventInfection).toHaveBeenCalled();
    });
  });

  it('supports wound history entry and evidence linking from wound and incident detail routes', async () => {
    vi.mocked(sessionApi.fetchPatientEventWound).mockResolvedValue({
      id: 'wound-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      identifiedAt: '2026-08-02T09:00:00Z',
      woundTypeOrSite: 'Left heel',
      currentStatus: 'ACTIVE',
      baselineSummary: 'Pressure injury observed.',
      active: true,
      resolvedAt: null,
    });

    render(
      <MemoryRouter initialEntries={['/app/patient-events/wounds/wound-1']}>
        <Routes>
          <Route path="/app/patient-events/wounds/:woundId" element={<PatientEventWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Wound history' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Captured at'), {
      target: { value: '2026-08-03T04:00' },
    });
    fireEvent.change(screen.getByLabelText('Observation summary'), {
      target: { value: 'Reduced drainage.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add wound history entry' }));

    await waitFor(() => {
      expect(sessionApi.addPatientEventWoundHistory).toHaveBeenCalled();
    });
  });

  it('supports evidence link and unlink from incident detail', async () => {
    vi.mocked(sessionApi.fetchPatientEventEvidenceLinks).mockResolvedValue([
      {
        id: 'evidence-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        sourceType: 'DOCUMENTATION_ATTACHMENT_LINK',
        patientAttachmentId: null,
        mobileArtifactId: null,
        documentationAttachmentLinkId: 'doc-link-1',
        linkedByMembershipId: 'membership-1',
        linkedAt: '2026-08-01T11:00:00Z',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/app/patient-events/incidents/incident-1']}>
        <Routes>
          <Route
            path="/app/patient-events/incidents/:incidentId"
            element={<PatientEventWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Evidence' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Patient attachment id'), {
      target: { value: 'attachment-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link evidence' }));

    await waitFor(() => {
      expect(sessionApi.linkPatientEventEvidence).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    await waitFor(() => {
      expect(sessionApi.unlinkPatientEventEvidence).toHaveBeenCalled();
    });
  });

  it('supports follow-up update and completion from incident detail', async () => {
    vi.mocked(sessionApi.fetchPatientEventFollowUps).mockResolvedValue([
      {
        id: 'follow-up-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        ownerMembershipId: 'membership-2',
        ownerRole: null,
        assignedAt: '2026-08-01T11:00:00Z',
        dueAt: '2026-08-02T11:00:00Z',
        completionAt: null,
        followUpNote: 'Review safety plan.',
        status: 'OPEN',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/app/patient-events/incidents/incident-1']}>
        <Routes>
          <Route path="/app/patient-events/incidents/:incidentId" element={<PatientEventWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Follow-up' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Owner membership id'), {
      target: { value: 'membership-3' },
    });
    fireEvent.change(screen.getByLabelText('Due at'), {
      target: { value: '2026-08-03T06:00' },
    });
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Updated follow-up plan.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update follow-up' }));

    await waitFor(() => {
      expect(sessionApi.updatePatientEventFollowUp).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => {
      expect(sessionApi.completePatientEventFollowUp).toHaveBeenCalled();
    });
  });

  it('supports escalation clear and timeline visibility from backend data', async () => {
    vi.mocked(sessionApi.fetchPatientEventEscalations).mockResolvedValue([
      {
        id: 'escalation-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        status: 'ACTIVE',
        severityLabel: 'HIGH',
        reasonTag: 'CLINICAL_REVIEW',
        escalatedByMembershipId: 'membership-1',
        escalatedAt: '2026-08-01T11:00:00Z',
        clearedByMembershipId: null,
        clearedAt: null,
      },
    ]);
    vi.mocked(sessionApi.fetchPatientEventTimeline).mockResolvedValue([
      {
        historyEntryType: 'FOLLOW_UP_ASSIGNED',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        occurredAt: '2026-08-01T11:00:00Z',
        branchId: 'branch-1',
        status: 'OPEN',
        severity: null,
        summary: 'Follow-up assigned for patient safety review.',
      },
      {
        historyEntryType: 'ESCALATION_CREATED',
        targetType: 'INCIDENT_RECORD',
        targetId: 'incident-1',
        occurredAt: '2026-08-01T12:00:00Z',
        branchId: 'branch-1',
        status: 'ACTIVE',
        severity: 'HIGH',
        summary: 'Escalation opened for clinical review.',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/app/patient-events/incidents/incident-1']}>
        <Routes>
          <Route path="/app/patient-events/incidents/:incidentId" element={<PatientEventWorkspacePage />} />
          <Route
            path="/app/patient-events/patients/:patientId/timeline"
            element={<PatientEventWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Escalation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(sessionApi.clearPatientEventEscalation).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('link', { name: 'Timeline' }));
    expect(await screen.findByText('Follow-up assigned for patient safety review.')).toBeInTheDocument();
    expect(screen.getByText('Escalation opened for clinical review.')).toBeInTheDocument();
  });
});
