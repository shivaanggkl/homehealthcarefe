import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  ConfigurationStatus,
  ServiceLineSummary,
  VisitTypeSummary,
  deactivateVisitType,
  fetchServiceLines,
  fetchVisitTypes,
  saveVisitType,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ConfigurationAuditNotice,
  confirmDestructiveConfigurationAction,
  formatConfigurationError,
} from '../components/ConfigurationSupport';
import {
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type VisitTypeFormState = {
  serviceLineId: string;
  name: string;
  code: string;
  description: string;
  defaultDurationMinutes: string;
  billable: boolean;
  displayOrder: string;
};

const INITIAL_FORM: VisitTypeFormState = {
  serviceLineId: '',
  name: '',
  code: '',
  description: '',
  defaultDurationMinutes: '60',
  billable: true,
  displayOrder: '0',
};

function mapVisitTypeToForm(item: VisitTypeSummary): VisitTypeFormState {
  return {
    serviceLineId: item.serviceLineId ?? '',
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    defaultDurationMinutes: String(item.defaultDurationMinutes),
    billable: item.billable,
    displayOrder: String(item.displayOrder),
  };
}

export function VisitTypeSetupPage() {
  const { state } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [serviceLineFilter, setServiceLineFilter] = useState<string | 'ALL'>('ALL');
  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [rows, setRows] = useState<VisitTypeSummary[]>([]);
  const [selected, setSelected] = useState<VisitTypeSummary | null>(null);
  const [form, setForm] = useState<VisitTypeFormState>(INITIAL_FORM);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  async function loadReferenceData() {
    const serviceLineResponse = await fetchServiceLines({
      ...authContext,
      status: 'ACTIVE',
      page: 0,
      size: 100,
    });
    setServiceLines(serviceLineResponse.content);
  }

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const response = await fetchVisitTypes({
        ...authContext,
        search,
        status,
        serviceLineId: serviceLineFilter,
        page: nextPage,
        size: 20,
      });
      setRows(response.content);
      setPage(response.page);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
      if (selected) {
        const refreshed = response.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(mapVisitTypeToForm(refreshed));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load visit types.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    void Promise.all([loadReferenceData(), loadRows(0)]).catch((error) => {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load visit type setup.');
      }
      setLoading(false);
    });
  }, [authContext, state.status, search, status, serviceLineFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-04"
          message="Only permitted admins can manage visit type defaults."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Visit type management is restricted."
        />
      </div>
    );
  }

  function startCreate() {
    setSelected(null);
    setForm(INITIAL_FORM);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleSelect(item: VisitTypeSummary) {
    setSelected(item);
    setForm(mapVisitTypeToForm(item));
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const wasInactive = selected?.status === 'INACTIVE';
      const saved = await saveVisitType({
        ...authContext,
        visitTypeId: selected?.id,
        serviceLineId: form.serviceLineId || undefined,
        name: form.name,
        code: form.code,
        description: form.description,
        defaultDurationMinutes: Number(form.defaultDurationMinutes),
        billable: form.billable,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapVisitTypeToForm(saved));
      setSuccessMessage(
        selected
          ? wasInactive
            ? `Visit type ${saved.name} reactivated and updated.`
            : `Visit type ${saved.name} updated.`
          : `Visit type ${saved.name} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save visit type right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: VisitTypeSummary) {
    if (!confirmDestructiveConfigurationAction(`visit type ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateVisitType({
        ...authContext,
        visitTypeId: item.id,
      });
      setSuccessMessage(`Visit type ${updated.name} deactivated.`);
      if (selected?.id === item.id) {
        setSelected(updated);
      }
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate visit type right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  function serviceLineLabel(id: string | null) {
    if (!id) {
      return 'No service line';
    }
    return serviceLines.find((item) => item.id === id)?.name ?? 'Linked service line';
  }

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button className="button button-secondary" onClick={startCreate} type="button">
            New visit type
          </button>
          <button className="button button-secondary" onClick={() => void loadRows(page)} type="button">
            Refresh
          </button>
        </div>
      }
      description="Manage visit type definitions, service line linkage, duration defaults, and billable behavior from a searchable backend-backed catalog."
      eyebrow="Frontend Story FE2-04"
      title="Visit type catalog"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Search and filter visit types by status and linked service line."
          title="Visit type records"
        >
          <div className="toolbar-row">
            <div className="toolbar-grid">
              <label className="field field-light compact-field">
                <span>Search</span>
                <input
                  className="input input-light"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or code"
                  type="search"
                  value={search}
                />
              </label>
              <label className="field field-light compact-field">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) => setStatus(event.target.value as ConfigurationStatus | 'ALL')}
                  value={status}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <label className="field field-light compact-field">
              <span>Service line filter</span>
              <select
                className="input input-light"
                onChange={(event) => setServiceLineFilter(event.target.value as string | 'ALL')}
                value={serviceLineFilter}
              >
                <option value="ALL">All service lines</option>
                {serviceLines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p className="session-note">Loading visit types...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Visit type catalog unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1.2fr 1fr 0.9fr 0.8fr 0.7fr minmax(170px, auto)' }}
            >
              <span>Name</span>
              <span>Service line</span>
              <span>Duration</span>
              <span>Billable</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No visit types found</strong>
                <p>Create a visit type or widen the filters above.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.2fr 1fr 0.9fr 0.8fr 0.7fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{serviceLineLabel(item.serviceLineId)}</span>
                  <span>{item.defaultDurationMinutes} min</span>
                  <span>{item.billable ? 'Billable' : 'Non-billable'}</span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => handleSelect(item)}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pagination-row">
            <button
              className="button button-secondary"
              disabled={page === 0 || loading}
              onClick={() => void loadRows(page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="button button-secondary"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => void loadRows(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          aside={
            selected ? (
              <span className={`status-pill status-${selected.status.toLowerCase()}`}>{selected.status}</span>
            ) : null
          }
          description="Create or edit visit types, including service line linkage and billable/duration defaults."
          title={selected ? `Edit ${selected.name}` : 'Create visit type'}
        >
          <ConfigurationAuditNotice subject="visit type defaults" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <label className="field field-light">
              <span>Service line</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceLineId: event.target.value }))
                }
                value={form.serviceLineId}
              >
                <option value="">No service line</option>
                {serviceLines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Name</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  type="text"
                  value={form.name}
                />
              </label>
              <label className="field field-light">
                <span>Code</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                  required
                  type="text"
                  value={form.code}
                />
              </label>
            </div>

            <label className="field field-light">
              <span>Description</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Default duration (minutes)</span>
                <input
                  className="input input-light"
                  min="1"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultDurationMinutes: event.target.value,
                    }))
                  }
                  required
                  step="1"
                  type="number"
                  value={form.defaultDurationMinutes}
                />
              </label>
              <label className="field field-light">
                <span>Display order</span>
                <input
                  className="input input-light"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, displayOrder: event.target.value }))
                  }
                  step="1"
                  type="number"
                  value={form.displayOrder}
                />
              </label>
            </div>

            <label className="checkbox-card">
              <input
                checked={form.billable}
                onChange={(event) =>
                  setForm((current) => ({ ...current, billable: event.target.checked }))
                }
                type="checkbox"
              />
              <div>
                <strong>Billable by default</strong>
                <small>Uncheck this for non-billable visit types.</small>
              </div>
            </label>

            <div className="button-row">
              <button className="button" disabled={saving} type="submit">
                {saving
                  ? 'Saving...'
                  : selected
                    ? selected.status === 'INACTIVE'
                      ? 'Reactivate and save'
                      : 'Save changes'
                    : 'Create visit type'}
              </button>
              {selected?.status === 'ACTIVE' ? (
                <button
                  className="button button-secondary"
                  disabled={deactivatingId === selected.id}
                  onClick={() => void handleDeactivate(selected)}
                  type="button"
                >
                  {deactivatingId === selected.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              ) : null}
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
