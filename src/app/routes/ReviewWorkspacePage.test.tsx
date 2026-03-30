import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewWorkspacePage } from './ReviewWorkspacePage';

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
    assignReviewWorkItem: vi.fn(),
    completeReviewSignoff: vi.fn(),
    fetchReviewQueue: vi.fn(),
    fetchReviewExceptionQueue: vi.fn(),
    fetchReviewWorkItemDetail: vi.fn(),
    fetchReviewCompleteness: vi.fn(),
    fetchReviewHistory: vi.fn(),
    fetchUserDirectory: vi.fn(),
    recalculateReviewCompleteness: vi.fn(),
    recordReviewDecision: vi.fn(),
    releaseActiveReviewAssignment: vi.fn(),
    requestReviewSignoff: vi.fn(),
    markReviewWorkItemResubmitted: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('ReviewWorkspacePage', () => {
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
          'view_review_workspace',
          'view_review_exception_queue',
          'assign_review_work',
          'perform_review_decisions',
          'request_review_signoff',
          'view_review_audit_context',
        ],
        defaultRoute: '/app/review',
        source: 'backend',
      },
    } as never);

    vi.mocked(sessionApi.fetchUserDirectory).mockResolvedValue({
      content: [
        {
          userId: 'user-1',
          membershipId: 'membership-1',
          firstName: 'Quinn',
          lastName: 'Reviewer',
          email: 'quinn@example.com',
          phone: null,
          userStatus: 'ACTIVE',
          role: 'QA_CLINICAL_REVIEWER',
          lastLoginAt: null,
          mfaEnabled: true,
          branchNames: ['North Branch'],
        },
        {
          userId: 'user-2',
          membershipId: 'membership-2',
          firstName: 'Rowan',
          lastName: 'Lead',
          email: 'rowan@example.com',
          phone: null,
          userStatus: 'ACTIVE',
          role: 'BRANCH_ADMIN',
          lastLoginAt: null,
          mfaEnabled: true,
          branchNames: ['North Branch'],
        },
      ],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchReviewQueue).mockResolvedValue({
      content: [
        {
          workItem: {
            id: 'work-1',
            sourceType: 'VISIT_DOCUMENTATION_RECORD',
            sourceRecordId: 'record-1',
            branchId: 'branch-1',
            patientId: 'patient-1',
            visitOccurrenceId: 'visit-1',
            documentationRecordId: 'record-1',
            status: 'IN_REVIEW',
            priority: 'HIGH',
            exceptionDriven: false,
            enteredQueueAt: '2026-10-01T09:00:00-05:00',
            dueAt: '2026-10-01T13:00:00-05:00',
            lastActivityAt: '2026-10-01T09:30:00-05:00',
            resolvedAt: null,
          },
          activeAssignment: {
            id: 'assignment-1',
            workItemId: 'work-1',
            reviewerMembershipId: 'membership-1',
            assignedByMembershipId: 'membership-1',
            assignedAt: '2026-10-01T09:05:00-05:00',
            releasedAt: null,
            assignmentNote: 'Take first pass',
          },
          failCount: 2,
          warningCount: 1,
          openExceptionCount: 0,
        },
      ],
      page: 0,
      size: 6,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchReviewExceptionQueue).mockResolvedValue({
      content: [
        {
          workItem: {
            workItem: {
              id: 'work-2',
              sourceType: 'EVV_EXCEPTION_RECORD',
              sourceRecordId: 'evv-1',
              branchId: 'branch-1',
              patientId: null,
              visitOccurrenceId: 'visit-2',
              documentationRecordId: null,
              status: 'PENDING_REVIEW',
              priority: 'CRITICAL',
              exceptionDriven: true,
              enteredQueueAt: '2026-10-01T08:00:00-05:00',
              dueAt: '2026-10-01T10:00:00-05:00',
              lastActivityAt: '2026-10-01T08:15:00-05:00',
              resolvedAt: null,
            },
            activeAssignment: null,
            failCount: 1,
            warningCount: 0,
            openExceptionCount: 1,
          },
          exceptions: [
            {
              id: 'exception-1',
              exceptionType: 'EVV_EXCEPTION_CARRYOVER',
              severity: 'CRITICAL',
              detectedAt: '2026-10-01T08:05:00-05:00',
              resolvedAt: null,
              resolutionNote: null,
            },
          ],
        },
      ],
      page: 0,
      size: 6,
      totalElements: 1,
      totalPages: 1,
    });

    vi.mocked(sessionApi.fetchReviewWorkItemDetail).mockResolvedValue({
      workItem: {
        id: 'work-1',
        sourceType: 'VISIT_DOCUMENTATION_RECORD',
        sourceRecordId: 'record-1',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        documentationRecordId: 'record-1',
        status: 'RETURNED_FOR_FIX',
        priority: 'HIGH',
        exceptionDriven: false,
        enteredQueueAt: '2026-10-01T09:00:00-05:00',
        dueAt: '2026-10-01T13:00:00-05:00',
        lastActivityAt: '2026-10-01T10:00:00-05:00',
        resolvedAt: null,
      },
      activeAssignment: {
        id: 'assignment-1',
        workItemId: 'work-1',
        reviewerMembershipId: 'membership-1',
        assignedByMembershipId: 'membership-1',
        assignedAt: '2026-10-01T09:05:00-05:00',
        releasedAt: null,
        assignmentNote: 'Take first pass',
      },
      latestFindings: [
        {
          id: 'finding-1',
          findingKind: 'COMPLETENESS',
          ruleCode: 'required-signature',
          severity: 'ERROR',
          findingStatus: 'FAIL',
          fieldPath: 'signature.patient',
          logicalSection: 'Signature',
          explanation: 'Patient signature is missing.',
          evaluatedAt: '2026-10-01T10:00:00-05:00',
        },
      ],
      latestMissingFieldResults: [
        {
          id: 'missing-1',
          ruleCode: 'required-note',
          severity: 'ERROR',
          findingStatus: 'FAIL',
          fieldPath: 'visit.note',
          logicalSection: 'Narrative',
          explanation: 'Visit narrative is required before approval.',
        },
      ],
      exceptions: [],
      decisions: [],
      signoffRequests: [],
    });

    vi.mocked(sessionApi.fetchReviewCompleteness).mockResolvedValue({
      result: {
        id: 'result-1',
        evaluatedSourceType: 'VISIT_DOCUMENTATION_RECORD',
        evaluatedSourceId: 'record-1',
        runNumber: 1,
        passCount: 4,
        warningCount: 1,
        failCount: 2,
        evaluatedAt: '2026-10-01T10:00:00-05:00',
      },
      findings: [],
      missingFieldResults: [],
    });

    vi.mocked(sessionApi.fetchReviewHistory).mockResolvedValue({
      workItem: {
        id: 'work-1',
        sourceType: 'VISIT_DOCUMENTATION_RECORD',
        sourceRecordId: 'record-1',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        documentationRecordId: 'record-1',
        status: 'RETURNED_FOR_FIX',
        priority: 'HIGH',
        exceptionDriven: false,
        enteredQueueAt: '2026-10-01T09:00:00-05:00',
        dueAt: '2026-10-01T13:00:00-05:00',
        lastActivityAt: '2026-10-01T10:00:00-05:00',
        resolvedAt: null,
      },
      assignments: [],
      decisions: [],
      returnForFixEvents: [
        {
          id: 'return-1',
          targetSourceType: 'VISIT_DOCUMENTATION_RECORD',
          targetSourceRecordId: 'record-1',
          returnReason: 'Missing details',
          requiredCorrections: 'Add a complete narrative.',
          returnedByMembershipId: 'membership-1',
          returnedAt: '2026-10-01T09:45:00-05:00',
          resubmittedAt: null,
          resolvedAt: null,
        },
      ],
      signoffRequests: [],
      sourceAuditContext: [],
    });

    vi.mocked(sessionApi.recalculateReviewCompleteness).mockResolvedValue({
      result: {
        id: 'result-2',
        evaluatedSourceType: 'VISIT_DOCUMENTATION_RECORD',
        evaluatedSourceId: 'record-1',
        runNumber: 2,
        passCount: 5,
        warningCount: 0,
        failCount: 1,
        evaluatedAt: '2026-10-01T10:15:00-05:00',
      },
      findings: [],
      missingFieldResults: [],
    });

    vi.mocked(sessionApi.assignReviewWorkItem).mockResolvedValue({
      workItem: {
        id: 'work-1',
        sourceType: 'VISIT_DOCUMENTATION_RECORD',
        sourceRecordId: 'record-1',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        documentationRecordId: 'record-1',
        status: 'RETURNED_FOR_FIX',
        priority: 'HIGH',
        exceptionDriven: false,
        enteredQueueAt: '2026-10-01T09:00:00-05:00',
        dueAt: '2026-10-01T13:00:00-05:00',
        lastActivityAt: '2026-10-01T10:00:00-05:00',
        resolvedAt: null,
      },
      activeAssignment: {
        id: 'assignment-2',
        workItemId: 'work-1',
        reviewerMembershipId: 'membership-2',
        assignedByMembershipId: 'membership-1',
        assignedAt: '2026-10-01T10:20:00-05:00',
        releasedAt: null,
        assignmentNote: 'Escalate to branch lead',
      },
      latestFindings: [],
      latestMissingFieldResults: [],
      exceptions: [],
      decisions: [],
      signoffRequests: [],
    });

    vi.mocked(sessionApi.recordReviewDecision).mockResolvedValue({
      workItem: {
        id: 'work-1',
        sourceType: 'VISIT_DOCUMENTATION_RECORD',
        sourceRecordId: 'record-1',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        documentationRecordId: 'record-1',
        status: 'RETURNED_FOR_FIX',
        priority: 'HIGH',
        exceptionDriven: false,
        enteredQueueAt: '2026-10-01T09:00:00-05:00',
        dueAt: '2026-10-01T13:00:00-05:00',
        lastActivityAt: '2026-10-01T10:25:00-05:00',
        resolvedAt: null,
      },
      activeAssignment: {
        id: 'assignment-1',
        workItemId: 'work-1',
        reviewerMembershipId: 'membership-1',
        assignedByMembershipId: 'membership-1',
        assignedAt: '2026-10-01T09:05:00-05:00',
        releasedAt: null,
        assignmentNote: 'Take first pass',
      },
      latestFindings: [],
      latestMissingFieldResults: [],
      exceptions: [],
      decisions: [
        {
          id: 'decision-1',
          workItemId: 'work-1',
          decisionType: 'RETURN_FOR_FIX',
          decidedByMembershipId: 'membership-1',
          decidedAt: '2026-10-01T10:25:00-05:00',
          reasonCode: 'MISSING_SIGNATURE',
          reviewerNotes: 'Need corrected signature',
        },
      ],
      signoffRequests: [],
    });

    vi.mocked(sessionApi.requestReviewSignoff).mockResolvedValue({
      workItem: {
        id: 'work-1',
        sourceType: 'VISIT_DOCUMENTATION_RECORD',
        sourceRecordId: 'record-1',
        branchId: 'branch-1',
        patientId: 'patient-1',
        visitOccurrenceId: 'visit-1',
        documentationRecordId: 'record-1',
        status: 'SIGNOFF_REQUESTED',
        priority: 'HIGH',
        exceptionDriven: false,
        enteredQueueAt: '2026-10-01T09:00:00-05:00',
        dueAt: '2026-10-01T13:00:00-05:00',
        lastActivityAt: '2026-10-01T10:30:00-05:00',
        resolvedAt: null,
      },
      activeAssignment: {
        id: 'assignment-1',
        workItemId: 'work-1',
        reviewerMembershipId: 'membership-1',
        assignedByMembershipId: 'membership-1',
        assignedAt: '2026-10-01T09:05:00-05:00',
        releasedAt: null,
        assignmentNote: 'Take first pass',
      },
      latestFindings: [],
      latestMissingFieldResults: [],
      exceptions: [],
      decisions: [],
      signoffRequests: [
        {
          id: 'signoff-1',
          workItemId: 'work-1',
          requestedFromMembershipId: 'membership-2',
          requestedFromRole: null,
          requestedByMembershipId: 'membership-1',
          requestedAt: '2026-10-01T10:30:00-05:00',
          status: 'PENDING',
          signoffNote: 'Need branch lead review',
          completedByMembershipId: null,
          completedAt: null,
        },
      ],
    });
  });

  it('renders the Epic 10 review workspace with live backend queue counts', async () => {
    render(
      <MemoryRouter initialEntries={['/app/review']}>
        <Routes>
          <Route path="/app/review" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Review workspace')).toBeInTheDocument();
    expect(await screen.findByText('1 queued item')).toBeInTheDocument();
    expect(screen.getByText('1 exception item')).toBeInTheDocument();
    expect(screen.getByText('Visit documentation review')).toBeInTheDocument();
    expect(screen.getByText('Privacy-aware triage')).toBeInTheDocument();
  });

  it('refreshes the detail route after completeness recalculation', async () => {
    render(
      <MemoryRouter initialEntries={['/app/review/items/work-1']}>
        <Routes>
          <Route path="/app/review/items/:workItemId" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Patient signature is missing.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate completeness' }));

    await waitFor(() => {
      expect(sessionApi.recalculateReviewCompleteness).toHaveBeenCalled();
      expect(screen.getByText('Completeness was recalculated and the review detail refreshed.')).toBeInTheDocument();
    });
  });

  it('shows a controlled denied state for the exception queue route', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'QA_CLINICAL_REVIEWER',
        roleLabel: 'QA Clinical Reviewer',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_review_workspace'],
        defaultRoute: '/app/review',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/review/exceptions']}>
        <Routes>
          <Route path="/app/review/exceptions" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Exception queue is not available for this role.')).toBeInTheDocument();
  });

  it('saves reviewer assignment from the detail route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/review/items/work-1/assignment']}>
        <Routes>
          <Route path="/app/review/items/:workItemId/assignment" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Assignment view')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reviewer'), { target: { value: 'membership-2' } });
    fireEvent.change(screen.getByLabelText('Assignment note'), {
      target: { value: 'Escalate to branch lead' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reassign work item' }));

    await waitFor(() => {
      expect(sessionApi.assignReviewWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({
          workItemId: 'work-1',
          reviewerMembershipId: 'membership-2',
          assignmentNote: 'Escalate to branch lead',
        }),
      );
      expect(screen.getByText('The reviewer assignment was saved and the queue ownership refreshed.')).toBeInTheDocument();
    });
  });

  it('records a return-for-fix decision with reason and correction guidance', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/app/review/items/work-1']}>
        <Routes>
          <Route path="/app/review/items/:workItemId" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Review decision')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'RETURN_FOR_FIX' } });
    fireEvent.change(screen.getByLabelText('Return reason'), {
      target: { value: 'Missing signature block' },
    });
    fireEvent.change(screen.getByLabelText('Correction guidance'), {
      target: { value: 'Collect the patient signature and update the note.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save review decision' }));

    await waitFor(() => {
      expect(sessionApi.recordReviewDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          workItemId: 'work-1',
          decisionType: 'RETURN_FOR_FIX',
          returnReason: 'Missing signature block',
          requiredCorrections: 'Collect the patient signature and update the note.',
        }),
      );
      expect(screen.getByText('The review decision was recorded and the queue/detail state refreshed.')).toBeInTheDocument();
    });
  });

  it('requests signoff from the detail route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/review/items/work-1']}>
        <Routes>
          <Route path="/app/review/items/:workItemId" element={<ReviewWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Signoff workflow')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Requested reviewer'), {
      target: { value: 'membership-2' },
    });
    fireEvent.change(screen.getByLabelText('Request note'), {
      target: { value: 'Need branch lead review' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request signoff' }));

    await waitFor(() => {
      expect(sessionApi.requestReviewSignoff).toHaveBeenCalledWith(
        expect.objectContaining({
          workItemId: 'work-1',
          requestedFromMembershipId: 'membership-2',
          signoffNote: 'Need branch lead review',
        }),
      );
      expect(screen.getByText('The signoff request was created and the current review detail refreshed.')).toBeInTheDocument();
    });
  });
});
