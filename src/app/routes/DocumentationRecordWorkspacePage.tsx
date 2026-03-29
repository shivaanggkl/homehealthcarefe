import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, loadVisitDocumentationForVisit, type VisitDocumentationAggregate } from '../auth/session-api';
import {
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationPanel,
  DocumentationStatusBanner,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function DocumentationRecordWorkspacePage() {
  const { state } = useAuth();
  const { visitId } = useParams<{ visitId: string }>();
  const [record, setRecord] = useState<VisitDocumentationAggregate | null>(null);
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
    if (state.status !== 'authenticated' || !visitId) {
      return;
    }
    const resolvedVisitId = visitId;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await loadVisitDocumentationForVisit({
          ...authContext,
          visitOccurrenceId: resolvedVisitId,
        });
        setRecord(response);
      } catch (requestError) {
        setRecord(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load visit documentation right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, state.status, visitId]);

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Story FE8-01"
      title="Visit documentation route"
      description="The caregiver and office visit-documentation route is now established. Phase A loads the live backend documentation aggregate when one exists and shows controlled draft/read-only states otherwise."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Documentation status"
          description="Phase A makes draft vs submitted state visible before the full field-entry module arrives."
        >
          {loading ? <p className="session-note">Loading visit documentation...</p> : null}
          {error ? (
            <DocumentationModuleState title="Documentation unavailable" description={error} variant="error" />
          ) : null}
          {record ? (
            <>
              <DocumentationStatusBanner
                status={record.record.status}
                summary={`Last saved ${new Date(record.record.lastSavedAt).toLocaleString()}. Printable summary version ${record.record.printableSummaryVersion}.`}
                tone={record.record.status === 'SUBMITTED' ? 'success' : 'warning'}
              />
              <div className="documentation-definition-grid">
                <div>
                  <strong>{record.fieldResponses.length}</strong>
                  <span>field responses</span>
                </div>
                <div>
                  <strong>{record.taskResponses.length}</strong>
                  <span>task responses</span>
                </div>
                <div>
                  <strong>{record.attachmentLinks.length}</strong>
                  <span>linked artifacts</span>
                </div>
              </div>
            </>
          ) : null}
          {!loading && !error && !record ? (
            <DocumentationModuleState
              title="No documentation record yet"
              description="The route is ready, but no documentation aggregate exists for this visit yet. FE8-04 will complete the field-entry and draft-creation flow."
              variant="empty"
            />
          ) : null}
        </DocumentationPanel>

        <DocumentationPanel
          title="Shared editor frame"
          description="The same frame will support caregiver edit, admin edit, and submitted read-only summary states."
        >
          <DocumentationMutationNotice
            state={record?.record.status === 'SUBMITTED' ? 'saved' : 'idle'}
            message={
              record?.record.status === 'SUBMITTED'
                ? 'This documentation route is already in a submitted/read-only state.'
                : 'Phase A wires the shared edit/submit route model. Draft save and submit actions arrive in the next Epic 8 stories.'
            }
          />
          <DocumentationEditorFrame
            title="Visit documentation shell"
            helper="Required markers, validation display, and mutation controls will plug into this shared frame."
            mode={record?.record.status === 'SUBMITTED' ? 'read-only' : 'caregiver-edit'}
          >
            <DocumentationModuleState
              title="Field-entry UI comes next"
              description="Phase A intentionally stops at the shared shell, route structure, and live backend state lookup."
              variant={record?.record.status === 'SUBMITTED' ? 'readonly' : 'info'}
            />
            {record ? (
              <Link
                className="button button-secondary"
                to={`/app/documentation/records/${record.record.id}/printable`}
              >
                Open printable summary route
              </Link>
            ) : null}
          </DocumentationEditorFrame>
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
