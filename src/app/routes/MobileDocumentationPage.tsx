import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { useAccess } from '../access/access-context';
import { DocumentationRecordEditor } from '../components/DocumentationRecordEditor';
import { MobileAppShell, MobilePanel } from '../components/MobileWorkspaceFoundation';

export function MobileDocumentationPage() {
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
    <MobileAppShell
      eyebrow="Epic 8 Documentation"
      title="Visit documentation"
      description="The caregiver mobile route now supports the live Epic 8 draft, submit, validation, task, narrative, and attachment-link workflow inside the visit experience."
      syncState="idle"
      syncMessage="Documentation edits, quick saves, and submit attempts use the same Epic 8 backend APIs as the desktop visit-note workspace."
      navItems={[
        { to: '/mobile', label: 'Today' },
        { to: visitId ? `/mobile/visits/${visitId}` : '/mobile', label: 'Visit' },
        { to: visitId ? `/mobile/visits/${visitId}/documentation` : '/mobile', label: 'Documentation' },
      ]}
    >
      <MobilePanel
        title="Documentation editor"
        description="This mobile visit route uses the same backend-driven documentation record lifecycle, but keeps the interaction density appropriate for field use."
      >
        {visitId ? (
          <DocumentationRecordEditor
            authContext={authContext}
            role={profile.role}
            surface="mobile"
            visitId={visitId}
          />
        ) : null}
      </MobilePanel>
    </MobileAppShell>
  );
}
