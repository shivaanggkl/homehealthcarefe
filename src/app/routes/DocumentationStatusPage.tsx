import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccess } from '../access/access-context';
import { canAccessPermission } from '../access/access-control';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  DocumentationRecordStatus,
  type BranchSummary,
  type VisitDocumentationSummary,
  fetchBranches,
  fetchVisitDocumentationRecords,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  DocumentationAuditCallout,
  DocumentationModuleState,
  DocumentationPanel,
  DocumentationSectionNavigation,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

type StatusFilter = DocumentationRecordStatus | 'ALL';

function documentationAuditHref(actionType: string, branchId?: string) {
  const search = new URLSearchParams({ actionType });
  if (branchId) {
    search.set('branchId', branchId);
  }
  return `/app/admin/audit?${search.toString()}`;
}

function displayStatus(status: DocumentationRecordStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'Incomplete';
    case 'DRAFT':
      return 'Draft';
    case 'SUBMITTED':
      return 'Submitted';
    case 'AMENDED':
      return 'Amended';
    case 'LOCKED':
      return 'Locked';
    default:
      return status;
  }
}

export function DocumentationStatusPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [records, setRecords] = useState<VisitDocumentationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [caregiverFilter, setCaregiverFilter] = useState('');

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const [branchList, recordResponse] = await Promise.all([
          fetchBranches(authContext),
          fetchVisitDocumentationRecords({
            ...authContext,
            branchId,
            status,
            from: from || undefined,
            to: to || undefined,
            page: 0,
            size: 100,
          }),
        ]);
        setBranches(branchList);
        setRecords(recordResponse.content);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Unable to load documentation status visibility right now.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, branchId, from, state.status, status, to]);

  const filteredRecords = useMemo(() => {
    const patientQuery = patientFilter.trim().toLowerCase();
    const caregiverQuery = caregiverFilter.trim().toLowerCase();
    return records.filter((record) => {
      const patientMatches =
        !patientQuery ||
        `${record.patientFirstName} ${record.patientLastName}`.toLowerCase().includes(patientQuery);
      const caregiverMatches =
        !caregiverQuery || record.authorEmail.toLowerCase().includes(caregiverQuery);
      return patientMatches && caregiverMatches;
    });
  }, [caregiverFilter, patientFilter, records]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE8-13"
          message="Only authorized coordinators and admins can open the documentation status list."
          primaryLabel="Back to documentation"
          primaryLink="/app/documentation"
          title="Documentation status visibility is restricted."
        />
      </div>
    );
  }

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Story FE8-13"
      title="Documentation status visibility"
      description="Focused documentation visibility for draft, incomplete, and submitted visit notes so coordinators can review note state without waiting for a later QA workspace."
    >
      <DocumentationSectionNavigation
        links={[
          { path: '/app/documentation', label: 'Overview', state: 'available' },
          { path: '/app/documentation/status', label: 'Status list', state: 'available' },
          {
            path: '/app/documentation/templates',
            label: 'Templates',
            state: canAccessPermission(profile, 'manage_documentation_templates') ? 'available' : 'restricted',
          },
          {
            path: '/app/documentation/task-library',
            label: 'Task library',
            state: canAccessPermission(profile, 'manage_documentation_task_library') ? 'available' : 'restricted',
          },
        ]}
      />

      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Documentation filters"
          description="Branch, status, date, patient, and caregiver filters keep coordinator visibility focused without exposing internal-only record metadata."
        >
          <div className="documentation-status-toolbar">
            <label className="field">
              <span>Branch</span>
              <select className="input" onChange={(event) => setBranchId(event.target.value)} value={branchId}>
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select className="input" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>
                <option value="ALL">All note states</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">Incomplete</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="AMENDED">Amended</option>
                <option value="LOCKED">Locked</option>
              </select>
            </label>
            <label className="field">
              <span>From</span>
              <input className="input" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            </label>
            <label className="field">
              <span>To</span>
              <input className="input" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
            </label>
            <label className="field">
              <span>Patient</span>
              <input className="input" onChange={(event) => setPatientFilter(event.target.value)} placeholder="Filter by patient name" value={patientFilter} />
            </label>
            <label className="field">
              <span>Caregiver</span>
              <input className="input" onChange={(event) => setCaregiverFilter(event.target.value)} placeholder="Filter by caregiver email" value={caregiverFilter} />
            </label>
          </div>
        </DocumentationPanel>

        <DocumentationPanel
          title="Documentation status list"
          description="Each row links directly into the relevant note and keeps print and audit review one click away for permitted users."
        >
          <DocumentationAuditCallout
            title="Status changes are controlled operations"
            body="Draft saves, submissions, amendments, and printable-summary access are audit-visible documentation events. Coordinator review keeps those links nearby without surfacing internal backend identifiers."
            links={[
              { to: documentationAuditHref('DOC_DRAFT_SAVED', branchId === 'ALL' ? undefined : branchId), label: 'Open draft-save audit activity' },
              { to: documentationAuditHref('DOC_SUBMITTED', branchId === 'ALL' ? undefined : branchId), label: 'Open submission audit activity' },
            ]}
          />

          {loading ? <p className="session-note">Loading documentation status list...</p> : null}
          {error ? <DocumentationModuleState title="Status list unavailable" description={error} variant="error" /> : null}
          {!loading && !error && filteredRecords.length === 0 ? (
            <DocumentationModuleState
              title="No documentation records match the current filters"
              description="Try broadening the branch, date, patient, or caregiver filters."
              variant="empty"
            />
          ) : null}
          <div className="documentation-record-status-list">
            {filteredRecords.map((record) => (
              <article className="documentation-record-row" key={record.id}>
                <div className="documentation-record-primary">
                  <strong>{record.templateName}</strong>
                  <p>
                    {record.patientFirstName} {record.patientLastName} · {record.branchName}
                  </p>
                  <p>{record.authorEmail}</p>
                </div>
                <div className="documentation-record-secondary">
                  <span className={`documentation-status-pill documentation-status-pill-${record.status.toLowerCase()}`}>
                    {displayStatus(record.status)}
                  </span>
                  <span>{new Date(record.lastSavedAt).toLocaleString()}</span>
                  <div className="documentation-record-actions">
                    <Link className="text-link" to={`/app/documentation/visits/${record.visitOccurrenceId}`}>
                      Open note
                    </Link>
                    <Link className="text-link" to={`/app/documentation/records/${record.id}/printable`}>
                      Print summary
                    </Link>
                    <Link
                      className="text-link"
                      to={documentationAuditHref(record.status === 'SUBMITTED' ? 'DOC_SUBMITTED' : 'DOC_DRAFT_SAVED', record.branchId)}
                    >
                      Open audit activity
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
