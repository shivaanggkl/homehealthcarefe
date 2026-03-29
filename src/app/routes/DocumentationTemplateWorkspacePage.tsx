import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchEpic8DocumentationTemplate,
  fetchEpic8DocumentationTemplates,
  type DocumentationTemplateAggregate,
  type DocumentationTemplateSummary,
} from '../auth/session-api';
import {
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function DocumentationTemplateWorkspacePage() {
  const { state } = useAuth();
  const [templates, setTemplates] = useState<DocumentationTemplateSummary[]>([]);
  const [selected, setSelected] = useState<DocumentationTemplateAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      try {
        const response = await fetchEpic8DocumentationTemplates({ ...authContext, page: 0, size: 20 });
        setTemplates(response.content);
        if (response.content[0]) {
          const detail = await fetchEpic8DocumentationTemplate({
            ...authContext,
            templateId: response.content[0].id,
          });
          setSelected(detail);
        } else {
          setSelected(null);
        }
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load documentation templates right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, state.status]);

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Story FE8-11"
      title="Documentation template builder foundation"
      description="Phase A establishes the shared template-builder frame, using real Epic 8 template APIs for list and detail state even before the full create/edit tooling lands."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Template library"
          description="Backend-backed template routes make active/draft status and role context available now."
        >
          {loading ? <p className="session-note">Loading templates...</p> : null}
          {error ? (
            <DocumentationModuleState title="Template load failed" description={error} variant="error" />
          ) : null}
          {!loading && !error && templates.length === 0 ? (
            <DocumentationModuleState
              title="No templates found"
              description="The shared builder route is ready, but the backend currently has no documentation templates."
              variant="empty"
            />
          ) : null}
          {templates.map((template) => (
            <button
              key={template.id}
              className={`documentation-select-row${
                selected?.template.id === template.id ? ' documentation-select-row-active' : ''
              }`}
              onClick={async () => {
                const detail = await fetchEpic8DocumentationTemplate({
                  ...authContext,
                  templateId: template.id,
                });
                setSelected(detail);
              }}
              type="button"
            >
              <strong>{template.name}</strong>
              <span>
                {template.status} · {template.templateType ?? 'VISIT_NOTE'}
              </span>
            </button>
          ))}
        </DocumentationPanel>

        <DocumentationPanel
          title="Shared builder frame"
          description="This frame standardizes how section, field, task, and save-state UX will look across Epic 8 admin configuration screens."
        >
          <DocumentationMutationNotice
            state="idle"
            message="Phase A sets the shared builder and mutation pattern. Full template editing arrives in FE8-02."
          />
          {selected ? (
            <DocumentationEditorFrame
              title={selected.template.name}
              helper={selected.template.helpText ?? 'No helper text configured yet.'}
              mode="admin-edit"
            >
              <div className="documentation-definition-grid">
                <div>
                  <strong>{selected.sections.length}</strong>
                  <span>sections</span>
                </div>
                <div>
                  <strong>{selected.fields.length}</strong>
                  <span>fields</span>
                </div>
                <div>
                  <strong>{selected.tasks.length}</strong>
                  <span>task links</span>
                </div>
              </div>
              <div className="documentation-definition-list">
                {selected.sections.map((section) => (
                  <article key={section.id} className="documentation-definition-item">
                    <strong>{section.title}</strong>
                    <p>{section.helpText ?? 'No section helper text configured.'}</p>
                  </article>
                ))}
              </div>
            </DocumentationEditorFrame>
          ) : (
            <DocumentationModuleState
              title="Builder foundation ready"
              description="Create/edit controls are intentionally deferred to the dedicated template-management story. The shared frame and live backend wiring are already in place."
              variant="readonly"
            />
          )}
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
