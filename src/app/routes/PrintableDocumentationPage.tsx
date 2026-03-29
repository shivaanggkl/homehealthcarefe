import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, fetchPrintableDocumentationSummary } from '../auth/session-api';
import {
  DocumentationModuleState,
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

export function PrintableDocumentationPage() {
  const { state } = useAuth();
  const { documentationRecordId } = useParams<{ documentationRecordId: string }>();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchPrintableDocumentationSummary>> | null>(null);
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
    if (state.status !== 'authenticated' || !documentationRecordId) {
      return;
    }
    const resolvedDocumentationRecordId = documentationRecordId;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchPrintableDocumentationSummary({
          ...authContext,
          documentationRecordId: resolvedDocumentationRecordId,
        });
        setSummary(response);
      } catch (requestError) {
        setSummary(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Unable to load the printable documentation summary right now.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authContext, state.status, documentationRecordId]);

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Story FE8-01"
      title="Printable documentation summary"
      description="This route is a read-only print surface backed directly by the Epic 8 printable-summary contract rather than rebuilt client-only note logic."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Printable summary"
          description="Editing controls stay out of this route so the printable experience remains clean and review-focused."
        >
          {loading ? <p className="session-note">Loading printable summary...</p> : null}
          {error ? (
            <DocumentationModuleState title="Printable summary unavailable" description={error} variant="error" />
          ) : null}
          {!loading && !error && !summary ? (
            <DocumentationModuleState
              title="No printable summary available"
              description="The route is ready, but no printable summary could be loaded for this documentation record."
              variant="empty"
            />
          ) : null}
          {summary ? (
            <div className="documentation-printable">
              <header>
                <h3>{summary.templateTitle}</h3>
                <p>{summary.header.patientDisplayName}</p>
              </header>
              <dl className="documentation-print-meta">
                <div>
                  <dt>Status</dt>
                  <dd>{summary.status}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{summary.header.submittedAt ? new Date(summary.header.submittedAt).toLocaleString() : 'Not submitted'}</dd>
                </div>
                <div>
                  <dt>Author</dt>
                  <dd>{summary.header.authorDisplayName ?? 'Not shown'}</dd>
                </div>
              </dl>
              <section>
                <h4>Fields</h4>
                {summary.fields.map((field) => (
                  <article key={field.fieldKey} className="documentation-print-row">
                    <strong>{field.label}</strong>
                    <p>{field.displayValue}</p>
                  </article>
                ))}
              </section>
            </div>
          ) : null}
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
