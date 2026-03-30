import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  type BranchSummary,
  type CertificationPeriodStatus,
  type ComplianceDashboardAggregate,
  type ComplianceDashboardPatientSummary,
  type ComplianceReadinessStatus,
  fetchBranches,
  fetchComplianceDashboard,
  fetchComplianceDashboardPatients,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ComplianceAuditCallout,
  ComplianceModuleState,
  CompliancePanel,
  ComplianceStatusBanner,
  ComplianceWorkspaceGrid,
  ComplianceWorkspaceShell,
} from '../components/ComplianceWorkspaceFoundation';

type DashboardReadinessFilter = ComplianceReadinessStatus | 'ALL';
type DashboardCertificationFilter = CertificationPeriodStatus | 'ALL';

function branchValue(branchId: string | 'ALL') {
  return branchId !== 'ALL' ? branchId : undefined;
}

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

export function ComplianceCommandCenterPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [dashboard, setDashboard] = useState<ComplianceDashboardAggregate[]>([]);
  const [patients, setPatients] = useState<ComplianceDashboardPatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');
  const [readinessStatus, setReadinessStatus] = useState<DashboardReadinessFilter>('ALL');
  const [certificationStatus, setCertificationStatus] =
    useState<DashboardCertificationFilter>('ALL');
  const [riskSeverity, setRiskSeverity] = useState('');

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const canViewWorkspace = canAccessPermission(profile, 'view_compliance_workspace');
  const canViewDashboard = canAccessPermission(profile, 'view_compliance_dashboard');
  const canViewAudit = canAccessPermission(profile, 'view_audit_log');

  useEffect(() => {
    if (state.status !== 'authenticated' || !canViewWorkspace || !canViewDashboard) {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [branchList, dashboardResponse, patientResponse] = await Promise.all([
          fetchBranches(authContext),
          fetchComplianceDashboard({
            ...authContext,
            branchId: branchValue(branchId),
            readinessStatus,
          }),
          fetchComplianceDashboardPatients({
            ...authContext,
            branchId: branchValue(branchId),
            readinessStatus,
            certificationPeriodStatus: certificationStatus,
            riskSeverity: riskSeverity.trim() || undefined,
            page: 0,
            size: 100,
          }),
        ]);
        setBranches(branchList);
        setDashboard(dashboardResponse);
        setPatients(patientResponse.content);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the compliance command center right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, branchId, canViewDashboard, canViewWorkspace, certificationStatus, readinessStatus, riskSeverity, state.status]);

  if (!canViewWorkspace || !canViewDashboard) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE11-10"
          title="Compliance command center is not available for this role."
          message="Only authorized operations and compliance roles can open the coordinator-facing Epic 11 summary route."
          primaryLabel="Back to compliance"
          primaryLink="/app/compliance"
        />
      </div>
    );
  }

  const patientsWithGap = patients.filter((item) => item.gapCount > 0);
  const patientsWithCertificationRisk = patients.filter(
    (item) => item.certificationPeriodStatus === 'UPCOMING_EXPIRY' || item.certificationPeriodStatus === 'EXPIRED',
  );
  const patientsWithAcknowledgmentGap = patients.filter((item) => item.acknowledgmentGapCount > 0);
  const patientsWithRisk = patients.filter((item) => item.activeRiskReminderCount > 0);

  return (
    <ComplianceWorkspaceShell
      eyebrow="Frontend Stories FE11-10 · FE11-11 · FE11-12 · FE11-13"
      title="Compliance command center"
      description="Coordinator-facing Epic 11 visibility highlights patient compliance gaps, certification risk, acknowledgment issues, and active risk reminders without exposing more detail than needed for triage."
    >
      <ComplianceWorkspaceGrid>
        <CompliancePanel
          title="Command-center filters"
          description="Branch, readiness, certification, and severity filters keep the coordinator view focused on the right compliance follow-up lane."
        >
          <div className="compliance-filter-grid">
            <label className="field">
              <span>Branch</span>
              <select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Readiness</span>
              <select
                className="input"
                value={readinessStatus}
                onChange={(event) => setReadinessStatus(event.target.value as DashboardReadinessFilter)}
              >
                <option value="ALL">All readiness states</option>
                <option value="READY">Ready</option>
                <option value="WARNING">Warning</option>
                <option value="NON_COMPLIANT">Non-compliant</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </label>
            <label className="field">
              <span>Certification</span>
              <select
                className="input"
                value={certificationStatus}
                onChange={(event) =>
                  setCertificationStatus(event.target.value as DashboardCertificationFilter)
                }
              >
                <option value="ALL">All certification states</option>
                <option value="CURRENT">Current</option>
                <option value="UPCOMING_EXPIRY">Upcoming expiry</option>
                <option value="EXPIRED">Expired</option>
                <option value="MISSING">Missing</option>
              </select>
            </label>
            <label className="field">
              <span>Risk severity</span>
              <input
                className="input"
                placeholder="Filter by severity label"
                value={riskSeverity}
                onChange={(event) => setRiskSeverity(event.target.value)}
              />
            </label>
          </div>
        </CompliancePanel>

        <CompliancePanel
          title="Coordinator summary"
          description="This summary keeps branch-level and patient-level compliance visibility actionable without turning the command center into a full patient workspace."
        >
          {loading ? <p className="session-note">Loading compliance command center...</p> : null}
          {error ? (
            <ComplianceModuleState title="Command center failed to load" description={error} variant="error" />
          ) : null}
          {!loading && !error ? (
            <div className="compliance-summary-grid">
              <ComplianceStatusBanner
                status={`${dashboard.length} branch summary`}
                summary="Branch-level compliance summary rows currently visible in the command center."
                tone={dashboard.length > 0 ? 'success' : 'readonly'}
              />
              <ComplianceStatusBanner
                status={`${patientsWithGap.length} patient gap`}
                summary="Patients with checklist or documentation gaps requiring follow-up."
                tone={patientsWithGap.length > 0 ? 'warning' : 'success'}
              />
              <ComplianceStatusBanner
                status={`${patientsWithCertificationRisk.length} certification risk`}
                summary="Patients with expiring or expired certification windows."
                tone={patientsWithCertificationRisk.length > 0 ? 'warning' : 'success'}
              />
              <ComplianceStatusBanner
                status={`${patientsWithAcknowledgmentGap.length} acknowledgment gap`}
                summary="Patients missing or carrying expired acknowledgments."
                tone={patientsWithAcknowledgmentGap.length > 0 ? 'warning' : 'success'}
              />
              <ComplianceStatusBanner
                status={`${patientsWithRisk.length} active risk patient`}
                summary="Patients with active risk reminders visible in the compliance summary."
                tone={patientsWithRisk.length > 0 ? 'warning' : 'success'}
              />
            </div>
          ) : null}
        </CompliancePanel>

        <CompliancePanel
          title="Actionable lanes"
          description="Each lane routes the coordinator directly into the relevant patient compliance surface."
        >
          {!loading && !error && patients.length === 0 ? (
            <ComplianceModuleState
              title="No command-center items"
              description="The selected filters did not return any patient compliance visibility rows."
              variant="empty"
            />
          ) : null}
          <div className="compliance-command-list">
            {patientsWithGap.slice(0, 5).map((item) => (
              <Link className="compliance-command-card" key={`gap-${item.patientId}`} to={`/app/compliance/patients/${item.patientId}/documentation-gaps`}>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>{item.gapCount} checklist or documentation gap(s)</p>
                <small>{item.branchName} · Evaluated {formatDateTime(item.evaluatedAt)}</small>
              </Link>
            ))}
            {patientsWithCertificationRisk.slice(0, 5).map((item) => (
              <Link className="compliance-command-card" key={`cert-${item.patientId}`} to={`/app/compliance/patients/${item.patientId}/certification-periods`}>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>{humanizeToken(item.certificationPeriodStatus)} certification state</p>
                <small>{item.branchName} · Open certification route</small>
              </Link>
            ))}
            {patientsWithAcknowledgmentGap.slice(0, 5).map((item) => (
              <Link className="compliance-command-card" key={`ack-${item.patientId}`} to={`/app/compliance/patients/${item.patientId}/acknowledgments`}>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>{item.acknowledgmentGapCount} acknowledgment gap(s)</p>
                <small>{item.branchName} · Open acknowledgment route</small>
              </Link>
            ))}
            {patientsWithRisk.slice(0, 5).map((item) => (
              <Link className="compliance-command-card" key={`risk-${item.patientId}`} to={`/app/compliance/patients/${item.patientId}/risk-reminders`}>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>{item.activeRiskReminderCount} active risk reminder(s)</p>
                <small>{item.branchName} · Open risk route</small>
              </Link>
            ))}
          </div>
        </CompliancePanel>

        <CompliancePanel
          title="Minimal patient context"
          description="The command center keeps patient and documentation context intentionally terse while still giving operations the next correct route."
        >
          {patients.slice(0, 6).map((item) => (
            <div className="compliance-list-row" key={`summary-${item.patientId}`}>
              <div>
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <p>{item.branchName}</p>
              </div>
              <div className="compliance-list-meta">
                <span>{humanizeToken(item.readinessStatus)}</span>
                <span>{humanizeToken(item.certificationPeriodStatus)}</span>
                <span>{item.gapCount} gap(s)</span>
                <span>{item.activeRiskReminderCount} risk</span>
              </div>
            </div>
          ))}
        </CompliancePanel>

        <CompliancePanel
          title="Audit-aware compliance"
          description="The command center stays privacy-aware, while authorized users can jump to audit activity for the controlled operations underneath."
        >
          <ComplianceAuditCallout
            title="Controlled compliance operations"
            body="Acknowledgment changes, certification updates, reminder resolution, and status recalculation are logged backend operations. This summary keeps patient detail minimal and pushes deeper investigation into patient compliance or audit screens."
            links={[
              { to: '/app/compliance', label: 'Open compliance dashboard' },
              ...(canViewAudit
                ? [
                    {
                      to: '/app/admin/audit?actionType=EPIC11_CONSENT_ACKNOWLEDGMENT_RECORDED',
                      label: 'Acknowledgment audit activity',
                    },
                    {
                      to: '/app/admin/audit?actionType=EPIC11_CERTIFICATION_PERIOD_RECORDED',
                      label: 'Certification audit activity',
                    },
                    {
                      to: '/app/admin/audit?actionType=EPIC11_STATUS_PROJECTION_RECALCULATED',
                      label: 'Recalculation audit activity',
                    },
                  ]
                : []),
            ]}
          />
        </CompliancePanel>
      </ComplianceWorkspaceGrid>
    </ComplianceWorkspaceShell>
  );
}
