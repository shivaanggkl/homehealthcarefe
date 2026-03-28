import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  AuditEventEntry,
  exportAuditEvents,
  fetchAuditEvents,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

const PAGE_SIZE = 20;

type AuditFilters = {
  from: string;
  to: string;
  actorId: string;
  actionType: string;
  targetUserId: string;
  page: number;
};

const INITIAL_FILTERS: AuditFilters = {
  from: '',
  to: '',
  actorId: '',
  actionType: '',
  targetUserId: '',
  page: 0,
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function metadataPreview(value: string | null): string {
  if (!value) {
    return 'No metadata';
  }
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

export function AuditLogPage() {
  const { state } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<AuditFilters>(INITIAL_FILTERS);
  const [events, setEvents] = useState<AuditEventEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const initialFilters = useMemo<AuditFilters>(
    () => ({
      from: searchParams.get('from') ?? '',
      to: searchParams.get('to') ?? '',
      actorId: searchParams.get('actorId') ?? '',
      actionType: searchParams.get('actionType') ?? '',
      targetUserId: searchParams.get('targetUserId') ?? '',
      page: 0,
    }),
    [searchParams],
  );

  if (state.status !== 'authenticated') {
    return null;
  }

  useEffect(() => {
    setFilters(initialFilters);
    void loadAuditEvents(initialFilters);
  }, [initialFilters]);

  async function loadAuditEvents(targetFilters: AuditFilters = filters) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const response = await fetchAuditEvents({
        ...authContext,
        from: targetFilters.from ? new Date(`${targetFilters.from}T00:00:00`).toISOString() : undefined,
        to: targetFilters.to ? new Date(`${targetFilters.to}T23:59:59`).toISOString() : undefined,
        actorId: targetFilters.actorId || undefined,
        actionType: targetFilters.actionType || undefined,
        targetUserId: targetFilters.targetUserId || undefined,
        page: targetFilters.page,
        size: PAGE_SIZE,
      });
      setEvents(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load audit events.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const csv = await exportAuditEvents({
        ...authContext,
        from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
        actorId: filters.actorId || undefined,
        actionType: filters.actionType || undefined,
        targetUserId: filters.targetUserId || undefined,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-events.csv';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to export audit events.');
      }
    } finally {
      setExporting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { ...filters, page: 0 };
    setFilters(nextFilters);
    void loadAuditEvents(nextFilters);
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-21</span>
          <h2>Audit log access is restricted.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for audit log access, so the frontend
            is rendering a clear unauthorized state.
          </p>
        </section>
        <AccessDeniedPanel message="Only authorized admins and auditors can view or export audit events." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card panel-span-2">
        <span className="eyebrow">Frontend Story FE-21</span>
        <h2>Review security and operations audit activity.</h2>
        <p>
          This screen filters and pages through <code>/api/audit-events</code> and exposes a CSV export entry
          point through <code>/api/audit-events/export</code>.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Audit filters</h3>
          <p>Search by date range, actor, action type, and target user ID.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <div className="toolbar-grid">
            <label className="field field-light compact-field">
              <span>From</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                type="date"
                value={filters.from}
              />
            </label>
            <label className="field field-light compact-field">
              <span>To</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                type="date"
                value={filters.to}
              />
            </label>
            <label className="field field-light compact-field">
              <span>Actor ID</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, actorId: event.target.value }))}
                placeholder="Optional UUID"
                type="text"
                value={filters.actorId}
              />
            </label>
            <label className="field field-light compact-field">
              <span>Action type</span>
              <input
                className="input input-light"
                onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}
                placeholder="USER_LOGGED_IN"
                type="text"
                value={filters.actionType}
              />
            </label>
          </div>

          <div className="toolbar-grid">
            <label className="field field-light compact-field">
              <span>Target user ID</span>
              <input
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, targetUserId: event.target.value }))
                }
                placeholder="Optional UUID"
                type="text"
                value={filters.targetUserId}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="button" disabled={loading} type="submit">
              {loading ? 'Loading audit events...' : 'Apply filters'}
            </button>
            <button
              className="button button-secondary"
              disabled={exporting}
              onClick={() => void handleExport()}
              type="button"
            >
              {exporting ? 'Exporting CSV...' : 'Export CSV'}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <p className="alert">
            <strong>Audit log unavailable.</strong> {errorMessage}
          </p>
        ) : null}

        <div className="directory-summary">
          <span>{totalElements} matching events</span>
          <span>
            Page {filters.page + 1} of {Math.max(totalPages, 1)}
          </span>
        </div>

        <div className="directory-table">
          <div className="directory-row directory-row-header audit-row">
            <span>Occurred</span>
            <span>Action</span>
            <span>Outcome</span>
            <span>Actor</span>
            <span>Target</span>
            <span>Metadata</span>
          </div>

          {events.map((event) => (
            <div className="directory-row audit-row" key={event.id}>
              <div>{formatDateTime(event.occurredAt)}</div>
              <div>
                <strong>{event.actionType}</strong>
                <small>{event.targetType ?? 'No target type'}</small>
              </div>
              <div>
                <span className={`status-pill ${event.outcome === 'SUCCESS' ? 'status-active' : 'status-deactivated'}`}>
                  {event.outcome}
                </span>
              </div>
              <div>
                <strong>{event.actorEmail ?? 'Unknown actor'}</strong>
                <small>{event.actorId ?? event.actorType}</small>
              </div>
              <div>
                <strong>{event.targetId ?? 'No target'}</strong>
                <small>{event.branchId ?? event.agencyId ?? 'No branch/agency'}</small>
              </div>
              <div>
                <code>{metadataPreview(event.metadataJson)}</code>
              </div>
            </div>
          ))}

          {!loading && events.length === 0 ? (
            <div className="empty-state-card">
              <strong>No audit events matched the current filters.</strong>
              <p>Apply filters and load events to review security and administrative activity.</p>
            </div>
          ) : null}
        </div>

        <div className="pagination-row">
          <button
            className="button button-secondary"
            disabled={filters.page === 0 || loading}
            onClick={() => {
              const next = { ...filters, page: filters.page - 1 };
              setFilters(next);
              void loadAuditEvents(next);
            }}
            type="button"
          >
            Previous
          </button>
          <button
            className="button button-secondary"
            disabled={loading || totalPages === 0 || filters.page >= totalPages - 1}
            onClick={() => {
              const next = { ...filters, page: filters.page + 1 };
              setFilters(next);
              void loadAuditEvents(next);
            }}
            type="button"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
