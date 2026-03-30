import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchReviewExceptionQueue,
  fetchReviewQueue,
  type ReviewExceptionQueueItem,
  type ReviewQueueItem,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ReviewModuleState,
  ReviewPanel,
  ReviewStatusBanner,
  ReviewWorkspaceGrid,
  ReviewWorkspaceShell,
} from '../components/ReviewWorkspaceFoundation';

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

function isOverdue(item: ReviewQueueItem) {
  if (!item.workItem.dueAt) {
    return false;
  }
  return new Date(item.workItem.dueAt).getTime() < Date.now();
}

export function ReviewCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [exceptionQueue, setExceptionQueue] = useState<ReviewExceptionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const canViewWorkspace = canAccessPermission(profile, 'view_review_workspace');
  const canViewExceptionQueue = canAccessPermission(profile, 'view_review_exception_queue');
  const canViewAuditContext = canAccessPermission(profile, 'view_review_audit_context');

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const [queueResponse, exceptionResponse] = await Promise.all([
          fetchReviewQueue({ ...authContext, page: 0, size: 50 }),
          fetchReviewExceptionQueue({ ...authContext, page: 0, size: 50 }),
        ]);
        setQueue(queueResponse.content);
        setExceptionQueue(exceptionResponse.content);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the review summary right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, [authContext, canViewWorkspace, state.status]);

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE10-11"
          title="Review summary is not available for this role."
          message="Coordinator-facing Epic 10 visibility is permission-gated separately from everyday review work."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  const unassignedCount = queue.filter((item) => !item.activeAssignment).length;
  const overdueCount = queue.filter((item) => isOverdue(item)).length;
  const returnedCount = queue.filter((item) => item.workItem.status === 'RETURNED_FOR_FIX').length;
  const signoffCount = queue.filter((item) => item.workItem.status === 'SIGNOFF_REQUESTED').length;

  return (
    <ReviewWorkspaceShell
      eyebrow="Frontend Stories FE10-11 · FE10-12 · FE10-13 · FE10-14"
      title="Review command center"
      description="Coordinator-facing Epic 10 visibility summarizes pending review, exceptions, unassigned work, overdue items, and correction loops without exposing unnecessary patient or documentation internals."
    >
      <ReviewWorkspaceGrid>
        <ReviewPanel
          title="Backlog summary"
          description="The command center keeps queue triage high-level so urgent review follow-up is visible before a reviewer opens a single work item."
        >
          {loading ? <p className="session-note">Loading review summary...</p> : null}
          {error ? (
            <ReviewModuleState title="Summary load failed" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="review-summary-grid">
              <ReviewStatusBanner
                status={`${queue.length} pending review`}
                summary="All queued Epic 10 work currently visible to this user."
              />
              <ReviewStatusBanner
                status={`${exceptionQueue.length} exception item`}
                summary="Exception-driven review items that may need faster triage."
                tone={canViewExceptionQueue ? 'warning' : 'readonly'}
              />
              <ReviewStatusBanner
                status={`${unassignedCount} unassigned`}
                summary="Queue items without an active reviewer owner."
                tone={unassignedCount > 0 ? 'warning' : 'success'}
              />
              <ReviewStatusBanner
                status={`${overdueCount} overdue`}
                summary="Queue items whose due time has already passed."
                tone={overdueCount > 0 ? 'warning' : 'success'}
              />
              <ReviewStatusBanner
                status={`${returnedCount} returned`}
                summary="Work in the correction loop and waiting for resubmission visibility."
                tone={returnedCount > 0 ? 'warning' : 'readonly'}
              />
              <ReviewStatusBanner
                status={`${signoffCount} signoff requested`}
                summary="Items waiting on secondary approval or final signoff."
                tone={signoffCount > 0 ? 'warning' : 'readonly'}
              />
            </div>
          ) : null}
        </ReviewPanel>

        <ReviewPanel
          title="Actionable lanes"
          description="These focused lanes route coordinators into the exact Epic 10 surface they need without forcing them through the full review detail first."
        >
          {!loading && !error ? (
            <div className="review-command-list">
              <Link className="review-queue-card" to="/app/review">
                <strong>Open full review queue</strong>
                <p>Review all pending work with detailed queue filters and reviewer ownership.</p>
              </Link>
              <Link className="review-queue-card" to="/app/review/exceptions">
                <strong>Open exception queue</strong>
                <p>Prioritize exception-driven work separately from standard review backlog.</p>
              </Link>
              {queue.find((item) => item.workItem.status === 'RETURNED_FOR_FIX') ? (
                <Link
                  className="review-queue-card"
                  to={`/app/review/items/${queue.find((item) => item.workItem.status === 'RETURNED_FOR_FIX')?.workItem.id}/resubmission`}
                >
                  <strong>Open returned-for-fix work</strong>
                  <p>Jump directly into the active correction loop and resubmission visibility route.</p>
                </Link>
              ) : null}
              {queue.find((item) => !item.activeAssignment) ? (
                <Link
                  className="review-queue-card"
                  to={`/app/review/items/${queue.find((item) => !item.activeAssignment)?.workItem.id}/assignment`}
                >
                  <strong>Open unassigned work</strong>
                  <p>Go directly to a work item that still needs reviewer ownership.</p>
                </Link>
              ) : null}
            </div>
          ) : null}
        </ReviewPanel>

        <ReviewPanel
          title="Minimal context"
          description="The command center keeps summary rows intentionally terse so reviewers see only enough context to choose the next route."
        >
          {!loading && !error && queue.length === 0 ? (
            <ReviewModuleState
              title="No review backlog right now"
              description="The summary route remains available even when there is no active review work."
              variant="empty"
            />
          ) : null}
          {!loading && !error && queue.length > 0 ? (
            <div className="review-history-list">
              {queue.slice(0, 4).map((item) => (
                <div className="review-history-row" key={item.workItem.id}>
                  <div>
                    <strong>{formatTokenLabel(item.workItem.sourceType)}</strong>
                    <p>
                      {item.workItem.status === 'RETURNED_FOR_FIX'
                        ? 'Returned for correction'
                        : item.workItem.status === 'RESUBMITTED'
                          ? 'Resubmitted and awaiting review'
                          : 'Active review work'}
                    </p>
                  </div>
                  <span>{formatTokenLabel(item.workItem.priority)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </ReviewPanel>

        <ReviewPanel
          title="Audit-aware review"
          description="Summary-level review remains privacy-aware, while authorized users can jump to audit context for the controlled operations underneath."
        >
          <ReviewModuleState
            title="Controlled review operations"
            description="Assignments, decisions, return-for-fix loops, signoff requests, and completeness recalculations are logged backend operations. This summary keeps patient and record context minimal and routes deeper review into queue/detail or audit screens."
            variant="info"
          />
          {canViewAuditContext ? (
            <div className="review-link-row">
              <Link className="text-link" to="/app/review">
                Open review queue
              </Link>
              <Link className="text-link" to="/app/admin/audit?actionType=EPIC10_REVIEW_DECISION_RECORDED">
                Review decision audit activity
              </Link>
              <Link className="text-link" to="/app/admin/audit?actionType=EPIC10_REVIEW_WORK_ITEM_ASSIGNED">
                Assignment audit activity
              </Link>
            </div>
          ) : null}
        </ReviewPanel>
      </ReviewWorkspaceGrid>
    </ReviewWorkspaceShell>
  );
}
