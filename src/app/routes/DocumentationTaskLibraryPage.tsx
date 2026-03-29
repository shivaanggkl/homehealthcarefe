import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, fetchDocumentationTaskLibrary } from '../auth/session-api';
import {
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function DocumentationTaskLibraryPage() {
  const { state } = useAuth();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchDocumentationTaskLibrary>>['content']
  >([]);
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
        const response = await fetchDocumentationTaskLibrary({ ...authContext, page: 0, size: 20 });
        setRows(response.content);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the documentation task library right now.',
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
      title="Documentation task library foundation"
      description="Phase A establishes the shared task-library route and builder frame, backed by the Epic 8 task-library API."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Reusable tasks"
          description="Task-library routes are now separated from visit-note editing so admin configuration stays explicit."
        >
          {loading ? <p className="session-note">Loading task library...</p> : null}
          {error ? (
            <DocumentationModuleState title="Task library load failed" description={error} variant="error" />
          ) : null}
          {!loading && !error && rows.length === 0 ? (
            <DocumentationModuleState
              title="No reusable tasks found"
              description="The shared task-library route is available even before task definitions are created."
              variant="empty"
            />
          ) : null}
          {rows.map((row) => (
            <article key={row.id} className="documentation-list-row">
              <div>
                <strong>{row.name}</strong>
                <p>{row.description ?? 'No default description configured.'}</p>
              </div>
              <div className="documentation-list-meta">
                <span>{row.category ?? 'UNCATEGORIZED'}</span>
                <span>{row.requiredByDefault ? 'Required by default' : 'Optional by default'}</span>
              </div>
            </article>
          ))}
        </DocumentationPanel>

        <DocumentationPanel
          title="Shared builder frame"
          description="The same builder foundation handles task defaults, status badges, and future create/edit controls."
        >
          <DocumentationMutationNotice
            state="idle"
            message="Phase A wires the shared route and task-library state model. Full CRUD arrives in FE8-03."
          />
          <DocumentationEditorFrame
            title="Task-library editor scaffold"
            helper="Shared admin-edit framing keeps task-library mutation, validation, and unauthorized messaging consistent with template management."
            mode="admin-edit"
          >
            <DocumentationModuleState
              title="Builder controls deferred to the next story"
              description="This route intentionally proves the backend connection and shared interaction frame before the full task-library editor is layered in."
              variant="readonly"
            />
          </DocumentationEditorFrame>
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
