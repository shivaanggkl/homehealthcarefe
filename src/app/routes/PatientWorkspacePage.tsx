import { useEffect, useState } from 'react';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, fetchPatients, PatientDirectoryPage } from '../auth/session-api';
import {
  PatientModuleCards,
  PatientPanel,
  PatientWorkspaceGrid,
  PatientWorkspaceShell,
} from '../components/PatientWorkspaceFoundation';

const WORKSPACE_MODULES = [
  {
    key: 'manage_patient_demographics' as const,
    path: '/app/patients/demo-record/demographics',
    label: 'Demographics',
    description: 'Identity, reference, and communication fields live here.',
  },
  {
    key: 'manage_patient_contacts' as const,
    path: '/app/patients/demo-record/contacts',
    label: 'Contacts',
    description: 'Emergency contacts and responsible-party details stay grouped together.',
  },
  {
    key: 'manage_patient_address' as const,
    path: '/app/patients/demo-record/address',
    label: 'Address',
    description: 'Service location and geo-context remain isolated from demographics edits.',
  },
  {
    key: 'manage_patient_eligibility' as const,
    path: '/app/patients/demo-record/eligibility',
    label: 'Eligibility',
    description: 'Active vs historical service windows will live in a dedicated record section.',
  },
  {
    key: 'manage_patient_diagnoses' as const,
    path: '/app/patients/demo-record/diagnoses',
    label: 'Diagnoses',
    description: 'Clinical condition history gets its own repeatable list pattern.',
  },
  {
    key: 'manage_patient_payer_links' as const,
    path: '/app/patients/demo-record/payer',
    label: 'Payer',
    description: 'Coverage context and primary payer workflows are isolated from clinical edits.',
  },
  {
    key: 'manage_patient_authorizations' as const,
    path: '/app/patients/demo-record/authorizations',
    label: 'Authorizations',
    description: 'Current and historical authorization windows will share one reusable timeline surface.',
  },
  {
    key: 'view_patient_attachments' as const,
    path: '/app/patients/demo-record/attachments',
    label: 'Attachments',
    description: 'Document handling can stay read-only or editable without changing the layout model.',
  },
];

export function PatientWorkspacePage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [directory, setDirectory] = useState<PatientDirectoryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    const devSession = loadDevSessionCredentials();

    void fetchPatients({
      accessToken: devSession?.accessToken,
      sessionId: state.session.sessionId,
      status: 'ALL',
      page: 0,
      size: 6,
    })
      .then((response) => {
        if (!cancelled) {
          setDirectory(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load the patient directory summary right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : null]);

  const visibleCards = WORKSPACE_MODULES.map((module) => ({
    path: module.path,
    label: module.label,
    description: module.description,
    state: canAccessPermission(profile, module.key) ? 'available' : 'restricted',
  })) as Array<{
    path: string;
    label: string;
    description: string;
    state: 'available' | 'restricted';
  }>;

  return (
    <PatientWorkspaceShell
      eyebrow="Epic 3 patient workspace"
      title="Patient management information architecture"
      description="Phase A establishes the navigation, route guards, and record-level workspace shell for Epic 3. The patient module pages share one layout model before the detailed CRUD stories land in later phases."
    >
      <PatientWorkspaceGrid>
        <PatientPanel
          title="Workspace status"
          description="This landing route is backend-aware already, so Phase A can prove patient permissions and live directory visibility before the dedicated directory screen arrives."
        >
          {loading ? (
            <p>Loading patient directory summary from `GET /api/patients`.</p>
          ) : error ? (
            <p className="alert">{error}</p>
          ) : directory ? (
            <div className="patient-summary-metrics">
              <article>
                <strong>{directory.totalElements}</strong>
                <span>Total patient records</span>
              </article>
              <article>
                <strong>{directory.content.filter((patient) => patient.status === 'ACTIVE').length}</strong>
                <span>Active records on this page</span>
              </article>
              <article>
                <strong>{directory.content.length}</strong>
                <span>Preview rows loaded</span>
              </article>
            </div>
          ) : null}
          {directory?.content.length ? (
            <div className="patient-directory-preview">
              {directory.content.map((patient) => (
                <div key={patient.id} className="patient-directory-preview-row">
                  <strong>{`${patient.firstName} ${patient.lastName}`}</strong>
                  <span>{patient.externalReference ?? patient.id}</span>
                  <span>{patient.status}</span>
                </div>
              ))}
            </div>
          ) : null}
        </PatientPanel>

        <PatientPanel
          title="Patient module map"
          description="The patient section is now grouped by record domain. Later stories can drop real list and edit screens into these routes without changing the shell or route permissions."
        >
          <PatientModuleCards cards={visibleCards} />
        </PatientPanel>
      </PatientWorkspaceGrid>
    </PatientWorkspaceShell>
  );
}
