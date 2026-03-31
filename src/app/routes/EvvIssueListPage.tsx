import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  EvvComplianceOutcome,
  EvvVerificationStatus,
  fetchEvvReadiness,
  fetchMobileVisitExceptions,
  MobileEvvSummaryResponse,
  MobileVisitExceptionResponse,
  VisitExceptionStatus,
} from '../auth/session-api';
import { useAccess } from '../access/access-context';
import { canAccessPermission } from '../access/access-control';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

type EvvIssueFilters = {
  day: string;
  branchId: string;
  verificationStatus: '' | EvvVerificationStatus;
  complianceOutcome: '' | EvvComplianceOutcome;
  exceptionStatus: '' | VisitExceptionStatus;
};

function todayIsoDate() {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function humanizeEnum(value: string) {
  return value.split('_').join(' ').toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function auditHref(actionType: string, visitId?: string) {
  const search = new URLSearchParams();
  search.set('actionType', actionType);
  if (visitId) {
    search.set('targetUserId', visitId);
  }
  return `/app/admin/audit?${search.toString()}`;
}

function detailHref(summary: MobileEvvSummaryResponse) {
  return `/app/scheduling?visitId=${encodeURIComponent(summary.visitId)}`;
}

const INITIAL_FILTERS: EvvIssueFilters = {
  day: todayIsoDate(),
  branchId: '',
  verificationStatus: '',
  complianceOutcome: '',
  exceptionStatus: 'OPEN',
};

export function EvvIssueListPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [filters, setFilters] = useState<EvvIssueFilters>(INITIAL_FILTERS);
  const [readiness, setReadiness] = useState<MobileEvvSummaryResponse[]>([]);
  const [exceptions, setExceptions] = useState<MobileVisitExceptionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canManageExceptions = canAccessPermission(profile, 'manage_mobile_evv_exceptions');
  const canViewMissedVisits = canAccessPermission(profile, 'view_mobile_missed_visits');
  const canReceiveNotifications = canAccessPermission(profile, 'receive_mobile_evv_notifications');

  const missedVisitIssues = readiness.filter(
    (item) =>
      item.missedVisitReported ||
      item.complianceOutcome === 'MISSED_VISIT' ||
      item.verificationStatus === 'MISSED_VISIT_REPORTED',
  );

  if (state.status !== 'authenticated') {
    return null;
  }

  useEffect(() => {
    void loadIssues(INITIAL_FILTERS);
  }, []);

  async function loadIssues(targetFilters: EvvIssueFilters = filters) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [readinessResponse, exceptionResponse] = await Promise.all([
        fetchEvvReadiness({
          ...authContext,
          day: targetFilters.day,
          branchId: targetFilters.branchId || undefined,
          verificationStatus: targetFilters.verificationStatus || undefined,
          complianceOutcome: targetFilters.complianceOutcome || undefined,
        }),
        canManageExceptions || canReceiveNotifications
          ? fetchMobileVisitExceptions({
              ...authContext,
              status: targetFilters.exceptionStatus || undefined,
            })
          : Promise.resolve([]),
      ]);

      setReadiness(readinessResponse);
      setExceptions(
        exceptionResponse.filter(
          (item) => !targetFilters.branchId || item.branchId === targetFilters.branchId,
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load EVV issues right now.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadIssues(filters);
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Epic 7 EVV</span>
          <h2>EVV issue visibility is restricted.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for the coordinator EVV issue list.
          </p>
        </section>
        <AccessDeniedPanel message="Only authorized coordinators, reviewers, or supervisors can view EVV issues." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card panel-span-2">
        <span className="eyebrow">Epic 7 EVV</span>
        <h2>Review open EVV issues before they age into larger operational problems.</h2>
        <p>
          This focused screen surfaces open missed visits and EVV exceptions without waiting for the broader QA
          workspace. Device-proof internals stay normalized and private.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Issue filters</h3>
          <p>Branch and status filters are applied where the backend supports them directly.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <div className="toolbar-grid evv-issues-toolbar">
            <label className="field field-light compact-field">
              <span>Day</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}
                type="date"
                value={filters.day}
              />
            </label>
            <label className="field field-light compact-field">
              <span>Branch ID</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}
                placeholder="Optional branch UUID"
                type="text"
                value={filters.branchId}
              />
            </label>
            <label className="field field-light compact-field">
              <span>Verification status</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    verificationStatus: event.target.value as EvvIssueFilters['verificationStatus'],
                  }))
                }
                value={filters.verificationStatus}
              >
                <option value="">All</option>
                <option value="PENDING_VERIFICATION">Pending verification</option>
                <option value="EXCEPTION_OPEN">Exception open</option>
                <option value="MISSED_VISIT_REPORTED">Missed visit reported</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>
            <label className="field field-light compact-field">
              <span>Compliance outcome</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    complianceOutcome: event.target.value as EvvIssueFilters['complianceOutcome'],
                  }))
                }
                value={filters.complianceOutcome}
              >
                <option value="">All</option>
                <option value="BLOCKED">Blocked</option>
                <option value="READY_WITH_WARNING">Ready with warning</option>
                <option value="MISSED_VISIT">Missed visit</option>
              </select>
            </label>
            <label className="field field-light compact-field">
              <span>Exception status</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    exceptionStatus: event.target.value as EvvIssueFilters['exceptionStatus'],
                  }))
                }
                value={filters.exceptionStatus}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>
          </div>
          <div className="toolbar-actions">
            <button className="button" type="submit">
              {loading ? 'Loading EVV issues...' : 'Apply filters'}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                void loadIssues(INITIAL_FILTERS);
              }}
              type="button"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {errorMessage ? (
        <section className="panel panel-span-2">
          <div className="callout-card callout-card-error">
            <strong>EVV issue load failed</strong>
            <p>{errorMessage}</p>
          </div>
        </section>
      ) : null}

      {canViewMissedVisits ? (
        <section className="panel panel-span-2">
          <div className="panel-header">
            <h3>Missed visits</h3>
            <p>Derived from the backend readiness feed when a visit has already moved into a missed-visit state.</p>
          </div>

          {missedVisitIssues.length ? (
            <div className="evv-issue-list">
              {missedVisitIssues.map((item) => (
                <article className="evv-issue-card" key={`missed-${item.visitId}`}>
                  <div className="evv-issue-header">
                    <div>
                      <span className="eyebrow">Missed Visit</span>
                      <h4>{humanizeEnum(item.verificationStatus)}</h4>
                    </div>
                    <span className="status-pill status-pill-attention">
                      {humanizeEnum(item.complianceOutcome)}
                    </span>
                  </div>
                  <dl className="summary-grid">
                    <div>
                      <dt>Visit ID</dt>
                      <dd>{item.visitId}</dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>{item.branchId ?? 'No branch assigned'}</dd>
                    </div>
                    <div>
                      <dt>Open exceptions</dt>
                      <dd>{item.openExceptionCount}</dd>
                    </div>
                    <div>
                      <dt>Warnings</dt>
                      <dd>{item.warnings.length ? item.warnings.join(' · ') : 'None'}</dd>
                    </div>
                  </dl>
                  <div className="callout-card">
                    <strong>Controlled status</strong>
                    <p>
                      EVV missed-visit outcomes are logged and privacy-sensitive. This screen avoids exposing raw
                      device metadata or patient-only details.
                    </p>
                  </div>
                  <div className="evv-issue-actions">
                    <Link className="text-link" to={detailHref(item)}>
                      Open scheduling context
                    </Link>
                    <Link className="text-link" to={auditHref('MOBILE_MISSED_VISIT_REPORTED')}>
                      Open audit activity
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="callout-card">
              <strong>No missed visits matched the current filters.</strong>
              <p>When the readiness feed reports missed visits, they will appear here for quick operational follow-up.</p>
            </div>
          )}
        </section>
      ) : null}

      {(canManageExceptions || canReceiveNotifications) ? (
        <section className="panel panel-span-2">
          <div className="panel-header">
            <h3>Open EVV exceptions</h3>
            <p>Exception state stays explicit so warning, blocking, escalated, and resolved outcomes are easy to separate.</p>
          </div>

          {exceptions.length ? (
            <div className="evv-issue-list">
              {exceptions.map((item) => (
                <article className="evv-issue-card" key={item.id}>
                  <div className="evv-issue-header">
                    <div>
                      <span className="eyebrow">Verification Exception</span>
                      <h4>{humanizeEnum(item.exceptionType)}</h4>
                    </div>
                    <span className={`status-pill ${item.severity === 'CRITICAL' || item.severity === 'HIGH' ? 'status-pill-attention' : ''}`}>
                      {humanizeEnum(item.status)}
                    </span>
                  </div>
                  <dl className="summary-grid">
                    <div>
                      <dt>Visit ID</dt>
                      <dd>{item.visitId}</dd>
                    </div>
                    <div>
                      <dt>Severity</dt>
                      <dd>{humanizeEnum(item.severity)}</dd>
                    </div>
                    <div>
                      <dt>Reason</dt>
                      <dd>{item.reasonCode}</dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>{item.branchId ?? 'No branch assigned'}</dd>
                    </div>
                  </dl>
                  <p className="support-copy">{item.narrative}</p>
                  <div className="callout-card">
                    <strong>Audit-aware review</strong>
                    <p>
                      Exception creation, acknowledgment, supervisor notification, and escalation are controlled EVV
                      operations and should be confirmed through the audit log when needed.
                    </p>
                  </div>
                  <div className="evv-issue-actions">
                    <Link className="text-link" to={`/app/scheduling?visitId=${encodeURIComponent(item.visitId)}`}>
                      Open scheduling context
                    </Link>
                    <Link className="text-link" to={auditHref('EVV_EXCEPTION_RECORDED')}>
                      Open audit activity
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="callout-card">
              <strong>No EVV exceptions matched the current filters.</strong>
              <p>Open exception records will appear here once the backend returns them for the selected scope.</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
