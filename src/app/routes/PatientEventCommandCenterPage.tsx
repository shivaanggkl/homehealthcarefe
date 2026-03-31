import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  type IncidentResponse,
  type InfectionResponse,
  type PatientEventEscalationResponse,
  type PatientEventFollowUpResponse,
  fetchBranches,
  fetchPatientEventEscalations,
  fetchPatientEventFollowUps,
  fetchPatientEventIncidents,
  fetchPatientEventInfections,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  PatientEventAuditCallout,
  PatientEventEscalationBadge,
  PatientEventModuleState,
  PatientEventPanel,
  PatientEventStatusBanner,
  PatientEventWorkspaceGrid,
  PatientEventWorkspaceShell,
} from '../components/PatientEventWorkspaceFoundation';

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
}

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

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

function eventRoute(targetType: string, targetId: string) {
  switch (targetType) {
    case 'INCIDENT_RECORD':
      return `/app/patient-events/incidents/${targetId}`;
    case 'INFECTION_RECORD':
      return `/app/patient-events/infections/${targetId}`;
    case 'WOUND_RECORD':
      return `/app/patient-events/wounds/${targetId}`;
    default:
      return '/app/patient-events';
  }
}

export function PatientEventCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [infections, setInfections] = useState<InfectionResponse[]>([]);
  const [followUps, setFollowUps] = useState<PatientEventFollowUpResponse[]>([]);
  const [escalations, setEscalations] = useState<PatientEventEscalationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canViewWorkspace = canAccessPermission(profile, 'view_patient_event_workspace');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const effectiveBranchId = branchValue(branchId);
        const [branchResponse, incidentResponse, infectionResponse, followUpResponse, escalationResponse] =
          await Promise.all([
            fetchBranches(authContext),
            fetchPatientEventIncidents({
              ...authContext,
              branchId: effectiveBranchId,
              status: 'OPEN',
            }),
            fetchPatientEventInfections({
              ...authContext,
              branchId: effectiveBranchId,
              status: 'ACTIVE',
            }),
            fetchPatientEventFollowUps({
              ...authContext,
              status: 'OPEN',
              overdueAsOf: new Date().toISOString(),
            }),
            fetchPatientEventEscalations({
              ...authContext,
              status: 'ACTIVE',
            }),
          ]);
        setBranches(branchResponse);
        setIncidents(incidentResponse);
        setInfections(infectionResponse);
        setFollowUps(
          followUpResponse.filter((item) =>
            effectiveBranchId ? item.branchId === effectiveBranchId : true,
          ),
        );
        setEscalations(
          escalationResponse.filter((item) =>
            effectiveBranchId ? item.branchId === effectiveBranchId : true,
          ),
        );
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the patient-event command center right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, branchId, canViewWorkspace, state.status]);

  if (!canViewWorkspace) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE12-11"
          title="Patient-event command center is not available for this role."
          message="Only authorized operations and review roles can open the coordinator-facing Epic 12 summary screen."
          primaryLabel="Back to patient events"
          primaryLink="/app/patient-events"
        />
      </div>
    );
  }

  const overdueFollowUps = followUps.filter(
    (item) => new Date(item.dueAt).getTime() < Date.now() && item.status === 'OPEN',
  );
  const recentEscalations = escalations.slice(0, 5);
  const incidentLane = incidents.slice(0, 5);
  const infectionLane = infections.slice(0, 5);

  return (
    <PatientEventWorkspaceShell
      eyebrow="Frontend Stories FE12-11 · FE12-12 · FE12-13 · FE12-14"
      title="Patient-event command center"
      description="Coordinator-facing Epic 12 visibility keeps open incidents, active infections, escalated records, and overdue follow-up work easy to triage without exposing more patient-event detail than necessary."
    >
      <PatientEventWorkspaceGrid>
        <PatientEventPanel
          title="Command-center filters"
          description="Branch-level filtering keeps urgent patient-event visibility scoped to the operating lane you need."
        >
          <div className="patient-event-toolbar patient-event-command-toolbar">
            <label>
              Branch
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </PatientEventPanel>

        <PatientEventPanel
          title="Coordinator summary"
          description="This summary keeps the Epic 12 command center focused on actionable counts and routing."
        >
          {loading ? <p className="session-note">Loading patient-event command center...</p> : null}
          {error ? (
            <PatientEventModuleState title="Command center failed to load" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="patient-event-card-grid">
              <Link className="patient-event-summary-card" to="/app/patient-events/incidents">
                <strong>{incidents.length}</strong>
                <span>Open incidents</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/infections">
                <strong>{infections.length}</strong>
                <span>Active infections</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/escalations">
                <strong>{escalations.length}</strong>
                <span>Escalated events</span>
              </Link>
              <Link className="patient-event-summary-card" to="/app/patient-events/follow-ups">
                <strong>{overdueFollowUps.length}</strong>
                <span>Overdue follow-up</span>
              </Link>
            </div>
          ) : null}
        </PatientEventPanel>

        <PatientEventPanel
          title="Actionable lanes"
          description="Each lane routes directly into the relevant Epic 12 surface so coordinators can move quickly."
        >
          {!loading && !error && incidents.length === 0 && infections.length === 0 && overdueFollowUps.length === 0 && escalations.length === 0 ? (
            <PatientEventModuleState
              title="No command-center items"
              description="The selected branch filter did not return any open incident, infection, escalation, or overdue follow-up work."
              variant="empty"
            />
          ) : null}
          {!loading && !error ? (
            <div className="patient-event-command-grid">
              <div className="patient-event-command-lane">
                <h3>Open incidents</h3>
                {incidentLane.length ? (
                  incidentLane.map((incident) => (
                    <Link className="patient-event-command-card" key={incident.id} to={`/app/patient-events/incidents/${incident.id}`}>
                      <strong>{incident.incidentType}</strong>
                      <p>{incident.summary}</p>
                      <small>Reported {formatDateTime(incident.reportedAt)}</small>
                    </Link>
                  ))
                ) : (
                  <PatientEventStatusBanner title="No open incidents" tone="success">
                    Incident triage is currently clear for this branch filter.
                  </PatientEventStatusBanner>
                )}
              </div>

              <div className="patient-event-command-lane">
                <h3>Active infections</h3>
                {infectionLane.length ? (
                  infectionLane.map((infection) => (
                    <Link className="patient-event-command-card" key={infection.id} to={`/app/patient-events/infections/${infection.id}`}>
                      <strong>{infection.infectionType}</strong>
                      <p>{infection.summary}</p>
                      <small>Identified {formatDateTime(infection.identifiedAt)}</small>
                    </Link>
                  ))
                ) : (
                  <PatientEventStatusBanner title="No active infections" tone="success">
                    Infection follow-up is currently clear for this branch filter.
                  </PatientEventStatusBanner>
                )}
              </div>

              <div className="patient-event-command-lane">
                <h3>Overdue follow-up</h3>
                {overdueFollowUps.length ? (
                  overdueFollowUps.slice(0, 5).map((followUp) => (
                    <Link
                      className="patient-event-command-card"
                      key={followUp.id}
                      to={eventRoute(followUp.targetType, followUp.targetId)}
                    >
                      <strong>{humanizeToken(followUp.targetType)}</strong>
                      <p>{followUp.followUpNote || 'No follow-up note recorded.'}</p>
                      <small>Due {formatDateTime(followUp.dueAt)}</small>
                    </Link>
                  ))
                ) : (
                  <PatientEventStatusBanner title="No overdue follow-up" tone="success">
                    Follow-up deadlines are currently in range for this branch filter.
                  </PatientEventStatusBanner>
                )}
              </div>

              <div className="patient-event-command-lane">
                <h3>Escalated events</h3>
                {recentEscalations.length ? (
                  recentEscalations.map((escalation) => (
                    <Link
                      className="patient-event-command-card"
                      key={escalation.id}
                      to={eventRoute(escalation.targetType, escalation.targetId)}
                    >
                      <strong>{humanizeToken(escalation.targetType)}</strong>
                      <p>{escalation.reasonTag || 'Escalation reason not supplied.'}</p>
                      <small>{formatDateTime(escalation.escalatedAt)}</small>
                    </Link>
                  ))
                ) : (
                  <PatientEventStatusBanner title="No active escalations" tone="success">
                    Escalation routing is currently clear for this branch filter.
                  </PatientEventStatusBanner>
                )}
              </div>
            </div>
          ) : null}
        </PatientEventPanel>

        <PatientEventPanel
          title="Minimal patient-event context"
          description="This summary surface stays intentionally terse so sensitive patient, visit, and evidence detail remains in the dedicated workspace routes."
        >
          {!loading && !error ? (
            <div className="patient-event-list">
              {recentEscalations.map((escalation) => (
                <div className="patient-event-list-item" key={escalation.id}>
                  <div>
                    <strong>{humanizeToken(escalation.targetType)}</strong>
                    <p>{escalation.reasonTag || 'Escalated event requires review.'}</p>
                  </div>
                  <div className="patient-event-list-meta">
                    <PatientEventEscalationBadge label={humanizeToken(escalation.status)} tone="danger" />
                    <span>{humanizeToken(escalation.severityLabel)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </PatientEventPanel>

        <PatientEventPanel
          title="Audit-aware patient-event handling"
          description="Controlled patient-event operations remain privacy-aware here, while authorized reviewers can jump to matching audit activity when needed."
        >
          <PatientEventModuleState
            title="Controlled patient-event operations"
            description="Incident, infection, wound, follow-up, escalation, and evidence actions are logged backend operations. The command center keeps patient and evidence detail minimal and routes deeper work into the appropriate Epic 12 screen."
            variant="readonly"
          />
          <PatientEventAuditCallout
            title="Audit-aware Epic 12 visibility"
            body="Authorized users can review later audit activity for incident creation, follow-up assignment, escalation routing, and wound-history updates without cluttering coordinator triage."
            href={canViewAudit ? '/app/admin/audit?actionType=EPIC12_PATIENT_EVENT_FOLLOW_UP_ASSIGNED' : undefined}
          />
          {canViewAudit ? (
            <div className="patient-event-context-links">
              <Link className="patient-event-inline-link" to="/app/admin/audit?actionType=EPIC12_PATIENT_EVENT_INCIDENT_CREATED">
                Incident audit activity
              </Link>
              <Link className="patient-event-inline-link" to="/app/admin/audit?actionType=EPIC12_PATIENT_EVENT_ESCALATION_CREATED">
                Escalation audit activity
              </Link>
            </div>
          ) : null}
        </PatientEventPanel>
      </PatientEventWorkspaceGrid>
    </PatientEventWorkspaceShell>
  );
}
