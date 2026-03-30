import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ComplianceWorkspacePage } from './ComplianceWorkspacePage';

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
    fetchComplianceDashboard: vi.fn(),
    fetchComplianceDashboardPatients: vi.fn(),
    fetchPatientComplianceWorkspace: vi.fn(),
    fetchComplianceChecklistResults: vi.fn(),
    fetchComplianceDocumentationResults: vi.fn(),
    createComplianceAcknowledgment: vi.fn(),
    updateComplianceAcknowledgment: vi.fn(),
    revokeComplianceAcknowledgment: vi.fn(),
    createCertificationPeriod: vi.fn(),
    updateCertificationPeriod: vi.fn(),
    closeCertificationPeriod: vi.fn(),
    createPatientRiskReminder: vi.fn(),
    updatePatientRiskReminder: vi.fn(),
    resolvePatientRiskReminder: vi.fn(),
    recalculateComplianceStatus: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('ComplianceWorkspacePage', () => {
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
        role: 'QA_CLINICAL_REVIEWER',
        roleLabel: 'QA Clinical Reviewer',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_compliance_workspace',
          'view_compliance_dashboard',
          'view_patient_workspace',
          'view_documentation_workspace',
          'view_audit_log',
          'manage_compliance_checklists',
          'manage_required_documentation_rules',
          'manage_patient_acknowledgments',
          'manage_certification_periods',
          'manage_patient_risk_reminders',
          'recalculate_compliance_status',
        ],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchBranches).mockResolvedValue([
      {
        id: 'branch-1',
        code: 'NORTH',
        name: 'North Compliance',
        status: 'ACTIVE',
      },
    ]);

    vi.mocked(sessionApi.fetchComplianceDashboard).mockResolvedValue([
      {
        branchId: 'branch-1',
        branchName: 'North Compliance',
        totalPatients: 4,
        readyCount: 1,
        warningCount: 2,
        nonCompliantCount: 1,
        unknownCount: 0,
        activeRiskReminderCount: 2,
        acknowledgmentGapCount: 1,
      },
    ]);

    vi.mocked(sessionApi.fetchComplianceDashboardPatients).mockResolvedValue({
      content: [
        {
          patientId: 'patient-1',
          branchId: 'branch-1',
          branchName: 'North Compliance',
          firstName: 'Nora',
          lastName: 'Careplan',
          readinessStatus: 'WARNING',
          certificationPeriodStatus: 'CURRENT',
          activeRiskReminderCount: 1,
          gapCount: 2,
          acknowledgmentGapCount: 0,
          evaluatedAt: '2026-08-01T18:00:00Z',
        },
      ],
      page: 0,
      size: 6,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchPatientComplianceWorkspace).mockResolvedValue({
      projection: {
        id: 'projection-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-line-1',
        checklistPassCount: 1,
        checklistWarningCount: 1,
        checklistFailCount: 0,
        documentationSatisfiedCount: 1,
        documentationWarningCount: 0,
        documentationUnsatisfiedCount: 0,
        missingAcknowledgmentCount: 0,
        expiredAcknowledgmentCount: 0,
        certificationPeriodStatus: 'CURRENT',
        activeRiskReminderCount: 1,
        readinessStatus: 'WARNING',
        evaluatedAt: '2026-08-01T18:00:00Z',
      },
      results: [
        {
          id: 'result-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          serviceLineId: 'service-line-1',
          evaluationCategory: 'CHECKLIST_ITEM',
          checklistDefinitionId: 'check-1',
          documentationRequirementId: null,
          resultCode: 'PLAN_COMPLETE',
          resultStatus: 'PASS',
          evidenceSourceType: 'MANUAL_REVIEW',
          evidenceSourceId: null,
          evidenceSummary: 'Plan complete.',
          evaluationOrigin: 'SYSTEM',
          contextPeriodStart: '2026-08-01',
          contextPeriodEnd: '2026-08-31',
          satisfiedByRecordType: null,
          satisfiedByRecordId: null,
          missingReason: null,
          evaluatedAt: '2026-08-01T18:00:00Z',
        },
        {
          id: 'result-2',
          patientId: 'patient-1',
          branchId: 'branch-1',
          serviceLineId: 'service-line-1',
          evaluationCategory: 'REQUIRED_DOCUMENTATION',
          checklistDefinitionId: null,
          documentationRequirementId: 'doc-1',
          resultCode: 'SIGNED_ATTACHMENT_NOTE',
          resultStatus: 'WARNING',
          evidenceSourceType: null,
          evidenceSourceId: null,
          evidenceSummary: 'Due soon.',
          evaluationOrigin: 'SYSTEM',
          contextPeriodStart: '2026-08-01',
          contextPeriodEnd: '2026-08-31',
          satisfiedByRecordType: null,
          satisfiedByRecordId: null,
          missingReason: 'DOCUMENTATION_DUE_SOON',
          evaluatedAt: '2026-08-01T18:00:00Z',
        },
      ],
      acknowledgments: [
        {
          id: 'ack-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          acknowledgmentType: 'RIGHT_TO_CARE',
          effectiveAt: '2026-08-01T16:00:00Z',
          expiresAt: null,
          capturedByMembershipId: 'membership-1',
          captureMethod: 'PATIENT_SIGNATURE',
          supportingArtifactType: null,
          supportingArtifactId: null,
          status: 'ACTIVE',
          revokedAt: null,
        },
      ],
      certificationPeriods: [
        {
          id: 'cert-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          patientPayerLinkId: null,
          programContext: 'MEDICARE',
          startDate: '2026-08-01',
          endDate: '2026-09-30',
          recordState: 'ACTIVE',
          source: 'MANUAL',
        },
      ],
      reminders: [
        {
          id: 'risk-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          visitOccurrenceId: null,
          documentationRecordId: null,
          riskType: 'FALL_RISK',
          severityLabel: 'HIGH',
          summary: 'Monitor for fall-risk changes.',
          effectiveAt: '2026-08-01T17:00:00Z',
          expiresAt: null,
          sourceContextType: null,
          sourceRecordId: null,
          status: 'ACTIVE',
          resolvedAt: null,
        },
      ],
    });

    vi.mocked(sessionApi.fetchComplianceChecklistResults).mockResolvedValue([
      {
        id: 'result-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-line-1',
        evaluationCategory: 'CHECKLIST_ITEM',
        checklistDefinitionId: 'check-1',
        documentationRequirementId: null,
        resultCode: 'PLAN_COMPLETE',
        resultStatus: 'PASS',
        evidenceSourceType: 'MANUAL_REVIEW',
        evidenceSourceId: null,
        evidenceSummary: 'Plan complete.',
        evaluationOrigin: 'SYSTEM',
        contextPeriodStart: '2026-08-01',
        contextPeriodEnd: '2026-08-31',
        satisfiedByRecordType: null,
        satisfiedByRecordId: null,
        missingReason: null,
        evaluatedAt: '2026-08-01T18:00:00Z',
      },
    ]);

    vi.mocked(sessionApi.fetchComplianceDocumentationResults).mockResolvedValue([
      {
        id: 'result-2',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-line-1',
        evaluationCategory: 'REQUIRED_DOCUMENTATION',
        checklistDefinitionId: null,
        documentationRequirementId: 'doc-1',
        resultCode: 'SIGNED_ATTACHMENT_NOTE',
        resultStatus: 'WARNING',
        evidenceSourceType: null,
        evidenceSourceId: null,
        evidenceSummary: 'Due soon.',
        evaluationOrigin: 'SYSTEM',
        contextPeriodStart: '2026-08-01',
        contextPeriodEnd: '2026-08-31',
        satisfiedByRecordType: 'VISIT_DOCUMENTATION',
        satisfiedByRecordId: 'record-1',
        missingReason: 'DOCUMENTATION_DUE_SOON',
        evaluatedAt: '2026-08-01T18:00:00Z',
      },
    ]);

    vi.mocked(sessionApi.createComplianceAcknowledgment).mockResolvedValue({
      id: 'ack-2',
      patientId: 'patient-1',
      branchId: 'branch-1',
      acknowledgmentType: 'CONSENT',
      effectiveAt: '2026-08-02T16:00:00Z',
      expiresAt: null,
      capturedByMembershipId: null,
      captureMethod: null,
      supportingArtifactType: null,
      supportingArtifactId: null,
      status: 'ACTIVE',
      revokedAt: null,
    });

    vi.mocked(sessionApi.recalculateComplianceStatus).mockResolvedValue({
      id: 'projection-2',
      patientId: 'patient-1',
      branchId: 'branch-1',
      serviceLineId: 'service-line-1',
      checklistPassCount: 1,
      checklistWarningCount: 1,
      checklistFailCount: 0,
      documentationSatisfiedCount: 1,
      documentationWarningCount: 0,
      documentationUnsatisfiedCount: 0,
      missingAcknowledgmentCount: 0,
      expiredAcknowledgmentCount: 0,
      certificationPeriodStatus: 'CURRENT',
      activeRiskReminderCount: 1,
      readinessStatus: 'WARNING',
      evaluatedAt: '2026-08-01T18:05:00Z',
    });
  });

  it('renders the Epic 11 dashboard workspace with live backend counts', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance']}>
        <Routes>
          <Route element={<ComplianceWorkspacePage />} path="/app/compliance" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Compliance workspace')).toBeInTheDocument();
    expect(await screen.findByText('Nora Careplan')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Compliance status summary')).toBeInTheDocument();
      expect(screen.getAllByText('North Compliance').length).toBeGreaterThan(0);
      expect(screen.getByText('Patient compliance snapshots')).toBeInTheDocument();
    });
  });

  it('renders the patient compliance detail route with section links and summary cards', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance/patients/patient-1/documentation-gaps']}>
        <Routes>
          <Route
            element={<ComplianceWorkspacePage />}
            path="/app/compliance/patients/:patientId/documentation-gaps"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Patient compliance detail')).toBeInTheDocument();
    expect(await screen.findByText('Documentation gaps and evidence')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Signed Attachment Note')).toBeInTheDocument();
      expect(screen.getByText('Documentation Due Soon')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Open documentation evidence' })).toHaveAttribute(
        'href',
        '/app/documentation/records/record-1/printable',
      );
    });
  });

  it('renders audit-aware compliance links for authorized reviewers', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance/patients/patient-1']}>
        <Routes>
          <Route element={<ComplianceWorkspacePage />} path="/app/compliance/patients/:patientId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Audit-aware patient follow-up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open compliance audit activity' })).toHaveAttribute(
      'href',
      '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
    );
  });

  it('creates a patient acknowledgment from the live acknowledgment editor', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance/patients/patient-1/acknowledgments']}>
        <Routes>
          <Route
            element={<ComplianceWorkspacePage />}
            path="/app/compliance/patients/:patientId/acknowledgments"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Add acknowledgment')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'CONSENT' } });
    fireEvent.change(screen.getByLabelText('Effective at'), {
      target: { value: '2026-08-02T11:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create acknowledgment' }));

    await waitFor(() => {
      expect(sessionApi.createComplianceAcknowledgment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          acknowledgmentType: 'CONSENT',
        }),
      );
      expect(
        screen.getByText('Acknowledgment state refreshed from the backend compliance workspace.'),
      ).toBeInTheDocument();
    });
  });

  it('recalculates patient compliance status from the summary route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/compliance/patients/patient-1']}>
        <Routes>
          <Route element={<ComplianceWorkspacePage />} path="/app/compliance/patients/:patientId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Patient compliance summary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate compliance' }));

    await waitFor(() => {
      expect(sessionApi.recalculateComplianceStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          requiredAcknowledgmentTypes: ['RIGHT_TO_CARE'],
        }),
      );
      expect(screen.getByText('Compliance projection recalculated and the live patient summary was refreshed.')).toBeInTheDocument();
    });
  });
});
