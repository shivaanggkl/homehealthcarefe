import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  ConfigurationStatus,
  DocumentationTaskLibraryItem,
  ServiceLineSummary,
  TaskTemplateCategory,
  VisitTypeSummary,
  deactivateDocumentationTaskLibraryItem,
  fetchDocumentationTaskLibrary,
  fetchServiceLines,
  fetchVisitTypes,
  saveDocumentationTaskLibraryItem,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { confirmDestructiveConfigurationAction, formatConfigurationError } from '../components/ConfigurationSupport';
import {
  DocumentationAuditCallout,
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

type TaskLibraryForm = {
  serviceLineId: string;
  visitTypeId: string;
  name: string;
  code: string;
  description: string;
  category: TaskTemplateCategory;
  displayOrder: string;
  defaultSortOrder: string;
  defaultCompletionExpectation: string;
  requiredByDefault: boolean;
};

const CATEGORIES: TaskTemplateCategory[] = ['OPERATIONAL', 'CLINICAL', 'COMPLIANCE', 'ADMINISTRATIVE'];

const EMPTY_FORM: TaskLibraryForm = {
  serviceLineId: '',
  visitTypeId: '',
  name: '',
  code: '',
  description: '',
  category: 'CLINICAL',
  displayOrder: '0',
  defaultSortOrder: '0',
  defaultCompletionExpectation: '',
  requiredByDefault: false,
};

function toForm(item: DocumentationTaskLibraryItem): TaskLibraryForm {
  return {
    serviceLineId: item.serviceLineId ?? '',
    visitTypeId: item.visitTypeId ?? '',
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    category: item.category ?? 'CLINICAL',
    displayOrder: String(item.displayOrder),
    defaultSortOrder: String(item.defaultSortOrder),
    defaultCompletionExpectation: item.defaultCompletionExpectation ?? '',
    requiredByDefault: item.requiredByDefault,
  };
}

export function DocumentationTaskLibraryPage() {
  const { state } = useAuth();
  const [rows, setRows] = useState<DocumentationTaskLibraryItem[]>([]);
  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitTypeSummary[]>([]);
  const [selected, setSelected] = useState<DocumentationTaskLibraryItem | null>(null);
  const [form, setForm] = useState<TaskLibraryForm>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TaskTemplateCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  async function loadWorkspace() {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const [libraryResponse, serviceLineResponse, visitTypeResponse] = await Promise.all([
        fetchDocumentationTaskLibrary({
          ...authContext,
          search,
          status: statusFilter,
          category: categoryFilter,
          page: 0,
          size: 100,
        }),
        fetchServiceLines({ ...authContext, status: 'ALL', page: 0, size: 100 }),
        fetchVisitTypes({ ...authContext, status: 'ALL', page: 0, size: 100 }),
      ]);
      setRows(libraryResponse.content);
      setServiceLines(serviceLineResponse.content);
      setVisitTypes(visitTypeResponse.content);
      if (selected) {
        const refreshed = libraryResponse.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(toForm(refreshed));
        }
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setUnauthorized(true);
      } else {
        setError(formatConfigurationError(requestError, 'Unable to load the task library right now.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status === 'authenticated') {
      void loadWorkspace();
    }
  }, [authContext, state.status, search, statusFilter, categoryFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE8-03"
          message="Only permitted admins can manage the Epic 8 documentation task library."
          primaryLabel="Back to documentation"
          primaryLink="/app/documentation"
          title="Documentation task library is restricted."
        />
      </div>
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveDocumentationTaskLibraryItem({
        ...authContext,
        taskTemplateId: selected?.id,
        serviceLineId: form.serviceLineId || null,
        visitTypeId: form.visitTypeId || null,
        name: form.name,
        code: form.code,
        description: form.description || null,
        category: form.category,
        displayOrder: Number(form.displayOrder || 0),
        defaultSortOrder: Number(form.defaultSortOrder || 0),
        defaultCompletionExpectation: form.defaultCompletionExpectation || null,
        requiredByDefault: form.requiredByDefault,
      });
      setSelected(saved);
      setForm(toForm(saved));
      setSuccess(selected ? `Task library item ${saved.name} updated.` : `Task library item ${saved.name} created.`);
      await loadWorkspace();
    } catch (requestError) {
      setError(formatConfigurationError(requestError, 'Unable to save the task library item right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!selected || !confirmDestructiveConfigurationAction(`documentation task ${selected.name}`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const updated = await deactivateDocumentationTaskLibraryItem({
        ...authContext,
        taskTemplateId: selected.id,
      });
      setSuccess(`Task library item ${updated.name} deactivated.`);
      setSelected(null);
      setForm(EMPTY_FORM);
      await loadWorkspace();
    } catch (requestError) {
      setError(formatConfigurationError(requestError, 'Unable to deactivate the task library item right now.'));
    }
  }

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Story FE8-03"
      title="Documentation task library"
      description="Manage reusable Epic 8 documentation tasks with real backend CRUD, active/inactive state, and defaults that flow into the template builder."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel title="Task library" description="Search and filter reusable documentation tasks, then open one in the editor.">
          <div className="toolbar-row">
            <input className="input" onChange={(event) => setSearch(event.target.value)} placeholder="Search task library" value={search} />
            <select className="input" onChange={(event) => setStatusFilter(event.target.value as ConfigurationStatus | 'ALL')} value={statusFilter}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select className="input" onChange={(event) => setCategoryFilter(event.target.value as TaskTemplateCategory | 'ALL')} value={categoryFilter}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button className="button button-secondary" onClick={() => { setSelected(null); setForm(EMPTY_FORM); }} type="button">New task</button>
          </div>
          {loading ? <p className="session-note">Loading task library...</p> : null}
          {error ? <DocumentationModuleState title="Task library load failed" description={error} variant="error" /> : null}
          {!loading && !error && rows.length === 0 ? <DocumentationModuleState title="No tasks found" description="No task-library items match the current filters." variant="empty" /> : null}
          {rows.map((row) => (
            <button
              key={row.id}
              className={`documentation-select-row${selected?.id === row.id ? ' documentation-select-row-active' : ''}`}
              onClick={() => { setSelected(row); setForm(toForm(row)); }}
              type="button"
            >
              <strong>{row.name}</strong>
              <span>{row.status} · {row.category ?? 'UNCATEGORIZED'}</span>
            </button>
          ))}
        </DocumentationPanel>

        <DocumentationPanel title="Task editor" description="Edit reusable task defaults and linkage metadata used by documentation templates.">
          <DocumentationMutationNotice
            message={success ?? 'Task library changes are saved directly through the Epic 8 backend task-library API.'}
            state={saving ? 'saving' : success ? 'saved' : error ? 'retry' : 'idle'}
          />
          <DocumentationAuditCallout
            title="Task-library changes are audit-visible"
            body="Reusable task defaults influence later note completion, so saves and deactivations are treated as controlled documentation configuration changes."
            links={[
              { to: '/app/admin/audit?actionType=DOC_TASK_LIBRARY_UPDATED', label: 'Open task-library audit activity' },
            ]}
          />
          <form onSubmit={handleSave}>
            <DocumentationEditorFrame
              title={selected?.name ?? 'New documentation task'}
              helper="Reusable task defaults keep note-template setup structured without duplicating common visit work."
              mode="admin-edit"
            >
              <div className="documentation-form-grid">
                <label className="field"><span>Name</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
                <label className="field"><span>Code</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required value={form.code} /></label>
                <label className="field"><span>Category</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as TaskTemplateCategory }))} value={form.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="field"><span>Display order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} type="number" value={form.displayOrder} /></label>
                <label className="field"><span>Default sort order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, defaultSortOrder: event.target.value }))} type="number" value={form.defaultSortOrder} /></label>
                <label className="field"><span>Service line</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, serviceLineId: event.target.value }))} value={form.serviceLineId}><option value="">All service lines</option>{serviceLines.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select></label>
                <label className="field"><span>Visit type</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, visitTypeId: event.target.value }))} value={form.visitTypeId}><option value="">All visit types</option>{visitTypes.map((visitType) => <option key={visitType.id} value={visitType.id}>{visitType.name}</option>)}</select></label>
                <label className="field documentation-field-block"><span>Description</span><textarea className="input" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} value={form.description} /></label>
                <label className="field documentation-field-block"><span>Default completion expectation</span><textarea className="input" onChange={(event) => setForm((current) => ({ ...current, defaultCompletionExpectation: event.target.value }))} rows={2} value={form.defaultCompletionExpectation} /></label>
              </div>
              <label className="checkbox-row">
                <input checked={form.requiredByDefault} onChange={(event) => setForm((current) => ({ ...current, requiredByDefault: event.target.checked }))} type="checkbox" />
                <span>Required by default in linked templates</span>
              </label>
              <div className="button-row">
                <button className="button" disabled={saving} type="submit">{saving ? 'Saving...' : selected ? 'Save task' : 'Create task'}</button>
                {selected ? <button className="button button-secondary" disabled={saving} onClick={() => void handleDeactivate()} type="button">Deactivate</button> : null}
              </div>
            </DocumentationEditorFrame>
          </form>
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
