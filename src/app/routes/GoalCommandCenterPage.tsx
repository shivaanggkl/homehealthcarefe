import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  fetchBranches,
  fetchCarePlanSyncLinks,
  fetchGoalProgressNotes,
  fetchPatientGoals,
  type GoalProgressNoteResponse,
  type PatientGoalResponse,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  GoalAuditCallout,
  GoalModuleState,
  GoalPanel,
  GoalStatusBanner,
  GoalWorkspaceGrid,
  GoalWorkspaceShell,
} from '../components/GoalWorkspaceFoundation';

function humanizeToken(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
}

function branchName(branches: BranchSummary[], branchId: string | null | undefined) {
  if (!branchId) {
    return 'Agency-wide';
  }
  return branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
}

function isOverdue(goal: PatientGoalResponse) {
  if (!goal.targetDate || goal.status !== 'ACTIVE') {
    return false;
  }
  return new Date(goal.targetDate).getTime() < Date.now();
}

export function GoalCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [goals, setGoals] = useState<PatientGoalResponse[]>([]);
  const [recentNotes, setRecentNotes] = useState<GoalProgressNoteResponse[]>([]);
  const [unsyncedGoalIds, setUnsyncedGoalIds] = useState<string[]>([]);
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

  const canViewWorkspace = canAccessPermission(profile, 'view_goal_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const [branchResults, goalResults] = await Promise.all([
          fetchBranches(authContext),
          fetchPatientGoals(authContext),
        ]);

        const uniqueGoalIds = [...new Set(goalResults.map((goal) => goal.id))];
        const [syncGroups, noteGroups] = await Promise.all([
          Promise.all(
            uniqueGoalIds.map((goalId) =>
              fetchCarePlanSyncLinks({ ...authContext, patientGoalId: goalId }).catch(() => []),
            ),
          ),
          Promise.all(
            uniqueGoalIds.map((goalId) =>
              fetchGoalProgressNotes({ ...authContext, patientGoalId: goalId }).catch(() => []),
            ),
          ),
        ]);

        const unsyncedIds = syncGroups.flatMap((links, index) =>
          links.some((link) => link.syncStatus !== 'ALIGNED') ? [uniqueGoalIds[index]] : [],
        );

        const flattenedNotes = noteGroups
          .flat()
          .sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime())
          .slice(0, 6);

        setBranches(branchResults);
        setGoals(goalResults);
        setUnsyncedGoalIds(unsyncedIds);
        setRecentNotes(flattenedNotes);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the progression command center right now.',
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
          eyebrow="Frontend Story FE13-11"
          title="Progression command center is not available for this role."
          message="Only authorized reviewer and operations roles can open the coordinator-facing Epic 13 summary route."
          primaryLabel="Back to care progression"
          primaryLink="/app/goals"
        />
      </div>
    );
  }

  const overdueGoals = goals.filter((goal) => isOverdue(goal));
  const unmetGoals = goals.filter(
    (goal) => goal.status === 'UNMET' || goal.status === 'NOT_ATTAINED',
  );

  return (
    <GoalWorkspaceShell
      eyebrow="Frontend Stories FE13-11 · FE13-12 · FE13-13 · FE13-14"
      title="Progression command center"
      description="Coordinator-facing Epic 13 visibility keeps overdue, unmet, unsynced, and recently updated goal activity easy to triage without turning the summary route into a full patient workspace."
    >
      <GoalWorkspaceGrid>
        <GoalPanel
          title="Progression summary"
          description="This route keeps reviewer and operations follow-up focused on the highest-signal progression work."
        >
          {loading ? <p className="session-note">Loading progression command center...</p> : null}
          {error ? (
            <GoalModuleState title="Command center failed to load" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="goal-summary-grid">
              <GoalStatusBanner
                status={`${overdueGoals.length} overdue goal${overdueGoals.length === 1 ? '' : 's'}`}
                summary="Active goals whose target dates have already passed."
                tone={overdueGoals.length > 0 ? 'warning' : 'success'}
              />
              <GoalStatusBanner
                status={`${unmetGoals.length} unmet or not attained`}
                summary="Goals already marked as unmet or not attained."
                tone={unmetGoals.length > 0 ? 'warning' : 'readonly'}
              />
              <GoalStatusBanner
                status={`${unsyncedGoalIds.length} unsynced care-plan link${unsyncedGoalIds.length === 1 ? '' : 's'}`}
                summary="Goals with stale, failed, or unsynced care-plan state."
                tone={unsyncedGoalIds.length > 0 ? 'warning' : 'success'}
              />
              <GoalStatusBanner
                status={`${recentNotes.length} recent progress note${recentNotes.length === 1 ? '' : 's'}`}
                summary="Most recent longitudinal updates currently visible through Epic 13 note activity."
                tone={recentNotes.length > 0 ? 'info' : 'readonly'}
              />
            </div>
          ) : null}
        </GoalPanel>

        {canViewAudit ? (
          <GoalAuditCallout
            title="Controlled progression audit context"
            summary="Goal-state, intervention, progress-note, and sync actions are logged. This summary keeps patient context minimal while still routing authorized users to the matching Epic 13 audit activity."
            links={[
              {
                label: 'Goal-state audit',
                href: '/app/admin/audit?actionType=CARE_PROGRESSION_GOAL_STATE_CHANGED',
              },
              {
                label: 'Progress-note audit',
                href: '/app/admin/audit?actionType=CARE_PROGRESSION_PROGRESS_NOTE_ADDED',
              },
              {
                label: 'Care-plan sync audit',
                href: '/app/admin/audit?actionType=CARE_PROGRESSION_CAREPLAN_SYNC_UPDATED',
              },
            ]}
          />
        ) : null}

        <GoalPanel
          title="Actionable lanes"
          description="Each lane links directly into the relevant Epic 13 surface instead of forcing reviewers through a single monolithic route."
        >
          {!loading && !error && goals.length === 0 ? (
            <GoalModuleState
              title="No progression backlog right now"
              description="The command center remains available even when there are no active Epic 13 items to triage."
              variant="empty"
            />
          ) : null}
          {!loading && !error ? (
            <div className="goal-command-grid">
              <div className="goal-command-lane">
                <strong>Overdue goals</strong>
                <p>Route directly into the goal detail that needs target-date follow-up.</p>
                <div className="goal-command-list">
                  {overdueGoals.slice(0, 4).map((goal) => (
                    <Link className="goal-workspace-card goal-workspace-card-available" key={goal.id} to={`/app/goals/patient-goals/${goal.id}`}>
                      <strong>{goal.title}</strong>
                      <p>{branchName(branches, goal.branchId)} · Due {formatDate(goal.targetDate)}</p>
                      <span>Open goal detail</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="goal-command-lane">
                <strong>Unmet and not attained</strong>
                <p>Jump into the patient-goal route for the goals already flagged as off track.</p>
                <div className="goal-command-list">
                  {unmetGoals.slice(0, 4).map((goal) => (
                    <Link className="goal-workspace-card goal-workspace-card-available" key={goal.id} to={`/app/goals/patient-goals/${goal.id}`}>
                      <strong>{goal.title}</strong>
                      <p>{humanizeToken(goal.status)} · {branchName(branches, goal.branchId)}</p>
                      <span>Open state detail</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="goal-command-lane">
                <strong>Unsynced care-plan links</strong>
                <p>Route directly into the sync surface when a goal no longer looks aligned with care-plan context.</p>
                <div className="goal-command-list">
                  {goals
                    .filter((goal) => unsyncedGoalIds.includes(goal.id))
                    .slice(0, 4)
                    .map((goal) => (
                      <Link
                        className="goal-workspace-card goal-workspace-card-available"
                        key={goal.id}
                        to={`/app/goals/patient-goals/${goal.id}/careplan-sync`}
                      >
                        <strong>{goal.title}</strong>
                        <p>{branchName(branches, goal.branchId)} · Care-plan sync follow-up</p>
                        <span>Open sync route</span>
                      </Link>
                    ))}
                </div>
              </div>

              <div className="goal-command-lane">
                <strong>Recent note activity</strong>
                <p>Review the most recent progression notes without exposing more patient detail than needed for triage.</p>
                <div className="goal-command-list">
                  {recentNotes.map((note) => {
                    const goal = goals.find((item) => item.id === note.patientGoalId);
                    return (
                      <Link
                        className="goal-workspace-card goal-workspace-card-read-only"
                        key={note.id}
                        to={`/app/goals/patient-goals/${note.patientGoalId}/progress-notes`}
                      >
                        <strong>{goal?.title ?? 'Goal note activity'}</strong>
                        <p>{note.progressionSummary ?? note.noteText}</p>
                        <span>{formatDateTime(note.capturedAt)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </GoalPanel>
      </GoalWorkspaceGrid>
    </GoalWorkspaceShell>
  );
}
