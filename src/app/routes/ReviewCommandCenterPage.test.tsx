import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewCommandCenterPage } from './ReviewCommandCenterPage';

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
    fetchReviewQueue: vi.fn(),
    fetchReviewExceptionQueue: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

describe('ReviewCommandCenterPage', () => {
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
        role: 'BRANCH_ADMIN',
        roleLabel: 'Branch Admin',
        branchScope: 'branch-assigned',
        branchScopeLabel: 'Assigned branches only',
        assignedBranchIds: ['branch-1'],
        permissions: ['view_review_workspace', 'view_review_exception_queue', 'view_review_audit_context'],
        defaultRoute: '/app/review',
        source: 'backend',
      },
    } as never);

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
            status: 'RETURNED_FOR_FIX',
            priority: 'HIGH',
            exceptionDriven: false,
            enteredQueueAt: '2026-10-01T09:00:00-05:00',
            dueAt: '2020-10-01T10:00:00-05:00',
            lastActivityAt: '2026-10-01T09:30:00-05:00',
            resolvedAt: null,
          },
          activeAssignment: null,
          failCount: 1,
          warningCount: 1,
          openExceptionCount: 0,
        },
        {
          workItem: {
            id: 'work-2',
            sourceType: 'EVV_EXCEPTION_RECORD',
            sourceRecordId: 'evv-1',
            branchId: 'branch-1',
            patientId: null,
            visitOccurrenceId: 'visit-2',
            documentationRecordId: null,
            status: 'SIGNOFF_REQUESTED',
            priority: 'CRITICAL',
            exceptionDriven: true,
            enteredQueueAt: '2026-10-01T09:00:00-05:00',
            dueAt: null,
            lastActivityAt: '2026-10-01T09:30:00-05:00',
            resolvedAt: null,
          },
          activeAssignment: {
            id: 'assignment-2',
            workItemId: 'work-2',
            reviewerMembershipId: 'membership-1',
            assignedByMembershipId: 'membership-1',
            assignedAt: '2026-10-01T09:05:00-05:00',
            releasedAt: null,
            assignmentNote: null,
          },
          failCount: 0,
          warningCount: 1,
          openExceptionCount: 1,
        },
      ],
      page: 0,
      size: 50,
      totalElements: 2,
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
              status: 'SIGNOFF_REQUESTED',
              priority: 'CRITICAL',
              exceptionDriven: true,
              enteredQueueAt: '2026-10-01T09:00:00-05:00',
              dueAt: null,
              lastActivityAt: '2026-10-01T09:30:00-05:00',
              resolvedAt: null,
            },
            activeAssignment: null,
            failCount: 0,
            warningCount: 1,
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
      size: 50,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it('renders coordinator-facing review backlog visibility', async () => {
    render(
      <MemoryRouter initialEntries={['/app/review/command-center']}>
        <Routes>
          <Route path="/app/review/command-center" element={<ReviewCommandCenterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Review command center')).toBeInTheDocument();
    expect(screen.getByText('2 pending review')).toBeInTheDocument();
    expect(screen.getByText('1 unassigned')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(screen.getByText('1 returned')).toBeInTheDocument();
    expect(screen.getByText('1 signoff requested')).toBeInTheDocument();
  });

  it('shows a controlled denied state without review workspace access', async () => {
    vi.mocked(useAccess).mockReturnValue({
      profile: {
        role: 'READ_ONLY_AUDITOR',
        roleLabel: 'Read Only Auditor',
        branchScope: 'agency-wide-read',
        branchScopeLabel: 'Agency-wide read scope',
        assignedBranchIds: [],
        permissions: ['view_audit_log'],
        defaultRoute: '/app/home',
        source: 'backend',
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/review/command-center']}>
        <Routes>
          <Route path="/app/review/command-center" element={<ReviewCommandCenterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Review summary is not available for this role.')).toBeInTheDocument();
  });
});
