import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  ConfigurationStatus,
  ServiceLineSummary,
  TaskTemplateCategory,
  TaskTemplateSummary,
  VisitTypeSummary,
  deactivateTaskTemplate,
  fetchServiceLines,
  fetchTaskTemplates,
  fetchVisitTypes,
  saveTaskTemplate,
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

type TaskTemplateFormState = {
  serviceLineId: string;
  visitTypeId: string;
  name: string;
  code: string;
  description: string;
  category: TaskTemplateCategory;
  displayOrder: string;
};

const TASK_TEMPLATE_CATEGORIES: TaskTemplateCategory[] = [
  'OPERATIONAL',
  'CLINICAL',
  'COMPLIANCE',
  'ADMINISTRATIVE',
];

const INITIAL_FORM: TaskTemplateFormState = {
  serviceLineId: '',
  visitTypeId: '',
  name: '',
  code: '',
  description: '',
  category: 'OPERATIONAL',
  displayOrder: '0',
};

function mapTaskTemplateToForm(item: TaskTemplateSummary): TaskTemplateFormState {
  return {
    serviceLineId: item.serviceLineId ?? '',
    visitTypeId: item.visitTypeId ?? '',
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    category: item.category ?? 'OPERATIONAL',
    displayOrder: String(item.displayOrder),
  };
}

export function TaskTemplateSetupPage() {
  const { state } = useAuth();
  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitTypeSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TaskTemplateCategory | 'ALL'>('ALL');
  const [rows, setRows] = useState<TaskTemplateSummary[]>([]);
  const [selected, setSelected] = useState<TaskTemplateSummary | null>(null);
  const [form, setForm] = useState<TaskTemplateFormState>(INITIAL_FORM);
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
  }, [state]);

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [serviceLineResponse, visitTypeResponse, taskTemplateResponse] = await Promise.all([
        fetchServiceLines({ ...authContext, status: 'ALL', page: 0, size: 100 }),
        fetchVisitTypes({ ...authContext, status: 'ALL', page: 0, size: 100 }),
        fetchTaskTemplates({
          ...authContext,
          search,
          status,
          category: categoryFilter,
          page: nextPage,
          size: 20,
        }),
      ]);

      setServiceLines(serviceLineResponse.content);
      setVisitTypes(visitTypeResponse.content);
      setRows(taskTemplateResponse.content);
      setPage(taskTemplateResponse.page);
      setTotalElements(taskTemplateResponse.totalElements);
      setTotalPages(taskTemplateResponse.totalPages);

      if (selected) {
        const refreshed = taskTemplateResponse.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(mapTaskTemplateToForm(refreshed));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load task templates.');
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
  }, [authContext, state.status, search, status, categoryFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-07"
          message="Only permitted admins can manage task templates."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Task template management is restricted."
        />
      </div>
    );
  }

  function serviceLineLabel(id: string | null) {
    if (!id) {
      return 'No service line';
    }
    return serviceLines.find((item) => item.id === id)?.name ?? 'Linked service line';
  }

  function visitTypeLabel(id: string | null) {
    if (!id) {
      return 'No visit type';
    }
    return visitTypes.find((item) => item.id === id)?.name ?? 'Linked visit type';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const wasInactive = selected?.status === 'INACTIVE';
      const saved = await saveTaskTemplate({
        ...authContext,
        taskTemplateId: selected?.id,
        serviceLineId: form.serviceLineId || undefined,
        visitTypeId: form.visitTypeId || undefined,
        name: form.name,
        code: form.code,
        description: form.description,
        category: form.category,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapTaskTemplateToForm(saved));
      setSuccessMessage(
        selected
          ? wasInactive
            ? `Task template ${saved.name} reactivated and updated.`
            : `Task template ${saved.name} updated.`
          : `Task template ${saved.name} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save task template right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: TaskTemplateSummary) {
    if (!confirmDestructiveConfigurationAction(`task template ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateTaskTemplate({
        ...authContext,
        taskTemplateId: item.id,
      });
      setSuccessMessage(`Task template ${updated.name} deactivated.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate task template right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button
            className="button button-secondary"
            onClick={() => {
              setSelected(null);
              setForm(INITIAL_FORM);
            }}
            type="button"
          >
            New task template
          </button>
        </div>
      }
      description="Manage reusable operational and care task templates with service line and visit type associations where supported."
      eyebrow="Frontend Story FE2-07"
      title="Task templates"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Search, filter, and review task templates by category and status."
          title="Template library"
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
              <span>Category</span>
              <select
                className="input input-light"
                onChange={(event) => setCategoryFilter(event.target.value as TaskTemplateCategory | 'ALL')}
                value={categoryFilter}
              >
                <option value="ALL">All categories</option>
                {TASK_TEMPLATE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p className="session-note">Loading task templates...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Task templates unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1.1fr 0.9fr 1.2fr 1.2fr 0.8fr minmax(170px, auto)' }}
            >
              <span>Name</span>
              <span>Category</span>
              <span>Service line</span>
              <span>Visit type</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No task templates found</strong>
                <p>Create the first template or widen the filters above.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.1fr 0.9fr 1.2fr 1.2fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.category ?? 'Uncategorized'}</span>
                  <span>{serviceLineLabel(item.serviceLineId)}</span>
                  <span>{visitTypeLabel(item.visitTypeId)}</span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelected(item);
                        setForm(mapTaskTemplateToForm(item));
                      }}
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
          description="Create and edit task templates. Inactive records can be reactivated by saving them again."
          title={selected ? `Edit ${selected.name}` : 'Create task template'}
        >
          <ConfigurationAuditNotice subject="task templates" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <div className="split-grid">
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
              <label className="field field-light">
                <span>Visit type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, visitTypeId: event.target.value }))
                  }
                  value={form.visitTypeId}
                >
                  <option value="">No visit type</option>
                  {visitTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

            <div className="split-grid">
              <label className="field field-light">
                <span>Category</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value as TaskTemplateCategory }))
                  }
                  value={form.category}
                >
                  {TASK_TEMPLATE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
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

            <div className="button-row">
              <button className="button" disabled={saving} type="submit">
                {saving
                  ? 'Saving...'
                  : selected
                    ? selected.status === 'INACTIVE'
                      ? 'Reactivate and save'
                      : 'Save changes'
                    : 'Create template'}
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
