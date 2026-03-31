import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { useAccess } from '../access/access-context';
import { canAccessPermission } from '../access/access-control';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchDocumentationTaskLibrary,
  fetchEpic8DocumentationTemplates,
  fetchVisitDocumentationRecords,
  type DocumentationTaskLibraryItem,
  type DocumentationTemplateSummary,
  type VisitDocumentationSummary,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  DocumentationModuleCards,
  DocumentationModuleState,
  DocumentationPanel,
  DocumentationSectionNavigation,
  DocumentationStatusBanner,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function DocumentationWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [templates, setTemplates] = useState<DocumentationTemplateSummary[]>([]);
  const [tasks, setTasks] = useState<DocumentationTaskLibraryItem[]>([]);
  const [records, setRecords] = useState<VisitDocumentationSummary[]>([]);
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
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  const canManageTemplates = canAccessPermission(profile, 'manage_documentation_templates');
  const canManageTaskLibrary = canAccessPermission(profile, 'manage_documentation_task_library');
  const canViewRecords = canAccessPermission(profile, 'view_visit_documentation');
  const canPrint = canAccessPermission(profile, 'generate_printable_documentation_summary');

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [templateResponse, taskResponse, recordResponse] = await Promise.all([
          fetchEpic8DocumentationTemplates({ ...authContext, page: 0, size: 5 }),
          fetchDocumentationTaskLibrary({ ...authContext, page: 0, size: 5 }),
          fetchVisitDocumentationRecords({ ...authContext, page: 0, size: 5 }),
        ]);
        setTemplates(templateResponse.content);
        setTasks(taskResponse.content);
        setRecords(recordResponse.content);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the documentation workspace right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, state.status]);

  if (!canAccessPermission(profile, 'view_documentation_workspace')) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE8-01"
          title="Documentation workspace is not available for this role."
          message="Epic 8 documentation routes respect backend workspace and documentation permissions."
          primaryLabel="Back to home"
          primaryLink="/app/home"
        />
      </div>
    );
  }

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Stories FE8-01 · FE8-11 · FE8-12"
      title="Documentation workspace"
      description="Epic 8 documentation routes now live under one shared workspace so caregiver visit notes, admin template setup, draft states, and printable summaries follow the same route model."
    >
      <DocumentationSectionNavigation
        links={[
          { path: '/app/documentation', label: 'Overview', state: 'available' },
          {
            path: '/app/documentation/templates',
            label: 'Templates',
            state: canManageTemplates ? 'available' : 'restricted',
          },
          {
            path: '/app/documentation/task-library',
            label: 'Task library',
            state: canManageTaskLibrary ? 'available' : 'restricted',
          },
          {
            path: '/app/documentation/status',
            label: 'Status list',
            state: canViewRecords ? 'available' : 'restricted',
          },
        ]}
      />

      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Shared route model"
          description="The foundation distinguishes edit, summary, print, and admin configuration routes without forcing users through one overloaded screen."
        >
          <DocumentationModuleCards
            cards={[
              {
                path: '/app/documentation/templates',
                label: 'Template builder',
                description: 'Admin-facing documentation template configuration with shared builder scaffolding.',
                state: canManageTemplates ? 'available' : 'restricted',
              },
              {
                path: '/app/documentation/task-library',
                label: 'Task library',
                description: 'Admin-facing reusable task definitions for documentation templates.',
                state: canManageTaskLibrary ? 'available' : 'restricted',
              },
              {
                path: records[0] ? `/app/documentation/records/${records[0].id}/printable` : '/app/documentation',
                label: 'Printable summary',
                description: 'Read-only print route backed by the backend printable summary contract.',
                state: canPrint ? 'available' : 'restricted',
              },
              {
                path: '/app/documentation/status',
                label: 'Documentation status',
                description: 'Coordinator-facing draft, incomplete, and submitted note visibility with focused filtering.',
                state: canViewRecords ? 'available' : 'restricted',
              },
            ]}
          />
        </DocumentationPanel>

        <DocumentationPanel
          title="Live backend status"
          description="Phase A uses real Epic 8 backend APIs so route state, counts, and sample records come from the server rather than placeholder local state."
        >
          {loading ? <p className="session-note">Loading documentation workspace...</p> : null}
          {error ? (
            <DocumentationModuleState
              title="Workspace load failed"
              description={error}
              variant="error"
            />
          ) : null}
          {!loading && !error ? (
            <div className="documentation-summary-grid">
              <DocumentationStatusBanner
                status={`${templates.length} template${templates.length === 1 ? '' : 's'}`}
                summary="Recent documentation templates loaded from the backend template API."
              />
              <DocumentationStatusBanner
                status={`${tasks.length} reusable task${tasks.length === 1 ? '' : 's'}`}
                summary="Task-library items loaded from the Epic 8 task-library API."
              />
              <DocumentationStatusBanner
                status={`${records.length} recent record${records.length === 1 ? '' : 's'}`}
                summary="Recent documentation records loaded from the visit-documentation API."
                tone={canViewRecords ? 'success' : 'readonly'}
              />
            </div>
          ) : null}
        </DocumentationPanel>

        <DocumentationPanel
          title="Recent documentation"
          description="The route foundation surfaces documentation status early so draft vs submitted work is visible before the detailed editing flows arrive."
        >
          {records.length === 0 && !loading && !error ? (
            <DocumentationModuleState
              title="No documentation records yet"
              description="Phase A is ready for caregiver and admin documentation routes even when no visit notes have been created yet."
              variant="empty"
            />
          ) : null}
          {records.slice(0, 3).map((record) => (
            <article key={record.id} className="documentation-list-row">
              <div>
                <strong>{record.templateName}</strong>
                <p>
                  {record.patientFirstName} {record.patientLastName} · {record.branchName}
                </p>
              </div>
              <div className="documentation-list-meta">
                <span>{record.status}</span>
                <span>{new Date(record.lastSavedAt).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
