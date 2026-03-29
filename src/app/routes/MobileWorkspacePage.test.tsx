import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileWorkspacePage } from './MobileWorkspacePage';

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
    createMobileExceptionEscalation: vi.fn(),
    createMobileIncident: vi.fn(),
    createMobileMessageThread: vi.fn(),
    createMobileMissedVisitEscalation: vi.fn(),
    createMobileVisitException: vi.fn(),
    downloadMobileFieldArtifact: vi.fn(),
    endMobileVisitExecution: vi.fn(),
    fetchMobileVisitExceptions: vi.fn(),
    fetchOwnMobileEvvSummary: vi.fn(),
    fetchMobileHome: vi.fn(),
    fetchMobileMessageThread: vi.fn(),
    fetchMobileMessageThreads: vi.fn(),
    fetchMobileRoute: vi.fn(),
    fetchMobileVisitDetail: vi.fn(),
    notifySupervisorForMobileException: vi.fn(),
    notifySupervisorForMobileMissedVisit: vi.fn(),
    recordMobileEvvClockIn: vi.fn(),
    recordMobileEvvClockOut: vi.fn(),
    recordMobileEvvSignature: vi.fn(),
    reportMobileMissedVisit: vi.fn(),
    saveMobileQuickNote: vi.fn(),
    saveMobileTaskChecklist: vi.fn(),
    sendMobileMessage: vi.fn(),
    startMobileVisitExecution: vi.fn(),
    uploadMobileFieldArtifact: vi.fn(),
    updateMobileVisitExceptionStatus: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('MobileWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => null),
    });
    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: {
        getCurrentPosition: vi.fn((success: (position: { coords: { latitude: number; longitude: number } }) => void) =>
          success({
            coords: {
              latitude: 41.881,
              longitude: -87.623,
            },
          }),
        ),
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-1',
          userId: 'user-1',
          forcedLogoutAt: '2026-04-21T18:00:00-05:00',
        },
      },
      refreshAuth: vi.fn(),
      logout: vi.fn().mockResolvedValue({ redirectTo: '/mobile/login?loggedOut=1' }),
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_mobile_app',
          'view_mobile_evv',
          'submit_mobile_evv',
          'execute_mobile_visits',
          'submit_mobile_visit_documentation',
          'view_mobile_messages',
          'send_mobile_messages',
        ],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchMobileHome).mockResolvedValue({
      day: '2026-04-21',
      timezone: 'America/Chicago',
      visits: [
        {
          visitId: 'visit-1',
          patientDisplaySummary: 'Ava Patient',
          branchName: 'North Branch',
          plannedStartAt: '2026-04-21T09:00:00-05:00',
          plannedEndAt: '2026-04-21T10:00:00-05:00',
          timezone: 'America/Chicago',
          scheduleStatus: 'ASSIGNED',
          routeOrder: 1,
          executionStatus: null,
        },
      ],
    });
    vi.mocked(sessionApi.fetchMobileRoute).mockResolvedValue({
      caregiverProfileId: 'caregiver-1',
      day: '2026-04-21',
      timezone: 'America/Chicago',
      stops: [
        {
          visitId: 'visit-1',
          patientDisplaySummary: 'Ava Patient',
          addressSummary: '123 Main, Chicago, IL 60601',
          plannedStartAt: '2026-04-21T09:00:00-05:00',
          plannedEndAt: '2026-04-21T10:00:00-05:00',
          sortOrder: 1,
          executionStatus: null,
        },
      ],
    });
    vi.mocked(sessionApi.fetchMobileVisitDetail).mockResolvedValue({
      visitId: 'visit-1',
      patientSummary: {
        patientId: 'patient-1',
        patientDisplaySummary: 'Ava Patient',
        dateOfBirth: '1950-01-01',
        addressSummary: '123 Main, Chicago, IL 60601',
        contactSummary: {
          fullName: 'Jamie Contact',
          relationshipType: 'Daughter',
          phone: '555-0100',
          email: 'jamie@example.com',
        },
        diagnosisSummaries: ['Hypertension'],
        serviceLineSummary: 'Skilled Nursing',
        visitTypeSummary: 'Routine Visit',
        payerSnippet: 'Medicare',
      },
      careInstructions: {
        visitId: 'visit-1',
        visitTypeInstructions: 'Check vitals.',
        serviceLineInstructions: 'Observe medication tolerance.',
        branchInstructions: 'Call branch for urgent changes.',
        patientSpecificCareNotes: 'Patient prefers morning visits.',
      },
    });
    vi.mocked(sessionApi.fetchOwnMobileEvvSummary).mockResolvedValue({
      visitId: 'visit-1',
      verificationSessionId: 'evv-session-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      caregiverProfileId: 'caregiver-1',
      verificationStatus: 'PENDING_VERIFICATION',
      complianceOutcome: 'BLOCKED',
      startEventPresent: false,
      endEventPresent: false,
      geofenceOutcome: 'NOT_EVALUABLE',
      signatureComplete: false,
      openExceptionCount: 0,
      missedVisitReported: false,
      warnings: ['Geofence could not be evaluated'],
      blockers: ['Missing clock-in', 'Missing clock-out', 'Missing required signature'],
    });
    vi.mocked(sessionApi.recordMobileEvvClockIn).mockResolvedValue({
      eventId: 'clock-1',
      verificationSessionId: 'evv-session-1',
      eventType: 'CLOCK_IN',
      capturedAt: '2026-04-21T09:00:00-05:00',
      verificationStatus: 'VERIFIED_WITH_WARNING',
      geofenceOutcome: 'OUTSIDE_TOLERANCE_WARNING',
      geofenceReasonCode: 'outside_warning',
      distanceFromExpectedMeters: 120,
      toleranceMetersUsed: 100,
      overallOutcome: 'READY_WITH_WARNING',
      warnings: ['Geofence warning'],
      blockers: [],
    });
    vi.mocked(sessionApi.recordMobileEvvClockOut).mockResolvedValue({
      eventId: 'clock-2',
      verificationSessionId: 'evv-session-1',
      eventType: 'CLOCK_OUT',
      capturedAt: '2026-04-21T10:00:00-05:00',
      verificationStatus: 'VERIFIED',
      geofenceOutcome: 'WITHIN_TOLERANCE',
      geofenceReasonCode: null,
      distanceFromExpectedMeters: 20,
      toleranceMetersUsed: 100,
      overallOutcome: 'READY',
      warnings: [],
      blockers: [],
    });
    vi.mocked(sessionApi.recordMobileEvvSignature).mockResolvedValue({
      id: 'sig-1',
      verificationSessionId: 'evv-session-1',
      artifactId: 'artifact-signature-1',
      signerRole: 'PATIENT',
      verificationStatus: 'PRESENT',
      recordedAt: '2026-04-21T09:10:00-05:00',
    });
    vi.mocked(sessionApi.reportMobileMissedVisit).mockResolvedValue({
      id: 'missed-1',
      visitId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      reasonCode: 'PATIENT_UNAVAILABLE',
      narrative: 'No one answered the door.',
      reportedAt: '2026-04-21T09:05:00-05:00',
      status: 'REPORTED',
    });
    vi.mocked(sessionApi.fetchMobileVisitExceptions).mockResolvedValue([]);
    vi.mocked(sessionApi.createMobileVisitException).mockResolvedValue({
      id: 'exception-1',
      verificationSessionId: 'evv-session-1',
      visitId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      exceptionType: 'GEOFENCE_OUT_OF_RANGE',
      severity: 'HIGH',
      reasonCode: 'gps_out_of_range',
      narrative: 'Patient met caregiver in lobby, outside visit geofence.',
      status: 'OPEN',
      acknowledgedAt: null,
      resolvedAt: null,
    });
    vi.mocked(sessionApi.updateMobileVisitExceptionStatus).mockResolvedValue({
      id: 'exception-1',
      verificationSessionId: 'evv-session-1',
      visitId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      exceptionType: 'GEOFENCE_OUT_OF_RANGE',
      severity: 'HIGH',
      reasonCode: 'gps_out_of_range',
      narrative: 'Patient met caregiver in lobby, outside visit geofence.',
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-04-21T09:12:00-05:00',
      resolvedAt: null,
    });
    vi.mocked(sessionApi.notifySupervisorForMobileException).mockResolvedValue({
      id: 'notify-1',
      missedVisitRecordId: null,
      visitExceptionRecordId: 'exception-1',
      recipientMembershipId: 'membership-2',
      channel: 'SMS',
      rationale: 'Branch follow-up needed',
      createdAt: '2026-04-21T09:13:00-05:00',
      status: 'SENT',
    });
    vi.mocked(sessionApi.notifySupervisorForMobileMissedVisit).mockResolvedValue({
      id: 'notify-2',
      missedVisitRecordId: 'missed-1',
      visitExceptionRecordId: null,
      recipientMembershipId: 'membership-2',
      channel: 'SMS',
      rationale: 'Missed visit needs triage',
      createdAt: '2026-04-21T09:13:00-05:00',
      status: 'SENT',
    });
    vi.mocked(sessionApi.createMobileExceptionEscalation).mockResolvedValue({
      id: 'escalation-1',
      missedVisitRecordId: null,
      visitExceptionRecordId: 'exception-1',
      targetRoleKey: 'BRANCH_ADMIN',
      severity: 'HIGH',
      rationale: 'Immediate operational review',
      slaDueAt: null,
      status: 'OPEN',
    });
    vi.mocked(sessionApi.createMobileMissedVisitEscalation).mockResolvedValue({
      id: 'escalation-2',
      missedVisitRecordId: 'missed-1',
      visitExceptionRecordId: null,
      targetRoleKey: 'BRANCH_ADMIN',
      severity: 'HIGH',
      rationale: 'Immediate operational review',
      slaDueAt: null,
      status: 'OPEN',
    });
    vi.mocked(sessionApi.startMobileVisitExecution).mockResolvedValue({
      id: 'execution-1',
      visitOccurrenceId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      startedAt: '2026-04-21T09:01:00-05:00',
      endedAt: null,
      startedLatitude: 41.881,
      startedLongitude: -87.623,
      endedLatitude: null,
      endedLongitude: null,
      startSource: 'mobile_web',
      endSource: null,
      executionStatus: 'IN_PROGRESS',
      syncStatus: 'ACCEPTED',
    });
    vi.mocked(sessionApi.endMobileVisitExecution).mockResolvedValue({
      id: 'execution-1',
      visitOccurrenceId: 'visit-1',
      caregiverProfileId: 'caregiver-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      startedAt: '2026-04-21T09:01:00-05:00',
      endedAt: '2026-04-21T09:59:00-05:00',
      startedLatitude: 41.881,
      startedLongitude: -87.623,
      endedLatitude: 41.8811,
      endedLongitude: -87.6231,
      startSource: 'mobile_web',
      endSource: 'mobile_web',
      executionStatus: 'COMPLETED',
      syncStatus: 'ACCEPTED',
    });
    vi.mocked(sessionApi.saveMobileTaskChecklist).mockResolvedValue([
      {
        id: 'checklist-1',
        executionSessionId: 'execution-1',
        taskTemplateId: null,
        title: 'Arrival and safety check',
        description: 'Confirm patient readiness and environment safety.',
        category: 'GENERAL',
        sortOrder: 1,
        completed: true,
        completedAt: '2026-04-21T09:15:00-05:00',
        completionNotes: 'Done',
      },
    ]);
    vi.mocked(sessionApi.saveMobileQuickNote).mockResolvedValue({
      id: 'note-1',
      executionSessionId: 'execution-1',
      caregiverProfileId: 'caregiver-1',
      authoredAt: '2026-04-21T09:16:00-05:00',
      noteText: 'Patient resting comfortably.',
      status: 'SUBMITTED',
    });
    vi.mocked(sessionApi.fetchMobileMessageThreads).mockResolvedValue([
      {
        threadId: 'thread-1',
        participantsSummary: ['Jamie Caregiver', 'Agency operations'],
        lastMessagePreview: 'Running 10 minutes behind schedule.',
        unreadCount: 0,
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        lastMessageAt: '2026-04-21T09:40:00-05:00',
      },
    ]);
    vi.mocked(sessionApi.fetchMobileMessageThread).mockResolvedValue({
      threadId: 'thread-1',
      subject: 'Route delay',
      patientId: 'patient-1',
      visitOccurrenceId: 'visit-1',
      messages: [
        {
          messageId: 'message-1',
          senderMembershipId: 'membership-1',
          senderEmail: 'ops@agency.example',
          sentAt: '2026-04-21T09:40:00-05:00',
          messageText: 'Running 10 minutes behind schedule.',
        },
      ],
    });
    vi.mocked(sessionApi.sendMobileMessage).mockResolvedValue({
      id: 'message-2',
      threadId: 'thread-1',
      senderMembershipId: 'membership-1',
      sentAt: '2026-04-21T09:41:00-05:00',
      messageText: 'Acknowledged.',
    });
  });

  it('renders backend-backed today work and visit detail in the mobile shell', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionApi.fetchMobileHome).toHaveBeenCalled();
      expect(sessionApi.fetchMobileRoute).toHaveBeenCalled();
      expect(sessionApi.fetchMobileVisitDetail).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        visitId: 'visit-1',
      });
    });

    expect(await screen.findByText('Ava Patient')).toBeInTheDocument();
    expect(screen.getByText('Care instructions')).toBeInTheDocument();
    expect(screen.getByText('Visit action framework')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start visit' })).toBeInTheDocument();
  });

  it('starts a visit, shows captured field state, and refreshes the mobile board', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Start visit' }));

    await waitFor(() => {
      expect(sessionApi.startMobileVisitExecution).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        visitId: 'visit-1',
        startedAt: expect.any(String),
        startedLatitude: 41.881,
        startedLongitude: -87.623,
        startSource: 'mobile_web',
        syncStatus: 'ACCEPTED',
      });
    });

    expect(await screen.findByText('Visit started. The field session is now active and recorded.')).toBeInTheDocument();
    expect(screen.getByText(/Latitude 41.8810, longitude -87.6230/)).toBeInTheDocument();
  });

  it('renders the dedicated EVV route with backend summary and visit workflow tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/evv']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId/evv" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionApi.fetchOwnMobileEvvSummary).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        visitId: 'visit-1',
      });
    });

    expect(await screen.findByText('Pending verification')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Execution' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'EVV' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Missed Visit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exception' })).toBeInTheDocument();
    expect(screen.getByText('EVV verification')).toBeInTheDocument();
  });

  it('submits EVV clock-in from the dedicated EVV route and refreshes proof state', async () => {
    vi.mocked(sessionApi.fetchOwnMobileEvvSummary)
      .mockResolvedValueOnce({
        visitId: 'visit-1',
        verificationSessionId: 'evv-session-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        caregiverProfileId: 'caregiver-1',
        verificationStatus: 'PENDING_VERIFICATION',
        complianceOutcome: 'BLOCKED',
        startEventPresent: false,
        endEventPresent: false,
        geofenceOutcome: 'NOT_EVALUABLE',
        signatureComplete: false,
        openExceptionCount: 0,
        missedVisitReported: false,
        warnings: [],
        blockers: ['Missing clock-in'],
      })
      .mockResolvedValueOnce({
        visitId: 'visit-1',
        verificationSessionId: 'evv-session-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        caregiverProfileId: 'caregiver-1',
        verificationStatus: 'VERIFIED_WITH_WARNING',
        complianceOutcome: 'READY_WITH_WARNING',
        startEventPresent: true,
        endEventPresent: false,
        geofenceOutcome: 'OUTSIDE_TOLERANCE_WARNING',
        signatureComplete: false,
        openExceptionCount: 0,
        missedVisitReported: false,
        warnings: ['Geofence warning'],
        blockers: ['Missing clock-out', 'Missing required signature'],
      });

    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/evv']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId/evv" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Clock in' }));

    await waitFor(() => {
      expect(sessionApi.recordMobileEvvClockIn).toHaveBeenCalled();
    });

    expect(await screen.findByText('Clock-in recorded and EVV status refreshed.')).toBeInTheDocument();
    expect(screen.getByText('Clock In')).toBeInTheDocument();
  });

  it('submits a missed visit from the dedicated missed-visit route', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/evv/missed-visit']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId/evv/missed-visit" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('What happened?'), {
      target: { value: 'No one answered the door.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit missed visit' }));

    await waitFor(() => {
      expect(sessionApi.reportMobileMissedVisit).toHaveBeenCalledWith(
        expect.objectContaining({
          visitId: 'visit-1',
          reasonCode: 'PATIENT_UNAVAILABLE',
          narrative: 'No one answered the door.',
        }),
      );
    });

    expect(await screen.findByText('Missed visit reported and reflected in EVV status.')).toBeInTheDocument();
  });

  it('creates an EVV exception and supports supervisor notification follow-up for authorized users', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'BRANCH_ADMIN',
        roleLabel: 'Branch Admin',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_mobile_evv',
          'submit_mobile_evv',
          'manage_mobile_evv_exceptions',
          'receive_mobile_evv_notifications',
          'view_mobile_app',
        ],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1/evv/exception']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId/evv/exception" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Narrative'), {
      target: { value: 'Patient met caregiver in lobby, outside visit geofence.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create exception' }));

    await waitFor(() => {
      expect(sessionApi.createMobileVisitException).toHaveBeenCalled();
    });

    fireEvent.change(await screen.findByLabelText('Supervisor membership ID'), {
      target: { value: 'membership-2' },
    });
    fireEvent.change(screen.getByLabelText('Notification rationale'), {
      target: { value: 'Branch follow-up needed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Notify supervisor' }));

    await waitFor(() => {
      expect(sessionApi.notifySupervisorForMobileException).toHaveBeenCalledWith(
        'exception-1',
        expect.objectContaining({
          recipientMembershipId: 'membership-2',
          rationale: 'Branch follow-up needed',
        }),
      );
    });

    expect(await screen.findByText('Supervisor notification Sent')).toBeInTheDocument();
  });

  it('saves checklist items after the visit has started', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Start visit' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save checklist' }));

    await waitFor(() => {
      expect(sessionApi.saveMobileTaskChecklist).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        executionSessionId: 'execution-1',
        items: expect.any(Array),
      });
    });

    expect(await screen.findByText('Checklist saved to the backend mobile documentation flow.')).toBeInTheDocument();
  });

  it('shows audit-aware links for controlled field mutations without exposing admin tooling inline', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Review MOBILE_TASK_CHECKLIST_SAVED')).toBeInTheDocument();
    expect(screen.getByText('Review MOBILE_PHOTO_UPLOADED')).toBeInTheDocument();
    expect(screen.getByText('Review MOBILE_INCIDENT_FLAGGED')).toBeInTheDocument();
  });

  it('queues checklist work for later sync when the device goes offline', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Start visit' }));
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    fireEvent.click(await screen.findByRole('button', { name: 'Save checklist' }));

    expect(await screen.findByText('Checklist queued for sync when connectivity returns.')).toBeInTheDocument();
    expect(sessionApi.saveMobileTaskChecklist).toHaveBeenCalledTimes(0);
    expect(await screen.findByText('Queued sync actions')).toBeInTheDocument();
  });

  it('shows a clear validation failure for unsupported photo uploads', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/visits/visit-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/visits/:visitId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Start visit' }));
    await screen.findByText('Visit started. The field session is now active and recorded.');
    const invalidFile = new File(['bad'], 'notes.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected photo file input to be rendered.');
    }
    fireEvent.change(fileInput, {
      target: { files: [invalidFile] },
    });

    expect(
      await screen.findByText('Only JPEG, PNG, and WEBP uploads are allowed in the mobile field workflow.'),
    ).toBeInTheDocument();
    expect(sessionApi.uploadMobileFieldArtifact).not.toHaveBeenCalled();
  });

  it('renders the real message center and sends a reply through the backend API', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile/messages?threadId=thread-1']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/messages" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionApi.fetchMobileMessageThreads).toHaveBeenCalled();
      expect(sessionApi.fetchMobileMessageThread).toHaveBeenCalledWith('thread-1', {
        accessToken: undefined,
        sessionId: 'session-1',
      });
    });
    fireEvent.change(screen.getByRole('textbox', { name: /reply/i }), {
      target: { value: 'Acknowledged.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(sessionApi.sendMobileMessage).toHaveBeenCalledWith({
        accessToken: undefined,
        sessionId: 'session-1',
        threadId: 'thread-1',
        messageText: 'Acknowledged.',
        sentAt: expect.any(String),
      });
    });
  });

  it('renders a controlled read-only message state when message permission is missing', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_mobile_app', 'execute_mobile_visits'],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/mobile/messages']}>
        <Routes>
          <Route element={<MobileWorkspacePage />} path="/mobile/messages" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Messages are not available for this role'),
    ).toBeInTheDocument();
  });
});
