import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, fetchPatient, PatientSummary } from '../auth/session-api';
import {
  PatientFormFramework,
  PatientModuleCards,
  PatientModuleState,
  PatientPanel,
  PatientRecordHeader,
  PatientSectionNavigation,
  PatientWorkspaceGrid,
  PatientWorkspaceShell,
} from '../components/PatientWorkspaceFoundation';

type PatientSectionKey =
  | 'overview'
  | 'demographics'
  | 'contacts'
  | 'address'
  | 'eligibility'
  | 'diagnoses'
  | 'payer'
  | 'authorizations'
  | 'attachments';

type PatientRecordWorkspacePageProps = {
  section: PatientSectionKey;
};

const SECTION_CONFIG: Record<
  PatientSectionKey,
  {
    label: string;
    description: string;
    permission?: FrontendPermission;
    viewPermission?: FrontendPermission;
    formTitle: string;
    formHelper: string;
    fields: string[];
  }
> = {
  overview: {
    label: 'Overview',
    description: 'Shared patient workspace summary and section-level routing.',
    formTitle: 'Overview scaffold',
    formHelper: 'The overview route reuses the same patient summary shell used by all detailed modules.',
    fields: ['Header summary', 'Secondary navigation', 'Overview cards'],
  },
  demographics: {
    label: 'Demographics',
    description: 'Identity and communication details stay in one reusable record edit surface.',
    permission: 'manage_patient_demographics',
    formTitle: 'Demographic form shell',
    formHelper: 'Future create/edit fields can plug in here with inline validation and duplicate-patient conflict handling.',
    fields: ['First name', 'Last name', 'Preferred name', 'Date of birth', 'Language'],
  },
  contacts: {
    label: 'Contacts',
    description: 'Emergency contacts, responsible parties, and relationship data share one list+form pattern.',
    permission: 'manage_patient_contacts',
    formTitle: 'Contact form shell',
    formHelper: 'Primary/emergency flags and relationship fields will reuse one patient form pattern.',
    fields: ['Contact name', 'Relationship', 'Primary phone', 'Responsible party', 'Emergency contact'],
  },
  address: {
    label: 'Address',
    description: 'Address, service-location details, and geo context remain isolated from demographics edits.',
    permission: 'manage_patient_address',
    formTitle: 'Address form shell',
    formHelper: 'Address validation, coordinates, and service-location notes will reuse one consistent layout.',
    fields: ['Street address', 'City', 'State', 'Postal code', 'Location notes'],
  },
  eligibility: {
    label: 'Eligibility',
    description: 'Eligibility windows and service-line linkage live in one consistent list/detail workspace.',
    permission: 'manage_patient_eligibility',
    formTitle: 'Eligibility form shell',
    formHelper: 'Date-range UX and active/historical states are standardized here for later Epic 3 service workflows.',
    fields: ['Service line', 'Eligibility start', 'Eligibility end', 'Status', 'Notes'],
  },
  diagnoses: {
    label: 'Diagnoses',
    description: 'Condition history, primary flags, and resolution dates will share one clinical record pattern.',
    permission: 'manage_patient_diagnoses',
    formTitle: 'Diagnosis form shell',
    formHelper: 'Primary/secondary and active/resolved patterns are reusable across future diagnosis workflows.',
    fields: ['Diagnosis code', 'Description', 'Primary diagnosis', 'Onset date', 'Resolved date'],
  },
  payer: {
    label: 'Payer',
    description: 'Coverage windows and primary payer designation stay grouped in one financial context area.',
    permission: 'manage_patient_payer_links',
    formTitle: 'Payer form shell',
    formHelper: 'Effective-date overlaps, primary payer state, and API conflict handling share one foundation pattern.',
    fields: ['Payer name', 'Member ID', 'Primary payer', 'Effective from', 'Effective to'],
  },
  authorizations: {
    label: 'Authorizations',
    description: 'Service windows, authorization numbers, and usage tracking live in one reusable service timeline module.',
    permission: 'manage_patient_authorizations',
    formTitle: 'Authorization form shell',
    formHelper: 'Date windows, remaining usage, and transition validation will be consistent across authorization workflows.',
    fields: ['Authorization number', 'Service line', 'Authorized units', 'Used units', 'Status'],
  },
  attachments: {
    label: 'Attachments',
    description: 'Secure document handling can render as read-only or editable without changing the patient detail shell.',
    permission: 'manage_patient_attachments',
    viewPermission: 'view_patient_attachments',
    formTitle: 'Attachment workflow shell',
    formHelper: 'Upload states, controlled download actions, and file-policy failures are reserved for the later attachment stories.',
    fields: ['File name', 'Attachment type', 'Uploaded by', 'Uploaded at', 'Notes'],
  },
};

export function PatientRecordWorkspacePage({
  section,
}: PatientRecordWorkspacePageProps) {
  const { patientId = '' } = useParams();
  const location = useLocation();
  const { state } = useAuth();
  const { profile } = useAccess();
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== 'authenticated' || !patientId || patientId === 'demo-record') {
      setLoading(false);
      setPatient(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const devSession = loadDevSessionCredentials();
    setLoading(true);
    setError(null);

    void fetchPatient(patientId, {
      accessToken: devSession?.accessToken,
      sessionId: state.session.sessionId,
    })
      .then((response) => {
        if (!cancelled) {
          setPatient(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load this patient record right now.',
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
  }, [
    patientId,
    state.status,
    state.status === 'authenticated' ? state.session.sessionId : null,
  ]);

  const sectionConfig = SECTION_CONFIG[section];
  const basePath = `/app/patients/${patientId || 'demo-record'}`;

  const navLinks = useMemo(
    () =>
      (Object.entries(SECTION_CONFIG) as Array<[PatientSectionKey, (typeof SECTION_CONFIG)[PatientSectionKey]]>)
        .map(([key, config]) => {
          const path = key === 'overview' ? basePath : `${basePath}/${key}`;
          const canView =
            !config.permission ||
            canAccessPermission(profile, config.permission) ||
            (config.viewPermission ? canAccessPermission(profile, config.viewPermission) : false);

          return {
            path,
            label: config.label,
            state: canView
              ? config.permission && !canAccessPermission(profile, config.permission)
                ? 'read-only'
                : 'available'
              : 'restricted',
          } as {
            path: string;
            label: string;
            state: 'available' | 'read-only' | 'restricted';
          };
        }),
    [basePath, profile],
  );

  const canEditSection = sectionConfig.permission
    ? canAccessPermission(profile, sectionConfig.permission)
    : true;
  const readOnlySection =
    !!sectionConfig.viewPermission &&
    !canEditSection &&
    canAccessPermission(profile, sectionConfig.viewPermission);

  const moduleCards = navLinks
    .filter((link) => link.path !== location.pathname)
    .map((link) => ({
      path: link.path,
      label: link.label,
      description:
        SECTION_CONFIG[
          link.path === basePath
            ? 'overview'
            : (link.path.split('/').at(-1) as Exclude<PatientSectionKey, 'overview'>)
        ].description,
      state: link.state,
    }));

  const patientHeader = patient
    ? {
        id: patient.id,
        status: patient.status,
        displayName: `${patient.firstName} ${patient.lastName}`,
        preferredName: patient.preferredName,
        externalReference: patient.externalReference,
        dateOfBirth: patient.dateOfBirth,
        primaryPhone: patient.primaryPhone,
        email: patient.email,
        language: patient.language,
      }
    : {
        id: patientId || 'demo-record',
        status: 'Preview',
        displayName: 'Patient record scaffold',
        preferredName: null,
        externalReference: 'Phase A foundation',
        dateOfBirth: '1990-01-15',
        primaryPhone: null,
        email: null,
        language: null,
      };

  return (
    <PatientWorkspaceShell
      eyebrow="Epic 3 record workspace"
      title={section === 'overview' ? 'Patient detail workspace shell' : sectionConfig.label}
      description={sectionConfig.description}
    >
      <PatientWorkspaceGrid>
        <PatientRecordHeader patient={patientHeader} />
        <PatientSectionNavigation currentPath={location.pathname} links={navLinks} />

        {loading ? (
          <PatientPanel
            title="Loading patient record"
            description="The detail workspace header is backed by `GET /api/patients/{patientId}` when a real patient ID is used."
          >
            <PatientModuleState
              title="Fetching patient header"
              description="Phase A already uses the live patient record API so later modules can inherit the same record-loading behavior."
            />
          </PatientPanel>
        ) : error ? (
          <PatientPanel
            title="Patient record unavailable"
            description="The shared patient shell keeps record load failures consistent across all Epic 3 modules."
          >
            <p className="alert">{error}</p>
          </PatientPanel>
        ) : (
          <>
            <PatientPanel
              title={section === 'overview' ? 'Workspace overview' : `${sectionConfig.label} module state`}
              description="Loading, empty, validation, and authorization messaging now uses one reusable patient module container."
            >
              <PatientModuleState
                title={
                  section === 'overview'
                    ? 'Record sections are grouped and permission-aware.'
                    : canEditSection
                      ? `${sectionConfig.label} is ready for editable workflows.`
                      : readOnlySection
                        ? `${sectionConfig.label} is currently read-only.`
                        : `${sectionConfig.label} is scaffolded for future work.`
                }
                description={
                  section === 'overview'
                    ? 'Future demographics, contacts, address, eligibility, diagnoses, payer, authorization, and attachment screens can all land inside this shell without changing the record header or secondary navigation.'
                    : canEditSection
                      ? 'The route guard, header shell, and shared form framework are already in place. Later stories only need to plug real module fields and API actions into this surface.'
                      : 'This module can degrade to a controlled read-only or unavailable state without breaking the patient workspace layout.'
                }
                variant={readOnlySection ? 'readonly' : 'info'}
              />
            </PatientPanel>

            <PatientFormFramework
              fields={sectionConfig.fields.map((field) => ({
                label: field,
                value: 'Shared patient form placeholder',
              }))}
              helper={sectionConfig.formHelper}
              mode={canEditSection ? 'editable' : 'read-only'}
              title={sectionConfig.formTitle}
            />

            <PatientPanel
              title="Related patient sections"
              description="This card set proves the reusable record-side navigation model required by FE3-04 and FE3-12."
            >
              <PatientModuleCards cards={moduleCards} />
            </PatientPanel>
          </>
        )}
      </PatientWorkspaceGrid>
    </PatientWorkspaceShell>
  );
}
