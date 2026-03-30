import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RevenueReadinessWorkspacePage } from './RevenueReadinessWorkspacePage';

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
    fetchRevenueReadinessList: vi.fn(),
    fetchRevenueReadinessDetail: vi.fn(),
    fetchRevenueExceptionFlags: vi.fn(),
    fetchRevenuePayerServiceSummary: vi.fn(),
    fetchRevenueAuthorizationUsageSummary: vi.fn(),
    fetchRevenueAuthorizationUsageHistory: vi.fn(),
    fetchRevenueHistory: vi.fn(),
    previewPayrollExport: vi.fn(),
    previewInvoiceExport: vi.fn(),
    recalculateRevenueReadiness: vi.fn(),
    recalculateRevenueAuthorizationUsage: vi.fn(),
    generatePayrollExport: vi.fn(),
    generateInvoiceExport: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('RevenueReadinessWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));

    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: {
          sessionId: 'session-14',
          userId: 'user-14',
          forcedLogoutAt: null,
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'BILLING_BACK_OFFICE',
        roleLabel: 'Billing Back Office',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: [
          'view_revenue_readiness_workspace',
          'recalculate_revenue_readiness',
          'manage_revenue_exception_flags',
          'generate_revenue_exports',
          'view_authorization_usage_summaries',
          'view_payer_service_summaries',
          'view_audit_log',
          'view_patient_workspace',
          'view_documentation_workspace',
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
    vi.mocked(sessionApi.fetchRevenueReadinessList).mockResolvedValue({
      content: [
        {
          visitOccurrenceId: 'visit-1',
          patientId: 'patient-1',
          branchId: 'branch-1',
          serviceLineId: 'service-1',
          readinessStatus: 'WARNING',
          exceptionCount: 1,
          warningCount: 2,
          payerName: 'Prime Payer',
          evaluatedAt: '2026-03-30T10:00:00Z',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchRevenueExceptionFlags).mockResolvedValue({
      content: [
        {
          id: 'flag-1',
          targetType: 'VISIT',
          targetId: 'visit-1',
          exceptionType: 'MISSING_SIGNATURE',
          severity: 'BLOCKING',
          reasonCode: 'PATIENT_SIGNATURE_MISSING',
          summary: 'Patient signature is missing.',
          detectedAt: '2026-03-30T10:01:00Z',
          clearedAt: null,
          branchId: 'branch-1',
        },
      ],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchRevenueReadinessDetail).mockResolvedValue({
      summary: {
        visitOccurrenceId: 'visit-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        readinessStatus: 'WARNING',
        exceptionCount: 1,
        warningCount: 2,
        payerName: 'Prime Payer',
        evaluatedAt: '2026-03-30T10:00:00Z',
      },
      completionValidation: {
        outcome: 'PASS',
        reasonCode: 'COMPLETE',
        summary: 'Visit completion validation passed.',
        evaluatedAt: '2026-03-30T10:00:00Z',
      },
      signatureValidation: {
        outcome: 'WARNING',
        reasonCode: 'EVV_WARNING',
        summary: 'EVV verification still has a warning.',
        evaluatedAt: '2026-03-30T10:00:00Z',
      },
      authorizationUsage: {
        authorizationId: 'auth-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        authorizedUnits: 10,
        usedUnits: 8,
        remainingUnits: 2,
        usagePosture: 'NEAR_LIMIT',
        countedVisitCount: 8,
        evaluatedAt: '2026-03-30T10:00:00Z',
      },
      payerServiceSummary: {
        visitOccurrenceId: 'visit-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        payerName: 'Prime Payer',
        payerExternalId: 'PRIME',
        memberPolicyNumber: 'POL-1',
        authorizationId: 'auth-1',
        authorizationNumber: 'AUTH-1',
        serviceLineCode: 'PC',
        serviceLineName: 'Personal Care',
        primaryPayer: true,
        summarizedAt: '2026-03-30T10:00:00Z',
      },
      exportLifecycleStatus: 'NOT_REQUESTED',
    });
    vi.mocked(sessionApi.fetchRevenuePayerServiceSummary).mockResolvedValue({
      visitOccurrenceId: 'visit-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      payerName: 'Prime Payer',
      payerExternalId: 'PRIME',
      memberPolicyNumber: 'POL-1',
      authorizationId: 'auth-1',
      authorizationNumber: 'AUTH-1',
      serviceLineCode: 'PC',
      serviceLineName: 'Personal Care',
      primaryPayer: true,
      summarizedAt: '2026-03-30T10:00:00Z',
    });
    vi.mocked(sessionApi.fetchRevenueAuthorizationUsageSummary).mockResolvedValue({
      authorizationId: 'auth-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      authorizedUnits: 10,
      usedUnits: 8,
      remainingUnits: 2,
      usagePosture: 'NEAR_LIMIT',
      countedVisitCount: 8,
      evaluatedAt: '2026-03-30T10:00:00Z',
    });
    vi.mocked(sessionApi.fetchRevenueAuthorizationUsageHistory).mockResolvedValue([
      {
        id: 'audit-usage-1',
        actionType: 'REVENUE_AUTHORIZATION_USAGE_REFRESHED',
        targetType: 'AUTHORIZATION_USAGE_SNAPSHOT',
        targetId: 'usage-1',
        branchId: 'branch-1',
        occurredAt: '2026-03-30T10:00:00Z',
        metadataJson: '{}',
      },
    ]);
    vi.mocked(sessionApi.fetchRevenueHistory).mockResolvedValue({
      projection: null,
      exceptionFlags: [
        {
          id: 'flag-history-1',
          targetType: 'VISIT',
          targetId: 'visit-1',
          exceptionType: 'MISSING_SIGNATURE',
          severity: 'BLOCKING',
          reasonCode: 'PATIENT_SIGNATURE_MISSING',
          summary: 'Patient signature is still missing from the visit.',
          detectedAt: '2026-03-30T10:01:00Z',
          clearedAt: null,
          branchId: 'branch-1',
        },
      ],
      payrollExports: [],
      invoiceExports: [],
      auditEvents: [
        {
          id: 'audit-1',
          actionType: 'REVENUE_READINESS_RECALCULATED',
          targetType: 'REVENUE_READINESS_PROJECTION',
          targetId: 'projection-1',
          branchId: 'branch-1',
          occurredAt: '2026-03-30T10:00:00Z',
          metadataJson: '{}',
        },
      ],
    });
    vi.mocked(sessionApi.previewPayrollExport).mockResolvedValue({
      visitOccurrenceId: 'visit-1',
      readinessStatus: 'WARNING',
      payerName: 'Prime Payer',
      caregiverProfileId: 'caregiver-1',
      unitsOrMinutes: 61,
      exportable: true,
      blockedReason: null,
    });
    vi.mocked(sessionApi.previewInvoiceExport).mockResolvedValue({
      visitOccurrenceId: 'visit-1',
      readinessStatus: 'WARNING',
      payerName: 'Prime Payer',
      caregiverProfileId: null,
      unitsOrMinutes: 1,
      exportable: true,
      blockedReason: null,
    });
    vi.mocked(sessionApi.recalculateRevenueReadiness).mockResolvedValue({
      summary: {
        visitOccurrenceId: 'visit-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        readinessStatus: 'WARNING',
        exceptionCount: 1,
        warningCount: 2,
        payerName: 'Prime Payer',
        evaluatedAt: '2026-03-30T10:05:00Z',
      },
      completionValidation: {
        outcome: 'PASS',
        reasonCode: 'COMPLETE',
        summary: 'Visit completion validation passed.',
        evaluatedAt: '2026-03-30T10:05:00Z',
      },
      signatureValidation: {
        outcome: 'WARNING',
        reasonCode: 'EVV_WARNING',
        summary: 'EVV verification still has a warning.',
        evaluatedAt: '2026-03-30T10:05:00Z',
      },
      authorizationUsage: {
        authorizationId: 'auth-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        authorizedUnits: 10,
        usedUnits: 8,
        remainingUnits: 2,
        usagePosture: 'NEAR_LIMIT',
        countedVisitCount: 8,
        evaluatedAt: '2026-03-30T10:05:00Z',
      },
      payerServiceSummary: {
        visitOccurrenceId: 'visit-1',
        patientId: 'patient-1',
        branchId: 'branch-1',
        serviceLineId: 'service-1',
        payerName: 'Prime Payer',
        payerExternalId: 'PRIME',
        memberPolicyNumber: 'POL-1',
        authorizationId: 'auth-1',
        authorizationNumber: 'AUTH-1',
        serviceLineCode: 'PC',
        serviceLineName: 'Personal Care',
        primaryPayer: true,
        summarizedAt: '2026-03-30T10:05:00Z',
      },
      exportLifecycleStatus: 'NOT_REQUESTED',
    });
    vi.mocked(sessionApi.recalculateRevenueAuthorizationUsage).mockResolvedValue({
      authorizationId: 'auth-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      authorizedUnits: 10,
      usedUnits: 8,
      remainingUnits: 2,
      usagePosture: 'NEAR_LIMIT',
      countedVisitCount: 8,
      evaluatedAt: '2026-03-30T10:05:00Z',
    });
    vi.mocked(sessionApi.generatePayrollExport).mockResolvedValue({
      id: 'payroll-1',
      visitOccurrenceId: 'visit-1',
      patientId: 'patient-1',
      caregiverProfileId: 'caregiver-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      scheduledStartAt: '2026-03-30T09:00:00Z',
      scheduledEndAt: '2026-03-30T10:00:00Z',
      performedStartAt: '2026-03-30T09:00:00Z',
      performedEndAt: '2026-03-30T10:01:00Z',
      durationMinutes: 61,
      readinessStatus: 'WARNING',
      exportLifecycleStatus: 'GENERATED',
      generatedAt: '2026-03-30T10:10:00Z',
    });
    vi.mocked(sessionApi.generateInvoiceExport).mockResolvedValue({
      id: 'invoice-1',
      visitOccurrenceId: 'visit-1',
      patientId: 'patient-1',
      caregiverProfileId: 'caregiver-1',
      branchId: 'branch-1',
      serviceLineId: 'service-1',
      payerName: 'Prime Payer',
      authorizationId: 'auth-1',
      authorizationNumber: 'AUTH-1',
      scheduledStartAt: '2026-03-30T09:00:00Z',
      scheduledEndAt: '2026-03-30T10:00:00Z',
      performedStartAt: '2026-03-30T09:00:00Z',
      performedEndAt: '2026-03-30T10:01:00Z',
      billableUnits: 1,
      readinessStatus: 'WARNING',
      exportLifecycleStatus: 'GENERATED',
      generatedAt: '2026-03-30T10:10:00Z',
    });
  });

  function renderRoute(initialEntry: string) {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/revenue-readiness" element={<RevenueReadinessWorkspacePage />} />
          <Route
            path="/app/revenue-readiness/visits/:visitId"
            element={<RevenueReadinessWorkspacePage />}
          />
          <Route
            path="/app/revenue-readiness/exceptions"
            element={<RevenueReadinessWorkspacePage />}
          />
          <Route
            path="/app/revenue-readiness/payroll-export"
            element={<RevenueReadinessWorkspacePage />}
          />
          <Route
            path="/app/revenue-readiness/invoice-export"
            element={<RevenueReadinessWorkspacePage />}
          />
          <Route
            path="/app/revenue-readiness/authorizations/:authorizationId"
            element={<RevenueReadinessWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the revenue-readiness overview with live queue data', async () => {
    renderRoute('/app/revenue-readiness');

    await waitFor(() => {
      expect(sessionApi.fetchRevenueReadinessList).toHaveBeenCalled();
    });

    expect(await screen.findByText('Revenue readiness')).toBeInTheDocument();
    expect(screen.getByText('Readiness queue')).toBeInTheDocument();
    expect(screen.getByText('Prime Payer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open detail/i })).toBeInTheDocument();
  });

  it('uses the shared payroll export mutation flow on the export route', async () => {
    renderRoute('/app/revenue-readiness/payroll-export');

    expect(await screen.findByText('Payroll export preview')).toBeInTheDocument();
    expect(await screen.findByText('Caregiver profile')).toBeInTheDocument();
    expect(screen.getByText('AUTH-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /generate payroll export/i }));

    await waitFor(() => {
      expect(sessionApi.generatePayrollExport).toHaveBeenCalledWith(
        expect.objectContaining({ visitOccurrenceId: 'visit-1' }),
      );
    });

    expect(
      screen.getByText(
        'Payroll export generation completed, was logged as a controlled operation, and the preview is refreshing with the backend result.',
      ),
    ).toBeInTheDocument();
  });

  it('renders readiness detail with validation, payer summary, and active blocker context', async () => {
    renderRoute('/app/revenue-readiness/visits/visit-1');

    expect(await screen.findByText('Readiness detail')).toBeInTheDocument();
    expect(screen.getByText('Payer and service summary')).toBeInTheDocument();
    expect(screen.getByText('Authorization usage posture')).toBeInTheDocument();
    expect(screen.getByText('Active blocker summary')).toBeInTheDocument();
    expect(screen.getByText('Patient signature is still missing from the visit.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /schedule context/i })).toBeInTheDocument();
  });

  it('renders exception visibility with related readiness context', async () => {
    renderRoute('/app/revenue-readiness/exceptions');

    expect(await screen.findByText('Revenue exceptions')).toBeInTheDocument();
    expect(screen.getByText('Visit-linked blocker')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open readiness detail/i })).toBeInTheDocument();
  });

  it('renders authorization usage posture and supports recalculation', async () => {
    renderRoute('/app/revenue-readiness/authorizations/auth-1');

    expect(await screen.findByText('Authorization usage summary')).toBeInTheDocument();
    expect(screen.getByText('Authorized units')).toBeInTheDocument();
    expect(screen.getByText('Near Limit')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /recalculate authorization usage/i }));

    await waitFor(() => {
      expect(sessionApi.recalculateRevenueAuthorizationUsage).toHaveBeenCalledWith(
        expect.objectContaining({ authorizationId: 'auth-1' }),
      );
    });
  });

  it('renders audit-aware revenue links without exposing extra backend metadata inline', async () => {
    renderRoute('/app/revenue-readiness');

    expect(await screen.findByText('Audit-aware route context')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open revenue summary' })).toHaveAttribute(
      'href',
      '/app/revenue-readiness/command-center',
    );
    expect(screen.getByText('Revenue operations are audit-linked')).toBeInTheDocument();
  });

  it('renders a controlled denied state when the revenue workspace permission is missing', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'CAREGIVER',
        roleLabel: 'Caregiver',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_mobile_app'],
        defaultRoute: '/mobile',
        source: 'backend',
      },
    } as never);

    renderRoute('/app/revenue-readiness');

    expect(
      await screen.findByText('Revenue-readiness workspace is not available for this role.'),
    ).toBeInTheDocument();
  });
});
