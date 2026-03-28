import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  ConfigurationStatus,
  ServiceLineSummary,
  deactivateServiceLine,
  fetchServiceLines,
  saveServiceLine,
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

type ServiceLineFormState = {
  name: string;
  code: string;
  description: string;
  displayOrder: string;
};

const INITIAL_FORM: ServiceLineFormState = {
  name: '',
  code: '',
  description: '',
  displayOrder: '0',
};

function mapServiceLineToForm(item: ServiceLineSummary): ServiceLineFormState {
  return {
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    displayOrder: String(item.displayOrder),
  };
}

export function ServiceLineSetupPage() {
  const { state } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ServiceLineSummary[]>([]);
  const [selected, setSelected] = useState<ServiceLineSummary | null>(null);
  const [form, setForm] = useState<ServiceLineFormState>(INITIAL_FORM);
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
  }, [state]);

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const response = await fetchServiceLines({
        ...authContext,
        search,
        status,
        page: nextPage,
        size: 20,
      });
      setRows(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
      setPage(response.page);
      if (selected) {
        const refreshed = response.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(mapServiceLineToForm(refreshed));
        } else if (response.content.length === 0) {
          setSelected(null);
          setForm(INITIAL_FORM);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load service lines.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }
    void loadRows(0);
  }, [authContext, state.status, search, status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-03"
          message="Only permitted admins can manage the service line catalog."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Service line management is restricted."
        />
      </div>
    );
  }

  function handleSelect(item: ServiceLineSummary) {
    setSelected(item);
    setForm(mapServiceLineToForm(item));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function startCreate() {
    setSelected(null);
    setForm(INITIAL_FORM);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const wasInactive = selected?.status === 'INACTIVE';
      const saved = await saveServiceLine({
        ...authContext,
        serviceLineId: selected?.id,
        name: form.name,
        code: form.code,
        description: form.description,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapServiceLineToForm(saved));
      setSuccessMessage(
        selected
          ? wasInactive
            ? `Service line ${saved.name} reactivated and updated.`
            : `Service line ${saved.name} updated.`
          : `Service line ${saved.name} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save service line right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: ServiceLineSummary) {
    if (!confirmDestructiveConfigurationAction(`service line ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateServiceLine({
        ...authContext,
        serviceLineId: item.id,
      });
      setSuccessMessage(`Service line ${updated.name} deactivated.`);
      if (selected?.id === item.id) {
        setSelected(updated);
      }
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate service line right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button className="button button-secondary" onClick={startCreate} type="button">
            New service line
          </button>
          <button className="button button-secondary" onClick={() => void loadRows(page)} type="button">
            Refresh
          </button>
        </div>
      }
      description="Search, create, edit, and deactivate the agency service line catalog. Duplicate name or code conflicts are surfaced directly from backend responses."
      eyebrow="Frontend Story FE2-03"
      title="Service line catalog"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Searchable service line list with backend status filtering and pagination."
          title="Catalog records"
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
          </div>

          {loading ? <p className="session-note">Loading service lines...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Catalog unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1.25fr 0.7fr 1.4fr 0.7fr minmax(170px, auto)' }}
            >
              <span>Name</span>
              <span>Code</span>
              <span>Description</span>
              <span>Order</span>
              <span>Actions</span>
            </div>

            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No service lines yet</strong>
                <p>Create the first service line or adjust the filters above.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.25fr 0.7fr 1.4fr 0.7fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.code}</span>
                  <span>{item.description || 'No description'}</span>
                  <span>{item.displayOrder}</span>
                  <div className="config-row-actions">
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
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
          description="Create new service lines or edit an existing record. Saving an inactive record reactivates it because that is how the backend update flow behaves."
          title={selected ? `Edit ${selected.name}` : 'Create service line'}
        >
          <ConfigurationAuditNotice subject="service line configuration" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
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

            <div className="button-row">
              <button className="button" disabled={saving} type="submit">
                {saving
                  ? 'Saving...'
                  : selected
                    ? selected.status === 'INACTIVE'
                      ? 'Reactivate and save'
                      : 'Save changes'
                    : 'Create service line'}
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
