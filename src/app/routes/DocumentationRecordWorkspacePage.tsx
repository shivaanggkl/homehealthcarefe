import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { useAccess } from '../access/access-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { DocumentationRecordEditor } from '../components/DocumentationRecordEditor';
import {
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function DocumentationRecordWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const { visitId } = useParams<{ visitId: string }>();

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Stories FE8-04 · FE8-05 · FE8-06 · FE8-07 · FE8-08 · FE8-09 · FE8-10"
      title="Visit documentation workspace"
      description="This route now handles real visit-note drafting, required-field enforcement, task completion, attachment linkage, submit validation, role-based editability, and printable-summary handoff using the Epic 8 backend APIs."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Visit note workflow"
          description="Caregiver, coordinator, and reviewer states now flow through one backend-backed editor instead of placeholder route shells."
        >
          {visitId ? (
            <DocumentationRecordEditor
              authContext={authContext}
              role={profile.role}
              surface="desktop"
              visitId={visitId}
            />
          ) : null}
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
