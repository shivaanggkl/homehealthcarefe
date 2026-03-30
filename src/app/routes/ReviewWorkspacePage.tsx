import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyRole,
  ApiError,
  assignReviewWorkItem,
  completeReviewSignoff,
  fetchReviewCompleteness,
  fetchReviewExceptionQueue,
  fetchReviewHistory,
  fetchReviewQueue,
  fetchReviewWorkItemDetail,
  fetchUserDirectory,
  markReviewWorkItemResubmitted,
  recalculateReviewCompleteness,
  recordReviewDecision,
  releaseActiveReviewAssignment,
  requestReviewSignoff,
  type ReviewDecisionType,
  type ReviewExceptionType,
  type ReviewFindingSeverity,
  type ReviewLifecycleStatus,
  type ReviewSourceType,
  type ReviewCompletenessEvaluation,
  type ReviewExceptionQueueItem,
  type ReviewHistory,
  type ReviewQueueItem,
  type ReviewWorkItemDetail,
  type ReviewWorkItemSummary,
  type UserDirectoryEntry,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ReviewFindingList,
  ReviewModuleState,
  ReviewMutationNotice,
  ReviewPanel,
  ReviewQueueList,
  ReviewSectionNavigation,
  ReviewSourceContextSummary,
  ReviewStatusBanner,
  ReviewWorkspaceCards,
  ReviewWorkspaceGrid,
  ReviewWorkspaceShell,
} from '../components/ReviewWorkspaceFoundation';

function reviewAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

function formatTokenLabel(value: string | null | undefined) {
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
    return 'Not scheduled';
  }

  return new Date(value).toLocaleString();
}

function membershipLabel(directory: UserDirectoryEntry[], membershipId: string | null | undefined) {
  if (!membershipId) {
    return 'Unassigned';
  }

  const match = directory.find((entry) => entry.membershipId === membershipId);
  if (!match) {
    return membershipId;
  }

  return `${match.firstName} ${match.lastName}`;
}

function reviewItemTitle(item: ReviewWorkItemSummary) {
  switch (item.sourceType) {
    case 'VISIT_DOCUMENTATION_RECORD':
      return 'Visit documentation review';
    case 'EVV_EXCEPTION_RECORD':
      return 'EVV exception review';
    case 'MISSED_VISIT_RECORD':
      return 'Missed visit review';
    case 'MOBILE_EXECUTION_SESSION':
      return 'Mobile execution review';
    default:
      return formatTokenLabel(item.sourceType);
  }
}

function contextSummary(item: ReviewWorkItemSummary) {
  const parts: string[] = [];

  if (item.patientId) {
    parts.push('Patient-linked');
  }
  if (item.visitOccurrenceId) {
    parts.push('Visit-linked');
  }
  if (item.documentationRecordId) {
    parts.push('Documentation-backed');
  }
  if (item.exceptionDriven) {
    parts.push('Exception-driven');
  }

  return parts.length > 0 ? parts.join(' · ') : 'General review context';
}

function queueStatusTone(status: ReviewLifecycleStatus): 'default' | 'warning' | 'success' {
  if (status === 'RETURNED_FOR_FIX' || status === 'REJECTED' || status === 'SIGNOFF_REQUESTED') {
    return 'warning';
  }
  if (status === 'APPROVED' || status === 'SIGNOFF_COMPLETED' || status === 'RESUBMITTED') {
    return 'success';
  }
  return 'default';
}

function reviewItemLinks(
  item: ReviewWorkItemSummary,
  canViewPatients: boolean,
  canViewDocumentation: boolean,
  canViewEvv: boolean,
) {
  const links: Array<{ to: string; label: string }> = [];

  if (item.patientId && canViewPatients) {
    links.push({ to: `/app/patients/${item.patientId}`, label: 'Open patient context' });
  }
  if (item.documentationRecordId && canViewDocumentation) {
    links.push({
      to: `/app/documentation/records/${item.documentationRecordId}/printable`,
      label: 'Open printable summary',
    });
  } else if (item.visitOccurrenceId && canViewDocumentation) {
    links.push({
      to: `/app/documentation/visits/${item.visitOccurrenceId}`,
      label: 'Open visit documentation',
    });
  }
  if (canViewEvv) {
    links.push({ to: '/app/admin/evv-issues', label: 'Open EVV issues' });
  }

  return links;
}

type AssignmentFormState = {
  reviewerMembershipId: string;
  assignmentNote: string;
};

type DecisionFormState = {
  decisionType: ReviewDecisionType;
  reasonCode: string;
  reviewerNotes: string;
  returnReason: string;
  requiredCorrections: string;
};

type SignoffFormState = {
  requestedFromMembershipId: string;
  requestedFromRole: AgencyRole | '';
  signoffNote: string;
  completionApproved: boolean;
  completionNote: string;
};

const REVIEW_ELIGIBLE_ROLES: AgencyRole[] = [
  'AGENCY_OWNER',
  'BRANCH_ADMIN',
  'QA_CLINICAL_REVIEWER',
];

const REVIEW_ROLE_OPTIONS: AgencyRole[] = [
  'AGENCY_OWNER',
  'BRANCH_ADMIN',
  'QA_CLINICAL_REVIEWER',
];

function createDecisionFormState(): DecisionFormState {
  return {
    decisionType: 'APPROVE',
    reasonCode: '',
    reviewerNotes: '',
    returnReason: '',
    requiredCorrections: '',
  };
}

function createAssignmentFormState(): AssignmentFormState {
  return {
    reviewerMembershipId: '',
    assignmentNote: '',
  };
}

function createSignoffFormState(): SignoffFormState {
  return {
    requestedFromMembershipId: '',
    requestedFromRole: '',
    signoffNote: '',
    completionApproved: true,
    completionNote: '',
  };
}

export function ReviewWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const { workItemId } = useParams<{ workItemId?: string }>();

  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [exceptionQueue, setExceptionQueue] = useState<ReviewExceptionQueueItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ReviewWorkItemDetail | null>(null);
  const [completeness, setCompleteness] = useState<ReviewCompletenessEvaluation | null>(null);
  const [history, setHistory] = useState<ReviewHistory | null>(null);
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [queueStatusFilter, setQueueStatusFilter] = useState<ReviewLifecycleStatus | 'ALL'>('ALL');
  const [queueSourceFilter, setQueueSourceFilter] = useState<ReviewSourceType | 'ALL'>('ALL');
  const [exceptionSeverityFilter, setExceptionSeverityFilter] = useState<ReviewFindingSeverity | 'ALL'>('ALL');
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<ReviewExceptionType | 'ALL'>('ALL');
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(createAssignmentFormState());
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>(createDecisionFormState());
  const [signoffForm, setSignoffForm] = useState<SignoffFormState>(createSignoffFormState());
  const [mutationState, setMutationState] = useState<'idle' | 'saving' | 'saved' | 'retry'>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Review refresh, reassignment release, and resubmission visibility share one pending, success, and retry pattern.',
  );

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const onExceptionRoute = location.pathname.includes('/review/exceptions');
  const onResubmissionRoute = location.pathname.endsWith('/resubmission');
  const onAssignmentRoute = location.pathname.endsWith('/assignment');
  const canViewWorkspace = canAccessPermission(profile, 'view_review_workspace');
  const canViewExceptionQueue = canAccessPermission(profile, 'view_review_exception_queue');
  const canAssignWork = canAccessPermission(profile, 'assign_review_work');
  const canPerformDecisions = canAccessPermission(profile, 'perform_review_decisions');
  const canRequestSignoff = canAccessPermission(profile, 'request_review_signoff');
  const canViewAuditContext = canAccessPermission(profile, 'view_review_audit_context');
  const canViewPatients = canAccessPermission(profile, 'view_patient_workspace');
  const canViewDocumentation = canAccessPermission(profile, 'view_visit_documentation');
  const canViewEvv = canAccessPermission(profile, 'view_evv_issue_workspace');
  const eligibleReviewers = useMemo(
    () =>
      directory.filter(
        (entry) =>
          entry.userStatus === 'ACTIVE' && REVIEW_ELIGIBLE_ROLES.includes(entry.role),
      ),
    [directory],
  );
  const filteredQueue = useMemo(
    () =>
      queue.filter((item) => {
        if (queueStatusFilter !== 'ALL' && item.workItem.status !== queueStatusFilter) {
          return false;
        }
        if (queueSourceFilter !== 'ALL' && item.workItem.sourceType !== queueSourceFilter) {
          return false;
        }
        return true;
      }),
    [queue, queueSourceFilter, queueStatusFilter],
  );
  const filteredExceptionQueue = useMemo(
    () =>
      exceptionQueue.filter((item) => {
        const leadException = item.exceptions[0];
        if (
          exceptionSeverityFilter !== 'ALL' &&
          leadException &&
          leadException.severity !== exceptionSeverityFilter
        ) {
          return false;
        }
        if (exceptionTypeFilter !== 'ALL' && leadException && leadException.exceptionType !== exceptionTypeFilter) {
          return false;
        }
        return true;
      }),
    [exceptionQueue, exceptionSeverityFilter, exceptionTypeFilter],
  );
  const pendingSignoffRequest = selectedDetail?.signoffRequests.find((request) => request.status === 'PENDING') ?? null;

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const [queueResponse, exceptionResponse, directoryResponse] = await Promise.all([
          fetchReviewQueue({ ...authContext, page: 0, size: 6 }),
          fetchReviewExceptionQueue({ ...authContext, page: 0, size: 6 }),
          fetchUserDirectory({ ...authContext, page: 0, size: 100 }),
        ]);
        setQueue(queueResponse.content);
        setExceptionQueue(exceptionResponse.content);
        setDirectory(directoryResponse.content);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the review workspace right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWorkspace();
  }, [authContext, canViewWorkspace, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace || !workItemId) {
      setSelectedDetail(null);
      setCompleteness(null);
      setHistory(null);
      setDetailError(null);
      return;
    }
    const selectedWorkItemId = workItemId;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const [detailResponse, completenessResponse, historyResponse] = await Promise.all([
          fetchReviewWorkItemDetail({ ...authContext, workItemId: selectedWorkItemId }),
          fetchReviewCompleteness({ ...authContext, workItemId: selectedWorkItemId }),
          fetchReviewHistory({ ...authContext, workItemId: selectedWorkItemId }),
        ]);
        setSelectedDetail(detailResponse);
        setCompleteness(completenessResponse);
        setHistory(historyResponse);
      } catch (requestError) {
        setDetailError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the selected review item right now.',
        );
      } finally {
        setDetailLoading(false);
      }
    }

    void loadDetail();
  }, [authContext, canViewWorkspace, state.status, workItemId]);

  useEffect(() => {
    setDecisionForm(createDecisionFormState());
    setSignoffForm(createSignoffFormState());
    setAssignmentForm({
      reviewerMembershipId:
        selectedDetail?.activeAssignment?.reviewerMembershipId ??
        eligibleReviewers[0]?.membershipId ??
        '',
      assignmentNote: selectedDetail?.activeAssignment?.assignmentNote ?? '',
    });
  }, [eligibleReviewers, selectedDetail]);

  async function refreshDetail(nextDetail?: ReviewWorkItemDetail | null) {
    if (!workItemId) {
      return;
    }

    const [detailResponse, completenessResponse, historyResponse, queueResponse, exceptionResponse] =
      await Promise.all([
        nextDetail
          ? Promise.resolve(nextDetail)
          : fetchReviewWorkItemDetail({ ...authContext, workItemId }),
        fetchReviewCompleteness({ ...authContext, workItemId }),
        fetchReviewHistory({ ...authContext, workItemId }),
        fetchReviewQueue({ ...authContext, page: 0, size: 6 }),
        fetchReviewExceptionQueue({ ...authContext, page: 0, size: 6 }),
      ]);

    setSelectedDetail(detailResponse);
    setCompleteness(completenessResponse);
    setHistory(historyResponse);
    setQueue(queueResponse.content);
    setExceptionQueue(exceptionResponse.content);
  }

  async function handleRecalculate() {
    if (!workItemId) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Recalculating completeness so the queue, findings, and missing-field summary refresh together.');
    try {
      const recalculated = await recalculateReviewCompleteness({ ...authContext, workItemId });
      setCompleteness(recalculated);
      await refreshDetail();
      setMutationState('saved');
      setMutationMessage('Completeness was recalculated and the review detail refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Completeness recalculation failed. Retry when the record is available again.',
      );
    }
  }

  async function handleReleaseAssignment() {
    if (!workItemId || !selectedDetail?.activeAssignment) {
      return;
    }
    if (!window.confirm('Release the active reviewer assignment for this work item?')) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Releasing the active assignment and refreshing the queue detail.');
    try {
      const nextDetail = await releaseActiveReviewAssignment({ ...authContext, workItemId });
      await refreshDetail(nextDetail);
      setMutationState('saved');
      setMutationMessage('The active review assignment was released and the queue refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Assignment release failed. Retry when reviewer ownership can be updated safely.',
      );
    }
  }

  async function handleMarkResubmitted() {
    if (!workItemId) {
      return;
    }
    if (!window.confirm('Mark this returned work item as resubmitted?')) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Marking the work item as resubmitted and refreshing queue state.');
    try {
      const nextDetail = await markReviewWorkItemResubmitted({ ...authContext, workItemId });
      await refreshDetail(nextDetail);
      setMutationState('saved');
      setMutationMessage('The work item is now marked as resubmitted and the review state refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Resubmission update failed. Retry after the source record is ready again.',
      );
    }
  }

  async function handleAssignReviewer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workItemId || !assignmentForm.reviewerMembershipId) {
      setMutationState('retry');
      setMutationMessage('Select an eligible reviewer before saving assignment changes.');
      return;
    }

    setMutationState('saving');
    setMutationMessage('Saving the active reviewer assignment and refreshing queue ownership.');
    try {
      const nextDetail = await assignReviewWorkItem({
        ...authContext,
        workItemId,
        reviewerMembershipId: assignmentForm.reviewerMembershipId,
        assignmentNote: assignmentForm.assignmentNote,
      });
      await refreshDetail(nextDetail);
      setMutationState('saved');
      setMutationMessage('The reviewer assignment was saved and the queue ownership refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Reviewer assignment failed. Retry when the work item is available again.',
      );
    }
  }

  async function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workItemId) {
      return;
    }
    if (
      decisionForm.decisionType === 'RETURN_FOR_FIX' &&
      decisionForm.returnReason.trim().length === 0
    ) {
      setMutationState('retry');
      setMutationMessage('Return-for-fix requires a visible reason so the correction loop is understandable.');
      return;
    }
    if (
      (decisionForm.decisionType === 'REJECT' || decisionForm.decisionType === 'RETURN_FOR_FIX') &&
      !window.confirm(`Confirm ${formatTokenLabel(decisionForm.decisionType)} for this review item?`)
    ) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Recording the review decision and refreshing queue/detail state.');
    try {
      const nextDetail = await recordReviewDecision({
        ...authContext,
        workItemId,
        decisionType: decisionForm.decisionType,
        reasonCode: decisionForm.reasonCode,
        reviewerNotes: decisionForm.reviewerNotes,
        returnReason: decisionForm.returnReason,
        requiredCorrections: decisionForm.requiredCorrections,
      });
      await refreshDetail(nextDetail);
      setDecisionForm(createDecisionFormState());
      setMutationState('saved');
      setMutationMessage('The review decision was recorded and the queue/detail state refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Review decision failed. Retry when the record lifecycle is ready for the requested action.',
      );
    }
  }

  async function handleSignoffRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workItemId) {
      return;
    }
    if (
      signoffForm.requestedFromMembershipId.trim().length === 0 &&
      signoffForm.requestedFromRole === ''
    ) {
      setMutationState('retry');
      setMutationMessage('Choose a reviewer target or review role before requesting signoff.');
      return;
    }

    setMutationState('saving');
    setMutationMessage('Creating the signoff request and refreshing the active review detail.');
    try {
      const nextDetail = await requestReviewSignoff({
        ...authContext,
        workItemId,
        requestedFromMembershipId: signoffForm.requestedFromMembershipId || undefined,
        requestedFromRole:
          signoffForm.requestedFromMembershipId.trim().length === 0
            ? signoffForm.requestedFromRole || undefined
            : undefined,
        signoffNote: signoffForm.signoffNote,
      });
      await refreshDetail(nextDetail);
      setSignoffForm(createSignoffFormState());
      setMutationState('saved');
      setMutationMessage('The signoff request was created and the current review detail refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Signoff request failed. Retry when the work item can be escalated safely.',
      );
    }
  }

  async function handleSignoffCompletion(approved: boolean) {
    if (!workItemId || !pendingSignoffRequest) {
      return;
    }
    if (!window.confirm(`Confirm ${approved ? 'approved' : 'declined'} signoff completion for this work item?`)) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Completing the signoff request and refreshing review state.');
    try {
      const nextDetail = await completeReviewSignoff({
        ...authContext,
        workItemId,
        approved,
        signoffNote: signoffForm.completionNote,
      });
      await refreshDetail(nextDetail);
      setSignoffForm((current) => ({ ...current, completionNote: '', completionApproved: true }));
      setMutationState('saved');
      setMutationMessage('The signoff request was completed and the review state refreshed.');
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Signoff completion failed. Retry when the pending signoff request is still active.',
      );
    }
  }

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Stories FE10-01 · FE10-09 · FE10-10"
          title="Review workspace is not available for this role."
          message="Epic 10 review routes respect backend workspace and review-specific permissions."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  if (onExceptionRoute && !canViewExceptionQueue) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE10-01"
          title="Exception queue is not available for this role."
          message="Open exception-driven review work is permission-gated separately from the general review queue."
          primaryLabel="Open review workspace"
          primaryLink="/app/review"
        />
      </div>
    );
  }

  const linkedRoutes = selectedDetail
    ? reviewItemLinks(
        selectedDetail.workItem,
        canViewPatients,
        canViewDocumentation,
        canViewEvv,
      )
    : [];
  const auditLinks = [
    { to: reviewAuditHref('EPIC10_REVIEW_DECISION_RECORDED'), label: 'Review decision audit activity' },
    { to: reviewAuditHref('EPIC10_REVIEW_WORK_ITEM_ASSIGNED'), label: 'Assignment audit activity' },
    { to: reviewAuditHref('EPIC10_REVIEW_SIGNOFF_REQUESTED'), label: 'Signoff audit activity' },
    { to: reviewAuditHref('EPIC10_REVIEW_COMPLETENESS_RECALCULATED'), label: 'Completeness audit activity' },
  ];

  return (
    <ReviewWorkspaceShell
      eyebrow="Frontend Stories FE10-01 · FE10-09 · FE10-10"
      title="Review workspace"
      description="Epic 10 review routes now share one queue-and-detail shell so coordinators and reviewers can move between queue visibility, exception-driven work, assignment context, and returned-for-fix resubmission status without leaving the workspace."
    >
      <ReviewSectionNavigation
        links={[
          { path: '/app/review', label: 'Review queue', state: 'available' },
          {
            path: '/app/review/exceptions',
            label: 'Exception queue',
            state: canViewExceptionQueue ? 'available' : 'restricted',
          },
          {
            path: workItemId ? `/app/review/items/${workItemId}` : '/app/review',
            label: 'Detail',
            state: workItemId ? 'available' : 'read-only',
          },
          {
            path: workItemId ? `/app/review/items/${workItemId}/resubmission` : '/app/review',
            label: 'Resubmission',
            state: workItemId ? 'available' : 'read-only',
          },
          {
            path: workItemId ? `/app/review/items/${workItemId}/assignment` : '/app/review',
            label: 'Assignment',
            state: workItemId ? 'available' : 'read-only',
          },
        ]}
      />

      <ReviewWorkspaceGrid>
        <ReviewPanel
          title="Shared route model"
          description="The review workspace keeps queue, exception, detail, resubmission, and assignment routes inside one reusable foundation instead of scattering QA work across unrelated modules."
        >
          <ReviewWorkspaceCards
            cards={[
              {
                path: '/app/review',
                label: 'Review queue',
                description: 'Primary Epic 10 work queue with branch-aware review entry points.',
                state: 'available',
              },
              {
                path: '/app/review/exceptions',
                label: 'Exception queue',
                description: 'Focused exception-driven review route for open blockers and carryover issues.',
                state: canViewExceptionQueue ? 'available' : 'restricted',
              },
              {
                path: selectedDetail ? `/app/review/items/${selectedDetail.workItem.id}` : '/app/review',
                label: 'Review detail',
                description: 'Detail route with findings, completeness, assignment context, and review history.',
                state: selectedDetail ? 'available' : 'read-only',
              },
            ]}
          />
        </ReviewPanel>

        <ReviewPanel
          title="Live backend status"
          description="The review workspace uses the real Epic 10 review APIs so queue counts, detail state, and workflow visibility come from the server rather than placeholder local data."
        >
          {loading ? <p className="session-note">Loading review workspace...</p> : null}
          {error ? (
            <ReviewModuleState title="Workspace load failed" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="review-summary-grid">
              <ReviewStatusBanner
                status={`${queue.length} queued item${queue.length === 1 ? '' : 's'}`}
                summary="Recent review work loaded from the Epic 10 queue API."
              />
              <ReviewStatusBanner
                status={`${exceptionQueue.length} exception item${exceptionQueue.length === 1 ? '' : 's'}`}
                summary="Exception-driven work loaded from the Epic 10 exception queue API."
                tone={canViewExceptionQueue ? 'warning' : 'readonly'}
              />
              <ReviewStatusBanner
                status={selectedDetail ? formatTokenLabel(selectedDetail.workItem.status) : 'No detail route'}
                summary={
                  selectedDetail
                    ? 'The selected review detail is loaded from the backend detail, completeness, and history APIs.'
                    : 'Open a review item to load detail, completeness, history, and mutation context.'
                }
                tone={selectedDetail ? 'success' : 'info'}
              />
            </div>
          ) : null}
        </ReviewPanel>

        <ReviewPanel
          title="Controlled review handling"
          description="Review mutations are sensitive operational actions, so the workspace keeps context minimal and makes audit visibility explicit only where it helps."
        >
          <ReviewModuleState
            title="Privacy-aware triage"
            description="Queue rows intentionally avoid exposing raw patient, visit, and documentation identifiers. Reviewers get enough context to route into the correct patient, documentation, EVV, or messaging screen only when they already have access."
            variant="info"
          />
          {canViewAuditContext ? (
            <div className="review-link-row">
              {auditLinks.map((link) => (
                <Link className="text-link" key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </ReviewPanel>

        <ReviewPanel
          title={onExceptionRoute ? 'Exception queue' : 'Review queue'}
          description={
            onExceptionRoute
              ? 'Exception-driven items stay visible on a focused route with open exception counts and review state.'
              : 'Queue cards expose source, reviewer ownership, and finding counts before the detailed review workflow opens.'
          }
        >
          <div className="review-filter-toolbar">
            {!onExceptionRoute ? (
              <>
                <label>
                  <span>Status</span>
                  <select
                    className="select"
                    value={queueStatusFilter}
                    onChange={(event) => setQueueStatusFilter(event.target.value as ReviewLifecycleStatus | 'ALL')}
                  >
                    <option value="ALL">All statuses</option>
                    <option value="PENDING_REVIEW">Pending review</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_REVIEW">In review</option>
                    <option value="RETURNED_FOR_FIX">Returned for fix</option>
                    <option value="RESUBMITTED">Resubmitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SIGNOFF_REQUESTED">Signoff requested</option>
                    <option value="SIGNOFF_COMPLETED">Signoff completed</option>
                  </select>
                </label>
                <label>
                  <span>Source</span>
                  <select
                    className="select"
                    value={queueSourceFilter}
                    onChange={(event) => setQueueSourceFilter(event.target.value as ReviewSourceType | 'ALL')}
                  >
                    <option value="ALL">All sources</option>
                    <option value="VISIT_DOCUMENTATION_RECORD">Visit documentation</option>
                    <option value="EVV_EXCEPTION_RECORD">EVV exception</option>
                    <option value="MISSED_VISIT_RECORD">Missed visit</option>
                    <option value="MOBILE_EXECUTION_SESSION">Mobile execution</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Severity</span>
                  <select
                    className="select"
                    value={exceptionSeverityFilter}
                    onChange={(event) =>
                      setExceptionSeverityFilter(event.target.value as ReviewFindingSeverity | 'ALL')
                    }
                  >
                    <option value="ALL">All severities</option>
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>
                <label>
                  <span>Exception type</span>
                  <select
                    className="select"
                    value={exceptionTypeFilter}
                    onChange={(event) =>
                      setExceptionTypeFilter(event.target.value as ReviewExceptionType | 'ALL')
                    }
                  >
                    <option value="ALL">All exception types</option>
                    <option value="MISSING_SIGNATURE">Missing signature</option>
                    <option value="MISSING_REQUIRED_DOCUMENTATION">Missing required documentation</option>
                    <option value="EVV_EXCEPTION_CARRYOVER">EVV carryover</option>
                    <option value="RETURNED_WITH_OPEN_FINDING">Returned with open finding</option>
                    <option value="REVIEWER_ESCALATION">Reviewer escalation</option>
                  </select>
                </label>
              </>
            )}
          </div>

          {!loading && !error && (onExceptionRoute ? filteredExceptionQueue.length === 0 : filteredQueue.length === 0) ? (
            <ReviewModuleState
              title="No review work in this queue"
              description="The queue route stays stable even when there are no active review items yet."
              variant="empty"
            />
          ) : null}
          {onExceptionRoute ? (
            <ReviewQueueList
              items={filteredExceptionQueue.map((item) => ({
                id: item.workItem.workItem.id,
                path: `/app/review/items/${item.workItem.workItem.id}`,
                title: reviewItemTitle(item.workItem.workItem),
                subtitle: [
                  item.exceptions.map((entry) => formatTokenLabel(entry.exceptionType)).join(' · '),
                  membershipLabel(directory, item.workItem.activeAssignment?.reviewerMembershipId),
                  contextSummary(item.workItem.workItem),
                ]
                  .filter(Boolean)
                  .join(' · '),
                meta: [
                  `Priority ${formatTokenLabel(item.workItem.workItem.priority)}`,
                  `Due ${formatDateTime(item.workItem.workItem.dueAt)}`,
                ],
                status: formatTokenLabel(item.workItem.workItem.status),
                statusTone: queueStatusTone(item.workItem.workItem.status),
                counts: [
                  `${item.exceptions.length} exception${item.exceptions.length === 1 ? '' : 's'}`,
                  item.exceptions[0] ? `Severity ${formatTokenLabel(item.exceptions[0].severity)}` : 'No severity',
                ],
              }))}
            />
          ) : (
            <ReviewQueueList
              items={filteredQueue.map((item) => ({
                id: item.workItem.id,
                path: `/app/review/items/${item.workItem.id}`,
                title: reviewItemTitle(item.workItem),
                subtitle: [
                  membershipLabel(directory, item.activeAssignment?.reviewerMembershipId),
                  contextSummary(item.workItem),
                ]
                  .filter(Boolean)
                  .join(' · '),
                meta: [
                  `Priority ${formatTokenLabel(item.workItem.priority)}`,
                  `Entered ${formatDateTime(item.workItem.enteredQueueAt)}`,
                  `Due ${formatDateTime(item.workItem.dueAt)}`,
                ],
                status: formatTokenLabel(item.workItem.status),
                statusTone: queueStatusTone(item.workItem.status),
                counts: [
                  `${item.failCount} fail`,
                  `${item.warningCount} warning`,
                  `${item.openExceptionCount} open exception`,
                ],
              }))}
            />
          )}
        </ReviewPanel>

        <ReviewPanel
          title="Review detail"
          description="Detail routes share the same source-context summary, findings list, assignment panel, and mutation notices so return-for-fix and reviewer workflows stay predictable."
        >
          {detailLoading ? <p className="session-note">Loading review detail...</p> : null}
          {detailError ? (
            <ReviewModuleState title="Review detail failed" description={detailError} variant="error" />
          ) : null}
          {!detailLoading && !selectedDetail && !detailError ? (
            <ReviewModuleState
              title="No review item selected"
              description="Choose a review queue item to open completeness, history, assignment, and resubmission context."
              variant="readonly"
            />
          ) : null}
          {selectedDetail ? (
            <div className="review-detail-stack">
              <ReviewMutationNotice state={mutationState} message={mutationMessage} />
              <ReviewModuleState
                title="Controlled review operations"
                description="Assignments, decisions, resubmissions, and signoff actions are logged backend operations. This detail view keeps only the minimum source context needed for reviewer triage and action."
                variant="info"
              />
              {selectedDetail.workItem.status === 'RETURNED_FOR_FIX' ? (
                <ReviewStatusBanner
                  status="Returned for fix"
                  summary="This work item is in an active correction loop. Prior return guidance stays visible below until the source is resubmitted."
                  tone="warning"
                />
              ) : null}
              {selectedDetail.workItem.status === 'RESUBMITTED' ? (
                <ReviewStatusBanner
                  status="Resubmitted"
                  summary="This work item has been returned and resubmitted. Review history below preserves the prior return reason."
                  tone="success"
                />
              ) : null}
              <ReviewSourceContextSummary
                rows={[
                  { label: 'Source', value: formatTokenLabel(selectedDetail.workItem.sourceType) },
                  { label: 'Status', value: formatTokenLabel(selectedDetail.workItem.status) },
                  { label: 'Priority', value: formatTokenLabel(selectedDetail.workItem.priority) },
                  {
                    label: 'Active reviewer',
                    value: membershipLabel(directory, selectedDetail.activeAssignment?.reviewerMembershipId),
                  },
                  {
                    label: 'Findings',
                    value: completeness
                      ? `${completeness.result.failCount} fail · ${completeness.result.warningCount} warning`
                      : 'Not available',
                  },
                  {
                    label: 'Entered queue',
                    value: formatDateTime(selectedDetail.workItem.enteredQueueAt),
                  },
                ]}
              />

              {linkedRoutes.length > 0 ? (
                <div className="review-link-row">
                  {linkedRoutes.map((link) => (
                    <Link className="text-link" key={link.to} to={link.to}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              {completeness ? (
                <div className="review-summary-grid">
                  <ReviewStatusBanner
                    status={`${completeness.result.passCount} pass`}
                    summary="Checks already satisfied in the latest completeness run."
                    tone="success"
                  />
                  <ReviewStatusBanner
                    status={`${completeness.result.warningCount} warning`}
                    summary="Warnings surfaced by the latest completeness run."
                    tone="warning"
                  />
                  <ReviewStatusBanner
                    status={`${completeness.result.failCount} fail`}
                    summary="Blocking findings surfaced by the latest completeness run."
                    tone={completeness.result.failCount > 0 ? 'warning' : 'readonly'}
                  />
                </div>
              ) : null}

              <div className="review-action-row">
                <button className="button secondary" onClick={() => void handleRecalculate()} type="button">
                  Recalculate completeness
                </button>
                {selectedDetail.activeAssignment && canAssignWork ? (
                  <button className="button ghost" onClick={() => void handleReleaseAssignment()} type="button">
                    Release assignment
                  </button>
                ) : null}
                {selectedDetail.workItem.status === 'RETURNED_FOR_FIX' && canPerformDecisions ? (
                  <button className="button" onClick={() => void handleMarkResubmitted()} type="button">
                    Mark resubmitted
                  </button>
                ) : null}
              </div>

              <ReviewPanel
                title="Reviewer assignment"
                description="Assignment, reassignment, and release actions stay on the detail route so ownership changes are visible before a decision is recorded."
              >
                <form className="review-form-grid" onSubmit={(event) => void handleAssignReviewer(event)}>
                  <label>
                    <span>Reviewer</span>
                    <select
                      className="select"
                      value={assignmentForm.reviewerMembershipId}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          reviewerMembershipId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select reviewer</option>
                      {eligibleReviewers.map((entry) => (
                        <option key={entry.membershipId} value={entry.membershipId}>
                          {entry.firstName} {entry.lastName} · {formatTokenLabel(entry.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="review-field-block">
                    <span>Assignment note</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={assignmentForm.assignmentNote}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          assignmentNote: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="review-action-row">
                    <button className="button" disabled={!canAssignWork} type="submit">
                      {selectedDetail.activeAssignment ? 'Reassign work item' : 'Assign work item'}
                    </button>
                    {!canAssignWork ? (
                      <span className="session-note">Assignment changes require review assignment permission.</span>
                    ) : null}
                  </div>
                </form>
              </ReviewPanel>

              <ReviewFindingList
                title="Latest findings"
                emptyLabel="No review findings are attached to the latest completeness run."
                items={selectedDetail.latestFindings.map((item) => ({
                  id: item.id,
                  headline: `${formatTokenLabel(item.findingKind)} · ${item.ruleCode}`,
                  detail: item.explanation,
                  severity: formatTokenLabel(item.severity),
                }))}
              />

              <ReviewFindingList
                title="Missing fields"
                emptyLabel="No missing-field results are attached to the latest completeness run."
                items={selectedDetail.latestMissingFieldResults.map((item) => ({
                  id: item.id,
                  headline: item.logicalSection ?? item.ruleCode,
                  detail: item.explanation,
                  severity: formatTokenLabel(item.severity),
                }))}
              />

              {selectedDetail.exceptions.length > 0 ? (
                <ReviewFindingList
                  title="Open exceptions"
                  emptyLabel="No review exceptions are attached to this work item."
                  items={selectedDetail.exceptions.map((item) => ({
                    id: item.id,
                    headline: formatTokenLabel(item.exceptionType),
                    detail: item.resolutionNote ?? `Detected at ${formatDateTime(item.detectedAt)}`,
                    severity: formatTokenLabel(item.severity),
                  }))}
                />
              ) : null}

              {onAssignmentRoute ? (
                <ReviewModuleState
                  title="Assignment view"
                  description={
                    selectedDetail.activeAssignment
                      ? `Assigned at ${formatDateTime(selectedDetail.activeAssignment.assignedAt)} by ${membershipLabel(directory, selectedDetail.activeAssignment.assignedByMembershipId)}.`
                      : 'No active assignment is present for this work item.'
                  }
                  variant={selectedDetail.activeAssignment ? 'info' : 'readonly'}
                />
              ) : null}

              {onResubmissionRoute ? (
                <ReviewModuleState
                  title="Resubmission view"
                  description={
                    history?.returnForFixEvents[0]
                      ? `Returned at ${formatDateTime(history.returnForFixEvents[0].returnedAt)} and resubmitted at ${formatDateTime(history.returnForFixEvents[0].resubmittedAt)}.`
                      : 'No returned-for-fix history exists for this work item yet.'
                  }
                  variant={history?.returnForFixEvents[0] ? 'info' : 'readonly'}
                />
              ) : null}

              <ReviewPanel
                title="Review decision"
                description="Approve, reject, and return-for-fix flows use the same backend decision contract so lifecycle errors stay controlled and visible."
              >
                <form className="review-form-grid" onSubmit={(event) => void handleDecisionSubmit(event)}>
                  <label>
                    <span>Decision</span>
                    <select
                      className="select"
                      value={decisionForm.decisionType}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          decisionType: event.target.value as ReviewDecisionType,
                        }))
                      }
                    >
                      <option value="APPROVE">Approve</option>
                      <option value="REJECT">Reject</option>
                      <option value="RETURN_FOR_FIX">Return for fix</option>
                      <option value="REQUEST_SIGNOFF">Request signoff</option>
                    </select>
                  </label>
                  <label>
                    <span>Reason code</span>
                    <input
                      className="input"
                      value={decisionForm.reasonCode}
                      onChange={(event) =>
                        setDecisionForm((current) => ({ ...current, reasonCode: event.target.value }))
                      }
                      type="text"
                    />
                  </label>
                  <label className="review-field-block">
                    <span>Reviewer notes</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={decisionForm.reviewerNotes}
                      onChange={(event) =>
                        setDecisionForm((current) => ({ ...current, reviewerNotes: event.target.value }))
                      }
                    />
                  </label>
                  {decisionForm.decisionType === 'RETURN_FOR_FIX' ? (
                    <>
                      <label>
                        <span>Return reason</span>
                        <input
                          className="input"
                          value={decisionForm.returnReason}
                          onChange={(event) =>
                            setDecisionForm((current) => ({ ...current, returnReason: event.target.value }))
                          }
                          type="text"
                        />
                      </label>
                      <label className="review-field-block">
                        <span>Correction guidance</span>
                        <textarea
                          className="input"
                          rows={3}
                          value={decisionForm.requiredCorrections}
                          onChange={(event) =>
                            setDecisionForm((current) => ({
                              ...current,
                              requiredCorrections: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : null}
                  <div className="review-action-row">
                    <button className="button" disabled={!canPerformDecisions} type="submit">
                      Save review decision
                    </button>
                    {!canPerformDecisions ? (
                      <span className="session-note">Decision actions require review decision permission.</span>
                    ) : null}
                  </div>
                </form>
              </ReviewPanel>

              <ReviewPanel
                title="Signoff workflow"
                description="Signoff requests and completion stay visible on the detail route so escalated review context does not detach from ownership and history."
              >
                <form className="review-form-grid" onSubmit={(event) => void handleSignoffRequest(event)}>
                  <label>
                    <span>Requested reviewer</span>
                    <select
                      className="select"
                      value={signoffForm.requestedFromMembershipId}
                      onChange={(event) =>
                        setSignoffForm((current) => ({
                          ...current,
                          requestedFromMembershipId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select reviewer</option>
                      {eligibleReviewers.map((entry) => (
                        <option key={entry.membershipId} value={entry.membershipId}>
                          {entry.firstName} {entry.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Or request by role</span>
                    <select
                      className="select"
                      value={signoffForm.requestedFromRole}
                      onChange={(event) =>
                        setSignoffForm((current) => ({
                          ...current,
                          requestedFromRole: event.target.value as AgencyRole | '',
                        }))
                      }
                    >
                      <option value="">No role override</option>
                      {REVIEW_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {formatTokenLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="review-field-block">
                    <span>Request note</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={signoffForm.signoffNote}
                      onChange={(event) =>
                        setSignoffForm((current) => ({ ...current, signoffNote: event.target.value }))
                      }
                    />
                  </label>
                  <div className="review-action-row">
                    <button className="button" disabled={!canRequestSignoff} type="submit">
                      Request signoff
                    </button>
                    {!canRequestSignoff ? (
                      <span className="session-note">Signoff requests require signoff permission.</span>
                    ) : null}
                  </div>
                </form>

                <ReviewModuleState
                  title="Current signoff status"
                  description={
                    pendingSignoffRequest
                      ? `Pending with ${membershipLabel(directory, pendingSignoffRequest.requestedFromMembershipId)} since ${formatDateTime(pendingSignoffRequest.requestedAt)}.`
                      : selectedDetail.signoffRequests.length > 0
                        ? `Latest status: ${formatTokenLabel(selectedDetail.signoffRequests[0].status)}.`
                        : 'No signoff request has been created for this work item yet.'
                  }
                  variant={pendingSignoffRequest ? 'info' : 'readonly'}
                />

                {pendingSignoffRequest ? (
                  <>
                    <label className="review-field-block">
                      <span>Completion note</span>
                      <textarea
                        className="input"
                        rows={3}
                        value={signoffForm.completionNote}
                        onChange={(event) =>
                          setSignoffForm((current) => ({ ...current, completionNote: event.target.value }))
                        }
                      />
                    </label>
                    <div className="review-action-row">
                      <button
                        className="button"
                        disabled={!canRequestSignoff}
                        onClick={() => void handleSignoffCompletion(true)}
                        type="button"
                      >
                        Complete signoff
                      </button>
                      <button
                        className="button ghost"
                        disabled={!canRequestSignoff}
                        onClick={() => void handleSignoffCompletion(false)}
                        type="button"
                      >
                        Decline signoff
                      </button>
                    </div>
                  </>
                ) : null}
              </ReviewPanel>

              <ReviewPanel
                title="Review history"
                description="History stays visible on the detail route so reviewers can see assignments, return-for-fix activity, signoff requests, and audit-backed source changes."
              >
                <div className="review-history-list">
                  <div className="review-history-row">
                    <strong>Decisions</strong>
                    <span>{selectedDetail.decisions.length}</span>
                  </div>
                  <div className="review-history-row">
                    <strong>Assignments</strong>
                    <span>{history?.assignments.length ?? 0}</span>
                  </div>
                  <div className="review-history-row">
                    <strong>Return for fix</strong>
                    <span>{history?.returnForFixEvents.length ?? 0}</span>
                  </div>
                  <div className="review-history-row">
                    <strong>Signoff requests</strong>
                    <span>{selectedDetail.signoffRequests.length}</span>
                  </div>
                </div>
                {canViewAuditContext ? (
                  <div className="review-link-row">
                    {auditLinks
                      .filter((link) => canRequestSignoff || !link.label.startsWith('Signoff'))
                      .map((link) => (
                        <Link className="text-link" key={link.to} to={link.to}>
                          {link.label}
                        </Link>
                      ))}
                  </div>
                ) : null}
              </ReviewPanel>
            </div>
          ) : null}
        </ReviewPanel>
      </ReviewWorkspaceGrid>
    </ReviewWorkspaceShell>
  );
}
