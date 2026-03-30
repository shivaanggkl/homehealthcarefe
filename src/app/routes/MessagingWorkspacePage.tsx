import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyRole,
  ApiError,
  createMessagingBranchBroadcast,
  createMessagingThread,
  fetchBranches,
  fetchCurrentAccess,
  fetchMessagingBranchBroadcasts,
  fetchMessagingReadReceipts,
  fetchMessagingStaffGroups,
  fetchMessagingSummary,
  fetchMessagingThreadDetail,
  fetchMessagingThreads,
  fetchMessagingThreadsByPatient,
  fetchMessagingThreadsByTask,
  fetchMessagingThreadsByVisit,
  fetchUserDirectory,
  markMessagingThreadRead,
  removeMessagingStaffGroupMember,
  resolveMessagingEscalation,
  saveMessagingStaffGroup,
  sendMessagingMessage,
  tagMessagingEscalation,
  type BranchSummary,
  type CreateMessagingThreadRequest,
  type MessagingBranchBroadcast,
  type MessagingEscalationRecord,
  type MessagingReadReceipt,
  type MessagingStaffGroup,
  type MessagingSummary,
  type MessagingThreadDetail,
  type MessagingThreadSummary,
  type UserDirectoryEntry,
  addMessagingStaffGroupMember,
  cancelMessagingBranchBroadcast,
  deactivateMessagingStaffGroup,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  MessagingContextBadge,
  MessagingEscalationBadge,
  MessagingModuleState,
  MessagingMutationNotice,
  MessagingPanel,
  MessagingSectionNavigation,
  MessagingStatusBanner,
  MessagingThreadDetailFrame,
  MessagingThreadList,
  MessagingWorkspaceGrid,
  MessagingWorkspaceShell,
  type MessagingThreadMeta,
} from '../components/MessagingWorkspaceFoundation';

type MessagingContextMode = 'patient' | 'visit' | 'task' | 'admin' | 'inbox';

type StaffGroupFormState = {
  staffGroupId?: string;
  name: string;
  description: string;
  branchId: string;
};

type BroadcastFormState = {
  branchId: string;
  eligibleRoles: AgencyRole[];
  subject: string;
  body: string;
  expiresAt: string;
};

type EscalationFormState = {
  status: 'URGENT' | 'ESCALATED';
  tag: string;
  reason: string;
};

const USER_DIRECTORY_PAGE_SIZE = 100;

function messagingAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

function emptyStaffGroupForm(): StaffGroupFormState {
  return {
    name: '',
    description: '',
    branchId: '',
  };
}

function emptyBroadcastForm(): BroadcastFormState {
  return {
    branchId: '',
    eligibleRoles: [],
    subject: '',
    body: '',
    expiresAt: '',
  };
}

function defaultEscalationForm(
  escalationStatus: MessagingThreadSummary['escalationStatus'] = 'NORMAL',
): EscalationFormState {
  return {
    status: escalationStatus === 'ESCALATED' ? 'ESCALATED' : 'URGENT',
    tag: escalationStatus === 'ESCALATED' ? 'Needs coordinator review' : 'Urgent follow-up',
    reason: '',
  };
}

function branchLabel(branchNames: Map<string, string>, branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }
  return branchNames.get(branchId) ?? 'Unknown branch';
}

export function MessagingWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const { threadId, patientId, visitId, taskTemplateId } = useParams<{
    threadId?: string;
    patientId?: string;
    visitId?: string;
    taskTemplateId?: string;
  }>();

  const [currentMembershipId, setCurrentMembershipId] = useState<string | null>(null);
  const [threads, setThreads] = useState<MessagingThreadSummary[]>([]);
  const [threadMeta, setThreadMeta] = useState<Record<string, MessagingThreadMeta>>({});
  const [selectedThread, setSelectedThread] = useState<MessagingThreadDetail | null>(null);
  const [readReceipts, setReadReceipts] = useState<Record<string, MessagingReadReceipt[]>>({});
  const [summary, setSummary] = useState<MessagingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [staffGroups, setStaffGroups] = useState<MessagingStaffGroup[]>([]);
  const [broadcasts, setBroadcasts] = useState<MessagingBranchBroadcast[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeParticipantIds, setComposeParticipantIds] = useState<string[]>([]);
  const [composeStaffGroupIds, setComposeStaffGroupIds] = useState<string[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [staffGroupForm, setStaffGroupForm] = useState<StaffGroupFormState>(emptyStaffGroupForm());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [broadcastForm, setBroadcastForm] = useState<BroadcastFormState>(emptyBroadcastForm());
  const [escalationForm, setEscalationForm] = useState<EscalationFormState>(defaultEscalationForm());
  const [activeEscalation, setActiveEscalation] = useState<MessagingEscalationRecord | null>(null);
  const [mutationState, setMutationState] = useState<'idle' | 'saving' | 'saved' | 'retry'>('idle');
  const [mutationMessage, setMutationMessage] = useState(
    'Send, read, escalation, group, and broadcast actions share one pending, success, and retry pattern.',
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

  const contextMode: MessagingContextMode = patientId
    ? 'patient'
    : visitId
      ? 'visit'
      : taskTemplateId
        ? 'task'
        : location.pathname.endsWith('/admin')
          ? 'admin'
          : 'inbox';

  const canViewMessaging = canAccessPermission(profile, 'view_messaging_workspace');
  const canSendMessaging = canAccessPermission(profile, 'send_secure_messages');
  const canManageGroups = canAccessPermission(profile, 'manage_staff_groups');
  const canBroadcast = canAccessPermission(profile, 'send_branch_broadcasts');
  const canManageEscalations = canAccessPermission(profile, 'manage_message_escalations');

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status === 'ACTIVE'),
    [branches],
  );
  const branchNames = useMemo(
    () => new Map(activeBranches.map((branch) => [branch.id, branch.name])),
    [activeBranches],
  );
  const activeDirectory = useMemo(
    () => directory.filter((entry) => entry.userStatus === 'ACTIVE'),
    [directory],
  );
  const selectedGroup = useMemo(
    () => staffGroups.find((group) => group.id === selectedGroupId) ?? null,
    [selectedGroupId, staffGroups],
  );

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewMessaging) {
      return;
    }

    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const [access, loadedThreads, loadedSummary] = await Promise.all([
          fetchCurrentAccess(authContext),
          loadThreadsForContext(authContext, patientId, visitId, taskTemplateId),
          fetchMessagingSummary(authContext),
        ]);
        setCurrentMembershipId(access.membershipId);
        setThreads(loadedThreads);
        setSummary(loadedSummary);
        setThreadMeta(await buildThreadMeta(authContext, loadedThreads, access.membershipId));
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the messaging workspace right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWorkspace();
  }, [authContext, state.status, canViewMessaging, patientId, visitId, taskTemplateId, location.pathname]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewMessaging) {
      return;
    }

    async function loadReferenceData() {
      try {
        const [loadedBranches, loadedDirectory] = await Promise.all([
          fetchBranches(authContext).catch(() => [] as BranchSummary[]),
          fetchUserDirectory({
            ...authContext,
            page: 0,
            size: USER_DIRECTORY_PAGE_SIZE,
          }).catch(() => ({
            content: [] as UserDirectoryEntry[],
            page: 0,
            size: USER_DIRECTORY_PAGE_SIZE,
            totalElements: 0,
            totalPages: 0,
          })),
        ]);

        setBranches(loadedBranches);
        setDirectory(loadedDirectory.content);
      } catch {
        setBranches([]);
        setDirectory([]);
      }
    }

    void loadReferenceData();
  }, [authContext, canViewMessaging, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || contextMode !== 'admin') {
      return;
    }

    if (!canManageGroups && !canBroadcast) {
      setStaffGroups([]);
      setBroadcasts([]);
      setAdminError(null);
      return;
    }

    async function loadAdminData() {
      setAdminLoading(true);
      setAdminError(null);
      try {
        const [loadedGroups, loadedBroadcasts] = await Promise.all([
          canManageGroups ? fetchMessagingStaffGroups(authContext) : Promise.resolve([]),
          canBroadcast ? fetchMessagingBranchBroadcasts(authContext) : Promise.resolve([]),
        ]);
        setStaffGroups(loadedGroups);
        setBroadcasts(loadedBroadcasts);
      } catch (requestError) {
        setAdminError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load staff groups or branch broadcasts right now.',
        );
      } finally {
        setAdminLoading(false);
      }
    }

    void loadAdminData();
  }, [authContext, canBroadcast, canManageGroups, canViewMessaging, contextMode, state.status]);

  useEffect(() => {
    if (!threadId || state.status !== 'authenticated' || !canViewMessaging) {
      setSelectedThread(null);
      setReadReceipts({});
      setDetailError(null);
      setActiveEscalation(null);
      return;
    }

    const currentThreadId = threadId;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const detail = await fetchMessagingThreadDetail({
          ...authContext,
          threadId: currentThreadId,
        });
        const nextReceipts = await loadThreadReadReceipts(authContext, detail);
        setSelectedThread(detail);
        setReadReceipts(nextReceipts);
        setEscalationForm(defaultEscalationForm(detail.thread.escalationStatus));

        if (
          currentMembershipId &&
          detail.messages.length > 0 &&
          detail.messages[detail.messages.length - 1]?.senderMembershipId !== currentMembershipId
        ) {
          await markMessagingThreadRead({
            ...authContext,
            threadId: currentThreadId,
          });
          const [loadedSummary, refreshedMeta] = await Promise.all([
            fetchMessagingSummary(authContext),
            buildThreadMeta(authContext, threads, currentMembershipId),
          ]);
          setSummary(loadedSummary);
          setThreadMeta(refreshedMeta);
        }
      } catch (requestError) {
        setDetailError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load this secure thread right now.',
        );
      } finally {
        setDetailLoading(false);
      }
    }

    void loadDetail();
  }, [authContext, canViewMessaging, currentMembershipId, state.status, threadId, threads]);

  if (!canViewMessaging) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Stories FE9-02 · FE9-08"
          title="Messaging workspace is not available for this role."
          message="Epic 9 messaging routes respect the backend messaging workspace permission and render a controlled denied state."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  async function refreshThreadsAndSummary(targetThreadId?: string) {
    const [loadedThreads, loadedSummary] = await Promise.all([
      loadThreadsForContext(authContext, patientId, visitId, taskTemplateId),
      fetchMessagingSummary(authContext),
    ]);
    setThreads(loadedThreads);
    setSummary(loadedSummary);
    if (currentMembershipId) {
      setThreadMeta(await buildThreadMeta(authContext, loadedThreads, currentMembershipId));
    }
    if (targetThreadId) {
      navigate(`/app/messaging/threads/${targetThreadId}`);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSendMessaging) {
      return;
    }

    if (!composeSubject.trim() && !composeMessage.trim()) {
      setMutationState('retry');
      setMutationMessage('Add a subject or opening message before starting a secure thread.');
      return;
    }

    setMutationState('saving');
    setMutationMessage('Creating a secure conversation and syncing the opening state from the backend.');
    try {
      const request: CreateMessagingThreadRequest = {
        ...authContext,
        threadType:
          patientId
            ? 'PATIENT_COORDINATION'
            : visitId
              ? 'VISIT_COORDINATION'
              : taskTemplateId
                ? 'TASK_DISCUSSION'
                : 'DIRECT_SECURE',
        subject: composeSubject.trim() || undefined,
        patientId,
        visitOccurrenceId: visitId,
        taskTemplateId,
        participantMembershipIds: composeParticipantIds,
        staffGroupIds: composeStaffGroupIds,
      };
      const created = await createMessagingThread(request);
      if (composeMessage.trim()) {
        await sendMessagingMessage({
          ...authContext,
          threadId: created.id,
          messageBody: composeMessage.trim(),
        });
      }
      setComposeSubject('');
      setComposeMessage('');
      setComposeParticipantIds([]);
      setComposeStaffGroupIds([]);
      setMutationState('saved');
      setMutationMessage('Secure thread created. Phase B now uses the real thread and message APIs.');
      await refreshThreadsAndSummary(created.id);
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Thread creation failed. Retry once the backend is reachable again.',
      );
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || !canSendMessaging || !replyMessage.trim()) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Sending a secure reply and then refreshing read state from the backend.');
    try {
      await sendMessagingMessage({
        ...authContext,
        threadId: selectedThread.thread.id,
        messageBody: replyMessage.trim(),
      });
      setReplyMessage('');
      setMutationState('saved');
      setMutationMessage('Reply sent. Unread state was refreshed from backend receipts instead of optimistic local state.');
      await refreshThreadsAndSummary(selectedThread.thread.id);
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Reply failed. The message timeline stays visible so the send can be retried safely.',
      );
    }
  }

  async function handleSaveStaffGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageGroups) {
      return;
    }

    if (!staffGroupForm.name.trim()) {
      setMutationState('retry');
      setMutationMessage('Enter a staff-group name before saving.');
      return;
    }

    setMutationState('saving');
    setMutationMessage('Saving the staff group and refreshing the admin surface from the backend.');
    try {
      const saved = await saveMessagingStaffGroup({
        ...authContext,
        staffGroupId: staffGroupForm.staffGroupId,
        name: staffGroupForm.name.trim(),
        description: staffGroupForm.description.trim() || undefined,
        branchId: staffGroupForm.branchId || undefined,
      });
      setSelectedGroupId(saved.id);
      setStaffGroupForm({
        staffGroupId: saved.id,
        name: saved.name,
        description: saved.description ?? '',
        branchId: saved.branchId ?? '',
      });
      setMutationState('saved');
      setMutationMessage('Staff group saved. Membership management stays on the same admin route.');
      setStaffGroups(await fetchMessagingStaffGroups(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Staff group save failed. Retry after the backend returns.',
      );
    }
  }

  async function handleDeactivateStaffGroup(staffGroupId: string) {
    if (!canManageGroups) {
      return;
    }
    const confirmed = window.confirm('Deactivate this staff group? Existing threads stay intact, but the group will stop being reusable.');
    if (!confirmed) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Deactivating the staff group.');
    try {
      await deactivateMessagingStaffGroup({
        ...authContext,
        staffGroupId,
      });
      setMutationState('saved');
      setMutationMessage('Staff group deactivated.');
      setSelectedGroupId((current) => (current === staffGroupId ? null : current));
      setStaffGroupForm(emptyStaffGroupForm());
      setStaffGroups(await fetchMessagingStaffGroups(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to deactivate the staff group right now.',
      );
    }
  }

  async function handleAddStaffGroupMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageGroups || !selectedGroupId || !memberToAdd) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Adding the team member to the staff group.');
    try {
      await addMessagingStaffGroupMember({
        ...authContext,
        staffGroupId: selectedGroupId,
        membershipId: memberToAdd,
      });
      setMemberToAdd('');
      setMutationState('saved');
      setMutationMessage('Staff-group membership updated.');
      setStaffGroups(await fetchMessagingStaffGroups(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to add the staff-group member right now.',
      );
    }
  }

  async function handleRemoveStaffGroupMember(membershipId: string) {
    if (!canManageGroups || !selectedGroupId) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Removing the team member from the staff group.');
    try {
      await removeMessagingStaffGroupMember({
        ...authContext,
        staffGroupId: selectedGroupId,
        membershipId,
      });
      setMutationState('saved');
      setMutationMessage('Staff-group membership updated.');
      setStaffGroups(await fetchMessagingStaffGroups(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to remove the staff-group member right now.',
      );
    }
  }

  async function handleCreateBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canBroadcast) {
      return;
    }

    if (!broadcastForm.branchId || !broadcastForm.subject.trim() || !broadcastForm.body.trim()) {
      setMutationState('retry');
      setMutationMessage('Choose a branch and enter both a subject and body before sending a broadcast.');
      return;
    }

    const confirmed = window.confirm(
      'Send this branch broadcast? Broadcasts are controlled operations and should only be used for broad operational communication.',
    );
    if (!confirmed) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Sending the branch broadcast through the Epic 9 backend.');
    try {
      await createMessagingBranchBroadcast({
        ...authContext,
        branchId: broadcastForm.branchId,
        eligibleRoles: broadcastForm.eligibleRoles,
        subject: broadcastForm.subject.trim(),
        body: broadcastForm.body.trim(),
        expiresAt: broadcastForm.expiresAt || undefined,
      });
      setBroadcastForm(emptyBroadcastForm());
      setMutationState('saved');
      setMutationMessage('Broadcast sent. Recipient visibility is now shared with the messaging workspace.');
      setBroadcasts(await fetchMessagingBranchBroadcasts(authContext));
      setSummary(await fetchMessagingSummary(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to send the branch broadcast right now.',
      );
    }
  }

  async function handleCancelBroadcast(broadcastId: string) {
    if (!canBroadcast) {
      return;
    }

    const confirmed = window.confirm('Cancel this broadcast? This should only be used when the announcement is no longer valid.');
    if (!confirmed) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Cancelling the branch broadcast.');
    try {
      await cancelMessagingBranchBroadcast({
        ...authContext,
        broadcastId,
      });
      setMutationState('saved');
      setMutationMessage('Broadcast cancelled.');
      setBroadcasts(await fetchMessagingBranchBroadcasts(authContext));
      setSummary(await fetchMessagingSummary(authContext));
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to cancel the branch broadcast right now.',
      );
    }
  }

  async function handleTagEscalation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageEscalations || !selectedThread) {
      return;
    }

    if (!escalationForm.tag.trim()) {
      setMutationState('retry');
      setMutationMessage('Enter an escalation tag before saving.');
      return;
    }

    setMutationState('saving');
    setMutationMessage('Saving the escalation state for this thread.');
    try {
      const escalation = await tagMessagingEscalation({
        ...authContext,
        threadId: selectedThread.thread.id,
        status: escalationForm.status,
        tag: escalationForm.tag.trim(),
        reason: escalationForm.reason.trim() || undefined,
      });
      setActiveEscalation(escalation);
      setMutationState('saved');
      setMutationMessage('Escalation saved. Inbox state and audit visibility were refreshed from the backend.');
      await refreshThreadsAndSummary(selectedThread.thread.id);
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to save the escalation right now.',
      );
    }
  }

  async function handleResolveEscalation() {
    if (!canManageEscalations || !selectedThread) {
      return;
    }

    const confirmed = window.confirm('Clear the escalation on this thread? The conversation will return to normal visibility.');
    if (!confirmed) {
      return;
    }

    setMutationState('saving');
    setMutationMessage('Clearing the escalation from this thread.');
    try {
      const escalation = await resolveMessagingEscalation({
        ...authContext,
        threadId: selectedThread.thread.id,
      });
      setActiveEscalation(escalation);
      setEscalationForm(defaultEscalationForm('NORMAL'));
      setMutationState('saved');
      setMutationMessage('Escalation cleared.');
      await refreshThreadsAndSummary(selectedThread.thread.id);
    } catch (requestError) {
      setMutationState('retry');
      setMutationMessage(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to clear the escalation right now.',
      );
    }
  }

  return (
    <MessagingWorkspaceShell
      eyebrow="Frontend Stories FE9-02 · FE9-08"
      title={titleForContext(contextMode)}
      description={descriptionForContext(contextMode)}
    >
      <MessagingSectionNavigation
        links={[
          { path: '/app/messaging', label: 'Inbox', state: 'available' },
          { path: '/app/messaging/command-center', label: 'Command center', state: 'available' },
          {
            path: '/app/messaging/admin',
            label: 'Groups & broadcasts',
            state: canManageGroups || canBroadcast ? 'available' : 'read-only',
          },
          ...(patientId
            ? [{ path: `/app/patients/${patientId}/discussion`, label: 'Patient context', state: 'available' as const }]
            : []),
          ...(visitId
            ? [{ path: `/app/scheduling/visits/${visitId}/discussion`, label: 'Visit context', state: 'available' as const }]
            : []),
          ...(taskTemplateId
            ? [{ path: `/app/documentation/tasks/${taskTemplateId}/discussion`, label: 'Task context', state: 'available' as const }]
            : []),
        ]}
      />

      <MessagingWorkspaceGrid>
        <MessagingPanel
          title="Inbox summary"
          description="Unread counts, escalations, recent broadcasts, and recent coordination activity all come from the live Epic 9 backend contracts."
        >
          {loading ? <p className="session-note">Loading messaging workspace...</p> : null}
          {error ? <MessagingModuleState title="Workspace load failed" description={error} variant="error" /> : null}
          {!loading && !error && summary ? (
            <>
              <div className="messaging-summary-grid">
                <MessagingStatusBanner
                  status={`${summary.unread.unreadThreadCount} unread thread${summary.unread.unreadThreadCount === 1 ? '' : 's'}`}
                  summary="Unread counts refresh from the backend after thread open and mark-read operations."
                  tone="success"
                />
                <MessagingStatusBanner
                  status={`${summary.unread.escalatedThreadCount} escalated`}
                  summary="Escalated coordination is visually distinct from ordinary messaging."
                  tone="warning"
                />
                <MessagingStatusBanner
                  status={`${summary.recentBroadcasts.length} recent broadcast${summary.recentBroadcasts.length === 1 ? '' : 's'}`}
                  summary="Branch announcements remain visible without turning the workspace into generic email."
                  tone={canBroadcast ? 'info' : 'readonly'}
                />
              </div>

              <div className="messaging-audit-callout">
                <strong>Audit-aware communication review</strong>
                <p>
                  Messaging previews stay intentionally minimal here. Thread creation, replies,
                  escalations, and broadcasts are controlled operations that can be reviewed in the
                  audit workspace without expanding protected patient or visit detail on this screen.
                </p>
                <div className="messaging-command-links">
                  <Link className="messaging-audit-link" to="/app/messaging/command-center">
                    Open communication summary
                  </Link>
                  <Link className="messaging-audit-link" to={messagingAuditHref('MSG_THREAD_CREATED')}>
                    Review thread audit activity
                  </Link>
                  <Link className="messaging-audit-link" to={messagingAuditHref('MSG_MESSAGE_SENT')}>
                    Review send-message audit activity
                  </Link>
                </div>
              </div>

              {summary.recentBroadcasts.length ? (
                <div className="messaging-broadcast-list">
                  {summary.recentBroadcasts.slice(0, 3).map((broadcast) => (
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
              ) : null}
            </>
          ) : null}
        </MessagingPanel>

        <MessagingPanel
          title="Secure inbox"
          description="The inbox shows subject, participant summary, activity, unread state, and escalation state without exposing excess protected context."
        >
          <MessagingThreadList
            threads={threads}
            selectedThreadId={threadId}
            emptyLabel="Conversations will appear here once someone starts coordination work in Epic 9."
            threadMeta={threadMeta}
          />
          {summary?.recentContextThreads.length ? (
            <div className="messaging-recent-context-grid">
              {summary.recentContextThreads.slice(0, 2).map((thread) => (
                <Link className="messaging-thread-preview" key={thread.id} to={`/app/messaging/threads/${thread.id}`}>
                  <div>
                    <strong>{thread.subject || 'Untitled secure thread'}</strong>
                    <p>{threadMeta[thread.id]?.contextLabel ?? thread.threadType.replace(/_/g, ' ')}</p>
                  </div>
                  <MessagingEscalationBadge escalationStatus={thread.escalationStatus} />
                </Link>
              ))}
            </div>
          ) : null}
        </MessagingPanel>

        <MessagingPanel
          title={selectedThread ? 'Thread detail and reply' : 'Create a secure thread'}
          description={
            selectedThread
              ? 'Thread detail now shows message timeline, sender identity, read receipts, escalation controls, and reply flow.'
              : 'Context-linked and direct thread creation now use the live Epic 9 create-thread API.'
          }
        >
          <MessagingMutationNotice state={mutationState} message={mutationMessage} />

          {!selectedThread ? (
            canSendMessaging ? (
              <form className="messaging-form" onSubmit={handleCreateThread}>
                <label>
                  Subject
                  <input
                    onChange={(event) => setComposeSubject(event.target.value)}
                    placeholder="Coordination subject"
                    value={composeSubject}
                  />
                </label>
                <label>
                  Opening message
                  <textarea
                    onChange={(event) => setComposeMessage(event.target.value)}
                    placeholder="Start the secure coordination thread"
                    rows={4}
                    value={composeMessage}
                  />
                </label>
                <label>
                  Add participants
                  <select
                    multiple
                    onChange={(event) =>
                      setComposeParticipantIds(
                        Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                      )
                    }
                    value={composeParticipantIds}
                  >
                    {activeDirectory.map((entry) => (
                      <option key={entry.membershipId} value={entry.membershipId}>
                        {entry.firstName} {entry.lastName} · {entry.role.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                {canManageGroups && staffGroups.length ? (
                  <label>
                    Reuse staff groups
                    <select
                      multiple
                      onChange={(event) =>
                        setComposeStaffGroupIds(
                          Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                        )
                      }
                      value={composeStaffGroupIds}
                    >
                      {staffGroups.filter((group) => group.active).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button className="primary-button" type="submit">
                  Start secure thread
                </button>
              </form>
            ) : (
              <MessagingModuleState
                title="Read-only secure messaging"
                description="This role can open messaging routes but cannot start or send secure messages."
                variant="readonly"
              />
            )
          ) : detailLoading ? (
            <p className="session-note">Loading secure thread…</p>
          ) : detailError ? (
            <MessagingModuleState title="Thread load failed" description={detailError} variant="error" />
          ) : (
            <MessagingThreadDetailFrame
              helper="Phase B keeps patient, visit, and task context minimal while showing the actual conversation state clearly."
              title={selectedThread.thread.subject || 'Secure conversation'}
            >
              <div className="messaging-context-badges">
                {selectedThread.contextLinks.map((link) => (
                  <MessagingContextBadge
                    key={link.id}
                    label={`${link.contextType}: ${link.contextId}`}
                    tone={
                      link.contextType === 'PATIENT'
                        ? 'patient'
                        : link.contextType === 'VISIT'
                          ? 'visit'
                          : link.contextType === 'TASK'
                            ? 'task'
                            : link.contextType === 'BRANCH'
                              ? 'broadcast'
                              : 'neutral'
                    }
                  />
                ))}
                <MessagingEscalationBadge escalationStatus={selectedThread.thread.escalationStatus} />
              </div>

              <div className="messaging-participants">
                <strong>Participants</strong>
                <p>{participantSummaryLabel(selectedThread.participants, currentMembershipId)}</p>
              </div>

              <div className="messaging-message-timeline">
                {selectedThread.messages.map((message) => (
                  <article className="messaging-message-bubble" key={message.id}>
                    <header>
                      <strong>{messageSenderLabel(message.senderMembershipId, selectedThread)}</strong>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </header>
                    <p>{message.messageBody}</p>
                    <small className="messaging-read-receipt-summary">
                      {buildReadSummary(readReceipts[message.id] ?? [], selectedThread, currentMembershipId)}
                    </small>
                  </article>
                ))}
              </div>

              {canManageEscalations ? (
                <>
                  <form className="messaging-form" onSubmit={handleTagEscalation}>
                    <label>
                      Escalation status
                      <select
                        onChange={(event) =>
                          setEscalationForm((current) => ({
                            ...current,
                            status: event.target.value as EscalationFormState['status'],
                          }))
                        }
                        value={escalationForm.status}
                      >
                        <option value="URGENT">Urgent</option>
                        <option value="ESCALATED">Escalated</option>
                      </select>
                    </label>
                    <label>
                      Escalation tag
                      <input
                        onChange={(event) =>
                          setEscalationForm((current) => ({ ...current, tag: event.target.value }))
                        }
                        placeholder="Urgent follow-up"
                        value={escalationForm.tag}
                      />
                    </label>
                    <label>
                      Reason
                      <textarea
                        onChange={(event) =>
                          setEscalationForm((current) => ({ ...current, reason: event.target.value }))
                        }
                        placeholder="Explain why this thread needs escalation"
                        rows={3}
                        value={escalationForm.reason}
                      />
                    </label>
                    <div className="messaging-inline-actions">
                      <button className="primary-button" type="submit">
                        Save escalation
                      </button>
                      {selectedThread.thread.escalationStatus !== 'NORMAL' || activeEscalation ? (
                        <button className="secondary-button" onClick={handleResolveEscalation} type="button">
                          Clear escalation
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="messaging-audit-callout">
                    <strong>Escalation review stays controlled</strong>
                    <p>
                      Escalation changes are logged operational actions. The conversation view stays concise
                      and routes deeper review into the communication summary or audit workspace.
                    </p>
                    <div className="messaging-command-links">
                      <Link className="messaging-audit-link" to={messagingAuditHref('MSG_ESCALATION_TAGGED')}>
                        Review escalation audit activity
                      </Link>
                      <Link className="messaging-audit-link" to="/app/messaging/command-center">
                        Open communication summary
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}

              {canSendMessaging ? (
                <form className="messaging-form" onSubmit={handleReply}>
                  <label>
                    Reply
                    <textarea
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Send a secure reply"
                      rows={4}
                      value={replyMessage}
                    />
                  </label>
                  <button className="primary-button" type="submit">
                    Send reply
                  </button>
                </form>
              ) : null}
            </MessagingThreadDetailFrame>
          )}
        </MessagingPanel>

        {contextMode !== 'admin' ? (
          <MessagingPanel
            title="Context-linked coordination"
            description="Patient, visit, and task routes reuse the same secure messaging APIs while keeping the linked work item visible."
          >
            <MessagingStatusBanner
              status={contextStatusLabel(contextMode, patientId, visitId, taskTemplateId)}
              summary="Context-linked discussion stays attached to the work item instead of falling into a generic inbox."
              tone={contextMode === 'inbox' ? 'info' : 'success'}
            />
            <div className="messaging-admin-links">
              {patientId ? (
                <Link className="messaging-admin-link" to={`/app/patients/${patientId}`}>
                  Return to patient workspace
                </Link>
              ) : null}
              {visitId ? (
                <Link className="messaging-admin-link" to={`/app/scheduling/visits/${visitId}/discussion`}>
                  Refresh visit discussion route
                </Link>
              ) : null}
              {taskTemplateId ? (
                <Link className="messaging-admin-link" to={`/app/documentation/tasks/${taskTemplateId}/discussion`}>
                  Refresh task discussion route
                </Link>
              ) : null}
              <Link className="messaging-admin-link" to={messagingAuditHref('MSG_THREAD_CREATED')}>
                Review thread audit activity
              </Link>
            </div>
          </MessagingPanel>
        ) : (
          <>
            <MessagingPanel
              title="Staff groups"
              description="Authorized admins can manage reusable recipient sets with optional branch scoping and explicit membership updates."
            >
              {adminLoading ? <p className="session-note">Loading staff groups…</p> : null}
              {adminError ? <MessagingModuleState title="Admin load failed" description={adminError} variant="error" /> : null}
              {!canManageGroups ? (
                <MessagingModuleState
                  title="Read-only staff-group surface"
                  description="This route exists, but this role cannot change staff groups."
                  variant="readonly"
                />
              ) : (
                <>
                  <div className="messaging-admin-card-list">
                    {staffGroups.map((group) => (
                      <button
                        className={`messaging-admin-card${
                          selectedGroupId === group.id ? ' messaging-admin-card-active' : ''
                        }`}
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setStaffGroupForm({
                            staffGroupId: group.id,
                            name: group.name,
                            description: group.description ?? '',
                            branchId: group.branchId ?? '',
                          });
                        }}
                        type="button"
                      >
                        <strong>{group.name}</strong>
                        <p>{group.description || 'No description yet.'}</p>
                        <small>
                          {group.active ? 'Active' : 'Inactive'} · {group.members.length} member{group.members.length === 1 ? '' : 's'}
                        </small>
                      </button>
                    ))}
                  </div>

                  <form className="messaging-form" onSubmit={handleSaveStaffGroup}>
                    <label>
                      Group name
                      <input
                        onChange={(event) =>
                          setStaffGroupForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="North Branch Care Team"
                        value={staffGroupForm.name}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        onChange={(event) =>
                          setStaffGroupForm((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Optional description"
                        rows={3}
                        value={staffGroupForm.description}
                      />
                    </label>
                    <label>
                      Branch scope
                      <select
                        onChange={(event) =>
                          setStaffGroupForm((current) => ({ ...current, branchId: event.target.value }))
                        }
                        value={staffGroupForm.branchId}
                      >
                        <option value="">Agency-wide</option>
                        {activeBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="messaging-inline-actions">
                      <button className="primary-button" type="submit">
                        {staffGroupForm.staffGroupId ? 'Save group' : 'Create group'}
                      </button>
                      {staffGroupForm.staffGroupId ? (
                        <button
                          className="secondary-button"
                          onClick={() => handleDeactivateStaffGroup(staffGroupForm.staffGroupId!)}
                          type="button"
                        >
                          Deactivate group
                        </button>
                      ) : null}
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setSelectedGroupId(null);
                          setStaffGroupForm(emptyStaffGroupForm());
                        }}
                        type="button"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {selectedGroup ? (
                    <>
                      <form className="messaging-form" onSubmit={handleAddStaffGroupMember}>
                        <label>
                          Add team member
                          <select
                            onChange={(event) => setMemberToAdd(event.target.value)}
                            value={memberToAdd}
                          >
                            <option value="">Select a user</option>
                            {activeDirectory.map((entry) => (
                              <option key={entry.membershipId} value={entry.membershipId}>
                                {entry.firstName} {entry.lastName} · {entry.role.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="primary-button" type="submit">
                          Add member
                        </button>
                      </form>
                      <div className="messaging-admin-card-list">
                        {selectedGroup.members.map((member) => (
                          <div className="messaging-admin-card" key={member.id}>
                            <strong>{member.membershipId}</strong>
                            <p>{member.role.replace(/_/g, ' ')}</p>
                            <button
                              className="secondary-button"
                              onClick={() => handleRemoveStaffGroupMember(member.membershipId)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="messaging-audit-callout">
                    <strong>Group membership changes are logged</strong>
                    <p>
                      Reusable staff groups affect recipient scope, so the admin surface keeps the actions
                      explicit and pushes deeper review into the audit workspace instead of exposing raw
                      internal messaging metadata.
                    </p>
                    <div className="messaging-command-links">
                      <Link className="messaging-audit-link" to={messagingAuditHref('MSG_STAFF_GROUP_SAVED')}>
                        Review group audit activity
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </MessagingPanel>

            <MessagingPanel
              title="Branch broadcasts"
              description="Broadcasts use the live Epic 9 branch-announcement API with explicit confirmation and expiration handling."
            >
              {!canBroadcast ? (
                <MessagingModuleState
                  title="Read-only broadcast surface"
                  description="This role can see broadcast visibility in the workspace but cannot create or cancel announcements."
                  variant="readonly"
                />
              ) : (
                <>
                  <form className="messaging-form" onSubmit={handleCreateBroadcast}>
                    <label>
                      Branch
                      <select
                        onChange={(event) =>
                          setBroadcastForm((current) => ({ ...current, branchId: event.target.value }))
                        }
                        value={broadcastForm.branchId}
                      >
                        <option value="">Select a branch</option>
                        {activeBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Eligible roles
                      <select
                        multiple
                        onChange={(event) =>
                          setBroadcastForm((current) => ({
                            ...current,
                            eligibleRoles: Array.from(
                              event.currentTarget.selectedOptions,
                              (option) => option.value as AgencyRole,
                            ),
                          }))
                        }
                        value={broadcastForm.eligibleRoles}
                      >
                        {['AGENCY_OWNER', 'BRANCH_ADMIN', 'SCHEDULER_COORDINATOR', 'CAREGIVER', 'QA_CLINICAL_REVIEWER'].map((role) => (
                          <option key={role} value={role}>
                            {role.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subject
                      <input
                        onChange={(event) =>
                          setBroadcastForm((current) => ({ ...current, subject: event.target.value }))
                        }
                        placeholder="Weather advisory"
                        value={broadcastForm.subject}
                      />
                    </label>
                    <label>
                      Body
                      <textarea
                        onChange={(event) =>
                          setBroadcastForm((current) => ({ ...current, body: event.target.value }))
                        }
                        placeholder="Enter the operational announcement"
                        rows={4}
                        value={broadcastForm.body}
                      />
                    </label>
                    <label>
                      Expires at
                      <input
                        onChange={(event) =>
                          setBroadcastForm((current) => ({ ...current, expiresAt: event.target.value }))
                        }
                        type="datetime-local"
                        value={broadcastForm.expiresAt}
                      />
                    </label>
                    <button className="primary-button" type="submit">
                      Send broadcast
                    </button>
                  </form>

                  <div className="messaging-broadcast-list">
                    {broadcasts.map((broadcast) => (
                      <article className="messaging-broadcast-card" key={broadcast.id}>
                        <header>
                          <strong>{broadcast.subject}</strong>
                          <span>{broadcast.status}</span>
                        </header>
                        <p>{broadcast.body}</p>
                        <small>
                          {branchLabel(branchNames, broadcast.branchId)}
                          {broadcast.eligibleRolesCsv ? ` · ${broadcast.eligibleRolesCsv}` : ' · All branch roles'}
                          {broadcast.expiresAt ? ` · Expires ${new Date(broadcast.expiresAt).toLocaleString()}` : ' · No expiration'}
                        </small>
                        {broadcast.status === 'SENT' ? (
                          <button
                            className="secondary-button"
                            onClick={() => handleCancelBroadcast(broadcast.id)}
                            type="button"
                          >
                            Cancel broadcast
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  <div className="messaging-audit-callout">
                    <strong>Broadcasts and escalations are reviewable</strong>
                    <p>
                      Broadcast activity is intentionally summarized for operations. Authorized reviewers can
                      jump to audit activity without the workspace exposing unnecessary delivery metadata.
                    </p>
                    <div className="messaging-command-links">
                      <Link className="messaging-audit-link" to={messagingAuditHref('MSG_BROADCAST_CREATED')}>
                        Review broadcast audit activity
                      </Link>
                      <Link className="messaging-audit-link" to="/app/messaging/command-center">
                        Open communication summary
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </MessagingPanel>
          </>
        )}
      </MessagingWorkspaceGrid>
    </MessagingWorkspaceShell>
  );
}

async function loadThreadsForContext(
  authContext: { accessToken?: string; sessionId?: string },
  patientId?: string,
  visitId?: string,
  taskTemplateId?: string,
) {
  if (patientId) {
    return fetchMessagingThreadsByPatient({ ...authContext, patientId });
  }
  if (visitId) {
    return fetchMessagingThreadsByVisit({ ...authContext, visitId });
  }
  if (taskTemplateId) {
    return fetchMessagingThreadsByTask({ ...authContext, taskTemplateId });
  }
  return fetchMessagingThreads(authContext);
}

async function loadThreadReadReceipts(
  authContext: { accessToken?: string; sessionId?: string },
  detail: MessagingThreadDetail,
) {
  const entries = await Promise.all(
    detail.messages.map(async (message) => [
      message.id,
      await fetchMessagingReadReceipts({
        ...authContext,
        messageId: message.id,
      }),
    ]),
  );
  return Object.fromEntries(entries) as Record<string, MessagingReadReceipt[]>;
}

async function buildThreadMeta(
  authContext: { accessToken?: string; sessionId?: string },
  threads: MessagingThreadSummary[],
  currentMembershipId: string | null,
) {
  const metaEntries = await Promise.all(
    threads.map(async (thread) => {
      try {
        const detail = await fetchMessagingThreadDetail({
          ...authContext,
          threadId: thread.id,
        });
        const latestMessage = detail.messages[detail.messages.length - 1];
        const latestReceipts = latestMessage
          ? await fetchMessagingReadReceipts({
              ...authContext,
              messageId: latestMessage.id,
            })
          : [];

        return [
          thread.id,
          {
            participantSummary: participantSummaryLabel(detail.participants, currentMembershipId),
            unread: latestMessage
              ? latestMessage.senderMembershipId !== currentMembershipId &&
                !latestReceipts.some(
                  (receipt) =>
                    receipt.recipientMembershipId === currentMembershipId &&
                    Boolean(receipt.readAt),
                )
              : false,
            contextLabel: contextLabelForThread(thread, detail.contextLinks),
            readSummary: latestReceipts.length
              ? `Seen by ${latestReceipts.filter((receipt) => receipt.readAt).length} participant${
                  latestReceipts.filter((receipt) => receipt.readAt).length === 1 ? '' : 's'
                }`
              : 'Unread activity',
          } satisfies MessagingThreadMeta,
        ] as const;
      } catch {
        return [
          thread.id,
          {
            contextLabel: contextLabelForThread(thread, []),
          } satisfies MessagingThreadMeta,
        ] as const;
      }
    }),
  );

  return Object.fromEntries(metaEntries) as Record<string, MessagingThreadMeta>;
}

function contextLabelForThread(
  thread: MessagingThreadSummary,
  contextLinks: MessagingThreadDetail['contextLinks'],
) {
  const primaryLink = contextLinks[0];
  if (primaryLink) {
    return `${primaryLink.contextType} linked`;
  }
  return thread.threadType.replace(/_/g, ' ');
}

function participantSummaryLabel(
  participants: MessagingThreadDetail['participants'],
  currentMembershipId: string | null,
) {
  const labels = participants.map((participant) =>
    participant.membershipId === currentMembershipId
      ? `You · ${participant.role.replace(/_/g, ' ')}`
      : participant.role.replace(/_/g, ' '),
  );
  return labels.join(' · ');
}

function messageSenderLabel(
  senderMembershipId: string,
  detail: MessagingThreadDetail,
) {
  const participant = detail.participants.find((item) => item.membershipId === senderMembershipId);
  return participant
    ? participant.role.replace(/_/g, ' ')
    : senderMembershipId;
}

function buildReadSummary(
  receipts: MessagingReadReceipt[],
  detail: MessagingThreadDetail,
  currentMembershipId: string | null,
) {
  const seenReceipts = receipts.filter((receipt) => receipt.readAt);
  if (seenReceipts.length === 0) {
    return 'No read receipts yet';
  }

  const labels = seenReceipts
    .map((receipt) => {
      if (receipt.recipientMembershipId === currentMembershipId) {
        return 'You';
      }
      const participant = detail.participants.find(
        (item) => item.membershipId === receipt.recipientMembershipId,
      );
      return participant ? participant.role.replace(/_/g, ' ') : receipt.recipientMembershipId;
    })
    .slice(0, 3);

  return `Seen by ${labels.join(', ')}${seenReceipts.length > 3 ? ` +${seenReceipts.length - 3} more` : ''}`;
}

function titleForContext(contextMode: MessagingContextMode) {
  switch (contextMode) {
    case 'patient':
      return 'Patient discussion';
    case 'visit':
      return 'Visit discussion';
    case 'task':
      return 'Task-linked discussion';
    case 'admin':
      return 'Messaging admin surface';
    default:
      return 'Messaging workspace';
  }
}

function descriptionForContext(contextMode: MessagingContextMode) {
  switch (contextMode) {
    case 'patient':
      return 'Epic 9 patient-linked discussion keeps care-team communication attached to the patient context.';
    case 'visit':
      return 'Epic 9 visit-linked discussion keeps schedule coordination attached to the visit instead of a generic inbox.';
    case 'task':
      return 'Epic 9 task-linked discussion keeps workflow follow-up attached to the task template context.';
    case 'admin':
      return 'Epic 9 admin routes now manage reusable staff groups, branch broadcasts, and escalation-aware oversight.';
    default:
      return 'Epic 9 now provides a real secure inbox, thread detail, read receipts, escalation state, and coordination workflows.';
  }
}

function contextStatusLabel(
  contextMode: MessagingContextMode,
  patientId?: string,
  visitId?: string,
  taskTemplateId?: string,
) {
  switch (contextMode) {
    case 'patient':
      return `Patient-linked discussion · ${patientId}`;
    case 'visit':
      return `Visit-linked discussion · ${visitId}`;
    case 'task':
      return `Task-linked discussion · ${taskTemplateId}`;
    default:
      return 'General messaging workspace';
  }
}
