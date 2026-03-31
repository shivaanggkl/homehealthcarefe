import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  ConfigurationStatus,
  DocumentationTemplateSummary,
  DocumentationTemplateType,
  createDocumentationTemplateVersion,
  fetchDocumentationTemplates,
  publishDocumentationTemplate,
  saveDocumentationTemplate,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { ConfigurationAuditNotice, formatConfigurationError } from '../components/ConfigurationSupport';
import {
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type DocumentationTemplateFormState = {
  name: string;
  code: string;
  templateType: DocumentationTemplateType;
  structuredDefinitionJson: string;
  displayOrder: string;
};

const DOCUMENTATION_TEMPLATE_TYPES: DocumentationTemplateType[] = [
  'VISIT_NOTE',
  'ASSESSMENT',
  'CARE_PLAN',
  'CUSTOM_FORM',
];

const INITIAL_FORM: DocumentationTemplateFormState = {
  name: '',
  code: '',
  templateType: 'VISIT_NOTE',
  structuredDefinitionJson: '{\n  "sections": []\n}',
  displayOrder: '0',
};

function mapTemplateToForm(item: DocumentationTemplateSummary): DocumentationTemplateFormState {
  return {
    name: item.name,
    code: item.code,
    templateType: item.templateType ?? 'VISIT_NOTE',
    structuredDefinitionJson: item.structuredDefinitionJson,
    displayOrder: String(item.displayOrder),
  };
}

export function DocumentationTemplateSetupPage() {
  const { state } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<DocumentationTemplateType | 'ALL'>('ALL');
  const [rows, setRows] = useState<DocumentationTemplateSummary[]>([]);
  const [selected, setSelected] = useState<DocumentationTemplateSummary | null>(null);
  const [form, setForm] = useState<DocumentationTemplateFormState>(INITIAL_FORM);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [versioning, setVersioning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const response = await fetchDocumentationTemplates({
        ...authContext,
        search,
        status,
        templateType: typeFilter,
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
          setForm(mapTemplateToForm(refreshed));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load documentation templates.',
        );
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
  }, [authContext, state.status, search, status, typeFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-08"
          message="Only permitted admins can manage documentation templates."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Documentation template management is restricted."
        />
      </div>
    );
  }

  async function handleSaveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDraft(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const saved = await saveDocumentationTemplate({
        ...authContext,
        templateId: selected?.id,
        name: form.name,
        code: form.code,
        templateType: form.templateType,
        structuredDefinitionJson: form.structuredDefinitionJson,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapTemplateToForm(saved));
      setSuccessMessage(
        selected ? `Draft ${saved.name} updated.` : `Draft ${saved.name} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save the documentation draft right now.'));
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleCreateVersion() {
    if (!selected) {
      return;
    }
    setVersioning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const saved = await createDocumentationTemplateVersion({
        ...authContext,
        templateId: selected.id,
        name: form.name,
        code: form.code,
        templateType: form.templateType,
        structuredDefinitionJson: form.structuredDefinitionJson,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapTemplateToForm(saved));
      setSuccessMessage(`Created version ${saved.version} for ${saved.name}.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to create a new version right now.'));
    } finally {
      setVersioning(false);
    }
  }

  async function handlePublish() {
    if (!selected) {
      return;
    }
    setPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const published = await publishDocumentationTemplate({
        ...authContext,
        templateId: selected.id,
      });
      setSelected(published);
      setForm(mapTemplateToForm(published));
      setSuccessMessage(`Published ${published.name} version ${published.version}.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to publish the template right now.'));
    } finally {
      setPublishing(false);
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
            New documentation template
          </button>
        </div>
      }
      description="Manage draft and active documentation templates, create the next version from an existing template, and publish only when the structure is ready."
      eyebrow="Frontend Story FE2-08"
      title="Documentation templates"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Search documentation templates and differentiate draft workflow from active published templates."
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
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <label className="field field-light compact-field">
              <span>Template type</span>
              <select
                className="input input-light"
                onChange={(event) => setTypeFilter(event.target.value as DocumentationTemplateType | 'ALL')}
                value={typeFilter}
              >
                <option value="ALL">All types</option>
                {DOCUMENTATION_TEMPLATE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p className="session-note">Loading documentation templates...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Documentation templates unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.8fr 0.8fr minmax(170px, auto)' }}
            >
              <span>Name</span>
              <span>Type</span>
              <span>Version</span>
              <span>Status</span>
              <span>Order</span>
              <span>Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No documentation templates found</strong>
                <p>Create a new draft to start the versioning workflow.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.8fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.templateType ?? 'Unspecified'}</span>
                  <span>v{item.version}</span>
                  <span>{item.status}</span>
                  <span>{item.displayOrder}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelected(item);
                        setForm(mapTemplateToForm(item));
                      }}
                      type="button"
                    >
                      Open
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
          description="Save drafts safely, create the next version from an existing template, and publish only when the draft is ready."
          title={selected ? `Edit ${selected.name}` : 'Create draft'}
        >
          <ConfigurationAuditNotice subject="documentation templates and version history" />
          <form className="stack-form stack-form-light" onSubmit={handleSaveDraft}>
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
                <span>Template type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      templateType: event.target.value as DocumentationTemplateType,
                    }))
                  }
                  value={form.templateType}
                >
                  {DOCUMENTATION_TEMPLATE_TYPES.map((item) => (
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
              <span>Structured definition JSON</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    structuredDefinitionJson: event.target.value,
                  }))
                }
                required
                value={form.structuredDefinitionJson}
              />
            </label>

            <div className="callout-card">
              <strong>Draft vs publish</strong>
              <p>
                Save draft updates the current draft record. Create next version starts a new draft version from
                the selected template. Publish promotes the selected draft to active.
              </p>
            </div>

            <div className="button-row">
              <button className="button" disabled={savingDraft} type="submit">
                {savingDraft ? 'Saving draft...' : selected ? 'Save draft' : 'Create draft'}
              </button>
              {selected ? (
                <button
                  className="button button-secondary"
                  disabled={versioning}
                  onClick={() => void handleCreateVersion()}
                  type="button"
                >
                  {versioning ? 'Versioning...' : 'Create next version'}
                </button>
              ) : null}
              {selected ? (
                <button
                  className="button button-secondary"
                  disabled={publishing}
                  onClick={() => void handlePublish()}
                  type="button"
                >
                  {publishing ? 'Publishing...' : 'Publish draft'}
                </button>
              ) : null}
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
