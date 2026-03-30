import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchBranches,
  fetchMessagingSummary,
  fetchMessagingThreads,
  type BranchSummary,
  type MessagingSummary,
  type MessagingThreadSummary,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  MessagingEscalationBadge,
  MessagingModuleState,
  MessagingPanel,
  MessagingStatusBanner,
  MessagingWorkspaceGrid,
  MessagingWorkspaceShell,
} from '../components/MessagingWorkspaceFoundation';

function messagingAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

function branchLabel(branchNames: Map<string, string>, branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }
  return branchNames.get(branchId) ?? 'Unknown branch';
}

export function MessagingCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [summary, setSummary] = useState<MessagingSummary | null>(null);
  const [threads, setThreads] = useState<MessagingThreadSummary[]>([]);
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

  const canViewMessaging = canAccessPermission(profile, 'view_messaging_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewMessaging) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [loadedSummary, loadedThreads, loadedBranches] = await Promise.all([
          fetchMessagingSummary(authContext),
          fetchMessagingThreads(authContext),
          fetchBranches(authContext).catch(() => [] as BranchSummary[]),
        ]);
        setSummary(loadedSummary);
        setThreads(loadedThreads);
        setBranches(loadedBranches);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the communication command center right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, canViewMessaging, state.status]);

  if (!canViewMessaging) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE9-11"
          title="Communication summary is not available for this role."
          message="Only authorized messaging roles can open the Epic 9 coordinator-facing communication visibility screen."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  const escalatedThreads = threads.filter((thread) => thread.escalationStatus !== 'NORMAL').slice(0, 5);
  const contextThreads = (summary?.recentContextThreads ?? []).slice(0, 5);

  return (
    <MessagingWorkspaceShell
      eyebrow="Frontend Story FE9-11"
      title="Communication command center"
      description="Unread, escalated, broadcast, and context-linked coordination work is surfaced here for operational triage without exposing more protected detail than necessary."
    >
      <MessagingWorkspaceGrid>
        <MessagingPanel
          title="Coordinator summary"
          description="This command-center view stays focused on actionable communication pressure rather than full conversation bodies."
        >
          {loading ? <p className="session-note">Loading communication summary…</p> : null}
          {error ? <MessagingModuleState title="Communication summary failed" description={error} variant="error" /> : null}
          {!loading && !error && summary ? (
            <div className="messaging-summary-grid">
              <MessagingStatusBanner
                status={`${summary.unread.unreadThreadCount} unread thread${summary.unread.unreadThreadCount === 1 ? '' : 's'}`}
                summary="Unread thread count routes back into the live secure inbox."
                tone="success"
              />
              <MessagingStatusBanner
                status={`${summary.unread.escalatedThreadCount} escalated thread${summary.unread.escalatedThreadCount === 1 ? '' : 's'}`}
                summary="Escalated communication is called out explicitly so urgent coordination does not disappear into normal traffic."
                tone="warning"
              />
              <MessagingStatusBanner
                status={`${summary.recentBroadcasts.length} recent broadcast${summary.recentBroadcasts.length === 1 ? '' : 's'}`}
                summary="Recent broadcasts stay visible here without duplicating the full admin management workflow."
                tone="info"
              />
            </div>
          ) : null}
          <div className="messaging-command-links">
            <Link className="messaging-admin-link" to="/app/messaging">
              Open secure inbox
            </Link>
            <Link className="messaging-admin-link" to="/app/messaging/admin">
              Open groups and broadcasts
            </Link>
          </div>
        </MessagingPanel>

        <MessagingPanel
          title="Escalated coordination"
          description="This list focuses on escalated threads so coordinators can route directly into the active conversation."
        >
          {escalatedThreads.length === 0 ? (
            <MessagingModuleState
              title="No escalated communication"
              description="Escalated threads will appear here once the secure inbox contains urgent or escalated work."
              variant="empty"
            />
          ) : (
            <div className="messaging-command-list">
              {escalatedThreads.map((thread) => (
                <Link className="messaging-command-card" key={thread.id} to={`/app/messaging/threads/${thread.id}`}>
                  <header>
                    <strong>{thread.subject || 'Secure conversation'}</strong>
                    <MessagingEscalationBadge escalationStatus={thread.escalationStatus} />
                  </header>
                  <p>{thread.threadType.replace(/_/g, ' ')}</p>
                  <small>{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : 'No messages yet'}</small>
                </Link>
              ))}
            </div>
          )}
        </MessagingPanel>

        <MessagingPanel
          title="Recent broadcasts"
          description="Branch announcements remain visible here so operations can spot active agency communication quickly."
        >
          {summary?.recentBroadcasts.length ? (
            <div className="messaging-broadcast-list">
              {summary.recentBroadcasts.map((broadcast) => (
                <article className="messaging-broadcast-card" key={broadcast.id}>
                  <header>
                    <strong>{broadcast.subject}</strong>
                    <span>{broadcast.status}</span>
                  </header>
                  <p>{broadcast.body}</p>
                  <small>
                    {branchLabel(branchNames, broadcast.branchId)}
                    {broadcast.expiresAt ? ` · Expires ${new Date(broadcast.expiresAt).toLocaleString()}` : ' · No expiration'}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <MessagingModuleState
              title="No recent broadcasts"
              description="Broadcast activity will appear here once an authorized admin sends an announcement."
              variant="empty"
            />
          )}
        </MessagingPanel>

        <MessagingPanel
          title="Recent contextual activity"
          description="Patient and visit-linked discussion stays discoverable here, with links that route into the relevant messaging surface."
        >
          {contextThreads.length ? (
            <div className="messaging-command-list">
              {contextThreads.map((thread) => (
                <Link className="messaging-command-card" key={thread.id} to={contextLinkForThread(thread)}>
                  <header>
                    <strong>{thread.subject || 'Context-linked discussion'}</strong>
                    <MessagingEscalationBadge escalationStatus={thread.escalationStatus} />
                  </header>
                  <p>{contextLabelForThread(thread)}</p>
                  <small>{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : 'No messages yet'}</small>
                </Link>
              ))}
            </div>
          ) : (
            <MessagingModuleState
              title="No recent contextual activity"
              description="Patient, visit, and task-linked thread activity will appear here once messaging is used in those contexts."
              variant="empty"
            />
          )}
        </MessagingPanel>

        <MessagingPanel
          title="Audit-aware review"
          description="Sensitive messaging activity stays privacy-aware in the command center, while authorized reviewers can jump to matching audit activity when needed."
        >
          <div className="messaging-audit-callout">
            <strong>Controlled messaging operations</strong>
            <p>
              Broadcast creation, escalation tagging, and secure thread activity are logged operations. The command center keeps the context minimal and pushes deeper review into the audit workspace.
            </p>
            <div className="messaging-command-links">
              <Link className="messaging-audit-link" to={messagingAuditHref('MSG_THREAD_CREATED')}>
                Review thread audit activity
              </Link>
              <Link className="messaging-audit-link" to={messagingAuditHref('MSG_ESCALATION_TAGGED')}>
                Review escalation audit activity
              </Link>
              {canViewAudit ? (
                <Link className="messaging-audit-link" to={messagingAuditHref('MSG_BROADCAST_CREATED')}>
                  Review broadcast audit activity
                </Link>
              ) : null}
            </div>
          </div>
        </MessagingPanel>
      </MessagingWorkspaceGrid>
    </MessagingWorkspaceShell>
  );
}

function contextLinkForThread(thread: MessagingThreadSummary) {
  if (thread.patientId) {
    return `/app/patients/${thread.patientId}/discussion`;
  }
  if (thread.visitOccurrenceId) {
    return `/app/scheduling/visits/${thread.visitOccurrenceId}/discussion`;
  }
  return `/app/messaging/threads/${thread.id}`;
}

function contextLabelForThread(thread: MessagingThreadSummary) {
  if (thread.patientId) {
    return `Patient-linked discussion · ${thread.patientId}`;
  }
  if (thread.visitOccurrenceId) {
    return `Visit-linked discussion · ${thread.visitOccurrenceId}`;
  }
  return thread.threadType.replace(/_/g, ' ');
}
