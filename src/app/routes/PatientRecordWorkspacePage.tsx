import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  createPatient,
  createPatientContact,
  deactivatePatient,
  deactivatePatientContact,
  fetchPatient,
  fetchPatientAddress,
  fetchPatientContacts,
  ManagePatientAddressRequest,
  ManagePatientContactRequest,
  ManagePatientRequest,
  PatientAddress,
  PatientContact,
  PatientSummary,
  updatePatient,
  updatePatientContact,
  upsertPatientAddress,
} from '../auth/session-api';
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

type PatientFormState = {
  externalReference: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  sexMarker: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  language: string;
  notesSummary: string;
};

type ContactFormState = {
  relationshipType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: boolean;
  primaryContact: boolean;
  responsibleParty: boolean;
  notes: string;
};

type AddressFormState = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  geocodeStatus: string;
  timezone: string;
  locationNotes: string;
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
    formHelper: 'Demographic validation, duplicate/conflict handling, and controlled status changes all share this record edit surface.',
    fields: ['First name', 'Last name', 'Preferred name', 'Date of birth', 'Language'],
  },
  contacts: {
    label: 'Contacts',
    description: 'Emergency contacts, responsible parties, and relationship data share one list+form pattern.',
    permission: 'manage_patient_contacts',
    formTitle: 'Contact form shell',
    formHelper: 'Primary/emergency flags and relationship fields reuse one patient contact workflow.',
    fields: ['Contact name', 'Relationship', 'Primary phone', 'Responsible party', 'Emergency contact'],
  },
  address: {
    label: 'Address',
    description: 'Address, service-location details, and geo context remain isolated from demographics edits.',
    permission: 'manage_patient_address',
    formTitle: 'Address form shell',
    formHelper: 'Address validation, optional coordinates, timezone, and location notes use one consistent form layout.',
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

const EMPTY_PATIENT_FORM: PatientFormState = {
  externalReference: '',
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  dateOfBirth: '',
  sexMarker: '',
  primaryPhone: '',
  secondaryPhone: '',
  email: '',
  language: 'en-US',
  notesSummary: '',
};

const EMPTY_CONTACT_FORM: ContactFormState = {
  relationshipType: '',
  fullName: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: false,
  primaryContact: false,
  responsibleParty: false,
  notes: '',
};

const EMPTY_ADDRESS_FORM: AddressFormState = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'USA',
  latitude: '',
  longitude: '',
  geocodeStatus: '',
  timezone: '',
  locationNotes: '',
};

function mapPatientToForm(patient: PatientSummary): PatientFormState {
  return {
    externalReference: patient.externalReference ?? '',
    firstName: patient.firstName,
    middleName: patient.middleName ?? '',
    lastName: patient.lastName,
    preferredName: patient.preferredName ?? '',
    dateOfBirth: patient.dateOfBirth,
    sexMarker: patient.sexMarker ?? '',
    primaryPhone: patient.primaryPhone ?? '',
    secondaryPhone: patient.secondaryPhone ?? '',
    email: patient.email ?? '',
    language: patient.language ?? 'en-US',
    notesSummary: patient.notesSummary ?? '',
  };
}

function mapContactToForm(contact: PatientContact): ContactFormState {
  return {
    relationshipType: contact.relationshipType ?? '',
    fullName: contact.fullName,
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    address: contact.address ?? '',
    emergencyContact: contact.emergencyContact,
    primaryContact: contact.primaryContact,
    responsibleParty: contact.responsibleParty,
    notes: contact.notes ?? '',
  };
}

function mapAddressToForm(address: PatientAddress): AddressFormState {
  return {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country ?? 'USA',
    latitude: address.latitude != null ? String(address.latitude) : '',
    longitude: address.longitude != null ? String(address.longitude) : '',
    geocodeStatus: address.geocodeStatus ?? '',
    timezone: address.timezone ?? '',
    locationNotes: address.locationNotes ?? '',
  };
}

function validatePatientForm(form: PatientFormState): Partial<Record<keyof PatientFormState, string>> {
  const errors: Partial<Record<keyof PatientFormState, string>> = {};
  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }
  if (!form.dateOfBirth.trim()) {
    errors.dateOfBirth = 'Date of birth is required.';
  }
  return errors;
}

function validateContactForm(form: ContactFormState): Partial<Record<keyof ContactFormState, string>> {
  const errors: Partial<Record<keyof ContactFormState, string>> = {};
  if (!form.fullName.trim()) {
    errors.fullName = 'Contact name is required.';
  }
  return errors;
}

function validateAddressForm(form: AddressFormState): Partial<Record<keyof AddressFormState, string>> {
  const errors: Partial<Record<keyof AddressFormState, string>> = {};
  if (!form.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required.';
  }
  if (!form.city.trim()) {
    errors.city = 'City is required.';
  }
  if (!form.state.trim()) {
    errors.state = 'State is required.';
  }
  if (!form.postalCode.trim()) {
    errors.postalCode = 'Postal code is required.';
  }
  if (form.latitude && Number.isNaN(Number(form.latitude))) {
    errors.latitude = 'Latitude must be numeric.';
  }
  if (form.longitude && Number.isNaN(Number(form.longitude))) {
    errors.longitude = 'Longitude must be numeric.';
  }
  return errors;
}

function buildSectionStates(
  basePath: string,
  profile: ReturnType<typeof useAccess>['profile'],
  isNewPatient: boolean,
) {
  return (Object.entries(SECTION_CONFIG) as Array<[PatientSectionKey, (typeof SECTION_CONFIG)[PatientSectionKey]]>)
    .map(([key, config]) => {
      const path = key === 'overview' ? basePath : `${basePath}/${key}`;
      const canView =
        !isNewPatient &&
        (!config.permission ||
          canAccessPermission(profile, config.permission) ||
          (config.viewPermission ? canAccessPermission(profile, config.viewPermission) : false));

      return {
        path,
        label: config.label,
        description: config.description,
        state:
          isNewPatient && key !== 'demographics'
            ? 'restricted'
            : canView
              ? config.permission && !canAccessPermission(profile, config.permission)
                ? 'read-only'
                : 'available'
              : key === 'demographics' && isNewPatient
                ? 'available'
                : 'restricted',
      } as const;
    })
    ;
}

export function PatientRecordWorkspacePage({
  section,
}: PatientRecordWorkspacePageProps) {
  const navigate = useNavigate();
  const { patientId = '' } = useParams();
  const location = useLocation();
  const { state } = useAuth();
  const { profile } = useAccess();
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  const [patientForm, setPatientForm] = useState<PatientFormState>(EMPTY_PATIENT_FORM);
  const [patientFormErrors, setPatientFormErrors] = useState<
    Partial<Record<keyof PatientFormState, string>>
  >({});
  const [patientSaving, setPatientSaving] = useState(false);
  const [patientSuccessMessage, setPatientSuccessMessage] = useState<string | null>(null);

  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const [contactFormErrors, setContactFormErrors] = useState<
    Partial<Record<keyof ContactFormState, string>>
  >({});
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSuccessMessage, setContactSuccessMessage] = useState<string | null>(null);

  const [address, setAddress] = useState<PatientAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [addressFormErrors, setAddressFormErrors] = useState<
    Partial<Record<keyof AddressFormState, string>>
  >({});
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<string | null>(null);

  const isNewPatient = patientId === 'new';
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

    if (!patientId || patientId === 'demo-record' || isNewPatient) {
      setPatientLoading(false);
      setPatient(null);
      setPatientError(null);
      setPatientForm(EMPTY_PATIENT_FORM);
      return;
    }

    let cancelled = false;
    setPatientLoading(true);
    setPatientError(null);

    void fetchPatient(patientId, authContext)
      .then((response) => {
        if (!cancelled) {
          setPatient(response);
          setPatientForm(mapPatientToForm(response));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPatientError(
            cause instanceof ApiError ? cause.message : 'Unable to load this patient record right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPatientLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, isNewPatient, patientId, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !patientId || isNewPatient) {
      return;
    }

    if (section !== 'overview' && section !== 'contacts') {
      return;
    }

    let cancelled = false;
    setContactsLoading(true);
    setContactsError(null);

    void fetchPatientContacts(patientId, authContext)
      .then((response) => {
        if (!cancelled) {
          setContacts(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setContactsError(
            cause instanceof ApiError ? cause.message : 'Unable to load patient contacts right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setContactsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, isNewPatient, patientId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !patientId || isNewPatient) {
      return;
    }

    if (section !== 'overview' && section !== 'address') {
      return;
    }

    let cancelled = false;
    setAddressLoading(true);
    setAddressError(null);

    void fetchPatientAddress(patientId, authContext)
      .then((response) => {
        if (!cancelled) {
          setAddress(response);
          setAddressForm(mapAddressToForm(response));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          if (cause instanceof ApiError && cause.status === 404) {
            setAddress(null);
            setAddressForm(EMPTY_ADDRESS_FORM);
            return;
          }
          setAddressError(
            cause instanceof ApiError ? cause.message : 'Unable to load patient address right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAddressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, isNewPatient, patientId, section, state.status]);

  const sectionConfig = SECTION_CONFIG[section];
  const basePath = `/app/patients/${patientId || 'demo-record'}`;
  const sectionStates = buildSectionStates(basePath, profile, isNewPatient);
  const navLinks = sectionStates.map((item) => ({
    path: item.path,
    label: item.label,
    state: item.state,
  }));
  const cards = sectionStates.filter((item) => item.path !== location.pathname);

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
        id: isNewPatient ? 'new-record' : patientId || 'demo-record',
        status: isNewPatient ? 'Draft' : 'Preview',
        displayName: isNewPatient ? 'New patient record' : 'Patient record scaffold',
        preferredName: null,
        externalReference: isNewPatient ? 'Create flow' : 'Phase A foundation',
        dateOfBirth: '1990-01-15',
        primaryPhone: null,
        email: null,
        language: null,
      };

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validatePatientForm(patientForm);
    setPatientFormErrors(validationErrors);
    setPatientSuccessMessage(null);
    setPatientError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setPatientSaving(true);
    try {
      const response = isNewPatient
        ? await createPatient({
            ...authContext,
            ...patientForm,
          })
        : await updatePatient(patientId, {
            ...authContext,
            ...patientForm,
          });
      setPatient(response);
      setPatientForm(mapPatientToForm(response));
      setPatientSuccessMessage(
        isNewPatient ? 'Patient record created successfully.' : 'Patient demographics saved successfully.',
      );
      if (isNewPatient) {
        navigate(`/app/patients/${response.id}/demographics`, { replace: true });
      }
    } catch (cause) {
      setPatientError(cause instanceof Error ? cause.message : 'Unable to save patient demographics.');
    } finally {
      setPatientSaving(false);
    }
  }

  async function handlePatientDeactivate() {
    if (!patient || !window.confirm('Deactivate this patient record? The record will stay visible as inactive.')) {
      return;
    }

    setPatientSaving(true);
    setPatientSuccessMessage(null);
    setPatientError(null);
    try {
      const response = await deactivatePatient(patient.id, authContext);
      setPatient(response);
      setPatientForm(mapPatientToForm(response));
      setPatientSuccessMessage('Patient record marked inactive.');
    } catch (cause) {
      setPatientError(cause instanceof Error ? cause.message : 'Unable to deactivate this patient record.');
    } finally {
      setPatientSaving(false);
    }
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateContactForm(contactForm);
    setContactFormErrors(validationErrors);
    setContactSuccessMessage(null);
    setContactsError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setContactSaving(true);
    try {
      const response = selectedContactId
        ? await updatePatientContact(selectedContactId, { ...authContext, ...contactForm })
        : await createPatientContact(patientId, { ...authContext, ...contactForm });
      setContacts((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.id);
        return [response, ...withoutCurrent].sort((left, right) =>
          Number(right.primaryContact) - Number(left.primaryContact),
        );
      });
      setSelectedContactId(null);
      setContactForm(EMPTY_CONTACT_FORM);
      setContactSuccessMessage(
        selectedContactId ? 'Patient contact updated successfully.' : 'Patient contact created successfully.',
      );
    } catch (cause) {
      setContactsError(cause instanceof Error ? cause.message : 'Unable to save patient contact.');
    } finally {
      setContactSaving(false);
    }
  }

  async function handleContactDeactivate(contactId: string) {
    if (!window.confirm('Deactivate this contact? The record will stay in history as inactive.')) {
      return;
    }

    setContactSaving(true);
    try {
      const response = await deactivatePatientContact(contactId, authContext);
      setContacts((current) => current.map((item) => (item.id === response.id ? response : item)));
      setContactSuccessMessage('Patient contact marked inactive.');
    } catch (cause) {
      setContactsError(cause instanceof Error ? cause.message : 'Unable to deactivate patient contact.');
    } finally {
      setContactSaving(false);
    }
  }

  async function handleAddressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateAddressForm(addressForm);
    setAddressFormErrors(validationErrors);
    setAddressSuccessMessage(null);
    setAddressError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setAddressSaving(true);
    try {
      const response = await upsertPatientAddress(patientId, {
        ...authContext,
        ...addressForm,
        latitude: addressForm.latitude ? Number(addressForm.latitude) : undefined,
        longitude: addressForm.longitude ? Number(addressForm.longitude) : undefined,
      } satisfies ManagePatientAddressRequest);
      setAddress(response);
      setAddressForm(mapAddressToForm(response));
      setAddressSuccessMessage('Patient address saved successfully.');
    } catch (cause) {
      setAddressError(cause instanceof Error ? cause.message : 'Unable to save patient address.');
    } finally {
      setAddressSaving(false);
    }
  }

  function renderOverviewContent() {
    return (
      <>
        <PatientPanel
          title="Patient summary cards"
          description="FE3-15 uses the data already available in Phase B so staff can understand the most important patient context before deeper clinical and financial modules arrive."
        >
          <div className="patient-summary-cards">
            <article className="patient-summary-card">
              <span className="eyebrow">Contacts</span>
              <strong>{contacts.find((contact) => contact.primaryContact)?.fullName ?? 'No primary contact yet'}</strong>
              <p>
                {contacts.length
                  ? `${contacts.filter((contact) => contact.emergencyContact).length} emergency contact(s) on file.`
                  : 'No patient contacts have been recorded yet.'}
              </p>
            </article>
            <article className="patient-summary-card">
              <span className="eyebrow">Address</span>
              <strong>{address ? `${address.city}, ${address.state}` : 'No service address yet'}</strong>
              <p>
                {address
                  ? `${address.addressLine1}${address.timezone ? ` • ${address.timezone}` : ''}`
                  : 'Address and service-location details can be added from the Address section.'}
              </p>
            </article>
            <article className="patient-summary-card">
              <span className="eyebrow">Eligibility</span>
              <strong>Available in Phase C</strong>
              <p>Eligibility highlights will appear here once service windows are connected.</p>
            </article>
            <article className="patient-summary-card">
              <span className="eyebrow">Coverage and authorizations</span>
              <strong>Available in Phase C</strong>
              <p>Payer and authorization summaries will appear here when those modules are implemented.</p>
            </article>
          </div>
        </PatientPanel>

        <PatientPanel
          title="Recent record state"
          description="Overview cards remain concise while still surfacing whether key Epic 3 setup surfaces are complete."
        >
          {contactsLoading || addressLoading ? (
            <PatientModuleState
              title="Refreshing summary sources"
              description="Patient contacts and address data are loading so the summary cards can show current record completeness."
            />
          ) : (
            <div className="patient-completeness-grid">
              <article>
                <strong>{patient?.primaryPhone ?? 'Missing'}</strong>
                <span>Primary phone</span>
              </article>
              <article>
                <strong>{contacts.length ? `${contacts.length} contact(s)` : 'Missing'}</strong>
                <span>Contact records</span>
              </article>
              <article>
                <strong>{address ? 'Recorded' : 'Missing'}</strong>
                <span>Service address</span>
              </article>
              <article>
                <strong>{patient?.status ?? 'Unknown'}</strong>
                <span>Record lifecycle</span>
              </article>
            </div>
          )}
        </PatientPanel>
      </>
    );
  }

  function renderDemographicsContent() {
    return (
      <>
        <PatientPanel
          title={isNewPatient ? 'Create patient record' : 'Patient demographics'}
          description="This screen now uses the live patient create and update APIs. Inline validation runs before submit, and backend conflicts are surfaced as form-level errors."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handlePatientSubmit}>
            <div className="patient-form-grid">
              {(
                [
                  ['externalReference', 'External reference'],
                  ['firstName', 'First name'],
                  ['middleName', 'Middle name'],
                  ['lastName', 'Last name'],
                  ['preferredName', 'Preferred name'],
                  ['dateOfBirth', 'Date of birth'],
                  ['sexMarker', 'Sex marker'],
                  ['primaryPhone', 'Primary phone'],
                  ['secondaryPhone', 'Secondary phone'],
                  ['email', 'Email'],
                  ['language', 'Language'],
                ] as Array<[keyof PatientFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) => setPatientForm((current) => ({ ...current, [key]: event.target.value }))}
                    type={key === 'dateOfBirth' ? 'date' : key === 'email' ? 'email' : 'text'}
                    value={patientForm[key]}
                  />
                  {patientFormErrors[key] ? <small className="field-error">{patientFormErrors[key]}</small> : null}
                </label>
              ))}
            </div>
            <label className="field field-light">
              <span>Notes summary</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setPatientForm((current) => ({ ...current, notesSummary: event.target.value }))
                }
                rows={4}
                value={patientForm.notesSummary}
              />
            </label>
            {patientError ? <p className="alert">{patientError}</p> : null}
            {patientSuccessMessage ? <p className="success-note">{patientSuccessMessage}</p> : null}
            <div className="button-row">
              <button className="button" disabled={patientSaving} type="submit">
                {patientSaving ? 'Saving...' : isNewPatient ? 'Create patient' : 'Save demographics'}
              </button>
              {!isNewPatient && patient ? (
                <button
                  className="button button-ghost"
                  disabled={patientSaving || patient.status === 'INACTIVE'}
                  onClick={() => void handlePatientDeactivate()}
                  type="button"
                >
                  {patient.status === 'INACTIVE' ? 'Already inactive' : 'Deactivate record'}
                </button>
              ) : null}
            </div>
          </form>
        </PatientPanel>
        <PatientFormFramework
          fields={SECTION_CONFIG.demographics.fields.map((field) => ({
            label: field,
            value: 'Shared patient demographic pattern',
          }))}
          helper={sectionConfig.formHelper}
          mode="editable"
          title={sectionConfig.formTitle}
        />
      </>
    );
  }

  function renderContactsContent() {
    return (
      <>
        <PatientPanel
          title="Contact list"
          description="Primary, emergency, and responsible-party states are visible directly in the list so users can confirm who should be contacted without opening every row."
        >
          {contactsLoading ? <p>Loading patient contacts...</p> : null}
          {contactsError ? <p className="alert">{contactsError}</p> : null}
          {contactSuccessMessage ? <p className="success-note">{contactSuccessMessage}</p> : null}
          {!contactsLoading && contacts.length === 0 ? (
            <PatientModuleState
              title="No patient contacts on file"
              description="Create the first contact below to establish emergency and responsible-party information."
              variant="empty"
            />
          ) : (
            <div className="patient-contact-list">
              {contacts.map((contact) => (
                <article key={contact.id} className="patient-contact-card">
                  <div className="patient-contact-card-header">
                    <strong>{contact.fullName}</strong>
                    <div className="patient-contact-tags">
                      {contact.primaryContact ? <span className="status-pill status-active">Primary</span> : null}
                      {contact.emergencyContact ? <span className="status-pill status-active">Emergency</span> : null}
                      {contact.responsibleParty ? <span className="status-pill status-active">Responsible</span> : null}
                      <span className={`status-pill status-${contact.status.toLowerCase()}`}>{contact.status}</span>
                    </div>
                  </div>
                  <p>{contact.relationshipType ?? 'Relationship not set'}</p>
                  <p>{contact.phone ?? 'No phone'} • {contact.email ?? 'No email'}</p>
                  <div className="patient-directory-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setContactForm(mapContactToForm(contact));
                        setContactFormErrors({});
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      disabled={contact.status === 'INACTIVE'}
                      onClick={() => void handleContactDeactivate(contact.id)}
                      type="button"
                    >
                      {contact.status === 'INACTIVE' ? 'Inactive' : 'Deactivate'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PatientPanel>

        <PatientPanel
          title={selectedContactId ? 'Edit patient contact' : 'Add patient contact'}
          description="Relationship, primary, emergency, and responsible-party fields are edited in one reusable contact form."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handleContactSubmit}>
            <div className="patient-form-grid">
              {(
                [
                  ['fullName', 'Full name'],
                  ['relationshipType', 'Relationship'],
                  ['phone', 'Phone'],
                  ['email', 'Email'],
                  ['address', 'Address'],
                ] as Array<[keyof ContactFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) => setContactForm((current) => ({ ...current, [key]: event.target.value }))}
                    type={key === 'email' ? 'email' : 'text'}
                    value={contactForm[key] as string}
                  />
                  {contactFormErrors[key] ? <small className="field-error">{contactFormErrors[key]}</small> : null}
                </label>
              ))}
            </div>
            <label className="field field-light">
              <span>Notes</span>
              <textarea
                className="input input-light"
                onChange={(event) => setContactForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                value={contactForm.notes}
              />
            </label>
            <div className="patient-toggle-grid">
              {(
                [
                  ['primaryContact', 'Primary contact'],
                  ['emergencyContact', 'Emergency contact'],
                  ['responsibleParty', 'Responsible party'],
                ] as Array<[keyof ContactFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="patient-checkbox">
                  <input
                    checked={contactForm[key] as boolean}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="button-row">
              <button className="button" disabled={contactSaving} type="submit">
                {contactSaving ? 'Saving...' : selectedContactId ? 'Save contact' : 'Add contact'}
              </button>
              {selectedContactId ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedContactId(null);
                    setContactForm(EMPTY_CONTACT_FORM);
                    setContactFormErrors({});
                  }}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </PatientPanel>
      </>
    );
  }

  function renderAddressContent() {
    return (
      <>
        <PatientPanel
          title="Service address"
          description="Address, optional geo details, timezone, and location notes are all managed through the Epic 3 address API."
        >
          {addressLoading ? <p>Loading address...</p> : null}
          {addressError ? <p className="alert">{addressError}</p> : null}
          {addressSuccessMessage ? <p className="success-note">{addressSuccessMessage}</p> : null}
          {!addressLoading && !address ? (
            <PatientModuleState
              title="No address on file"
              description="Save the patient service address below to establish location and timezone context."
              variant="empty"
            />
          ) : null}
          {address ? (
            <div className="patient-address-summary">
              <strong>{address.addressLine1}</strong>
              <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
              <p>
                {address.timezone ?? 'No timezone'}
                {address.geocodeStatus ? ` • ${address.geocodeStatus}` : ''}
              </p>
            </div>
          ) : null}
        </PatientPanel>

        <PatientPanel
          title="Address form"
          description="Invalid address and coordinate input is handled inline before the request is sent."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handleAddressSubmit}>
            <div className="patient-form-grid">
              {(
                [
                  ['addressLine1', 'Address line 1'],
                  ['addressLine2', 'Address line 2'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['postalCode', 'Postal code'],
                  ['country', 'Country'],
                  ['latitude', 'Latitude'],
                  ['longitude', 'Longitude'],
                  ['geocodeStatus', 'Geocode status'],
                  ['timezone', 'Timezone'],
                ] as Array<[keyof AddressFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))}
                    value={addressForm[key]}
                  />
                  {addressFormErrors[key] ? <small className="field-error">{addressFormErrors[key]}</small> : null}
                </label>
              ))}
            </div>
            <label className="field field-light">
              <span>Location notes</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, locationNotes: event.target.value }))
                }
                rows={3}
                value={addressForm.locationNotes}
              />
            </label>
            <div className="button-row">
              <button className="button" disabled={addressSaving} type="submit">
                {addressSaving ? 'Saving...' : 'Save address'}
              </button>
            </div>
          </form>
        </PatientPanel>
      </>
    );
  }

  function renderScaffoldContent() {
    const canEditSection = sectionConfig.permission
      ? canAccessPermission(profile, sectionConfig.permission)
      : true;

    return (
      <>
        <PatientPanel
          title={`${sectionConfig.label} module state`}
          description="This section keeps the shared patient shell and route guard intact until its later Epic 3 phase lands."
        >
          <PatientModuleState
            title={
              canEditSection
                ? `${sectionConfig.label} is scaffolded for the next Epic 3 phase.`
                : `${sectionConfig.label} is not available for the current access profile.`
            }
            description={sectionConfig.description}
            variant="info"
          />
        </PatientPanel>
        <PatientFormFramework
          fields={sectionConfig.fields.map((field) => ({
            label: field,
            value: 'Shared patient module placeholder',
          }))}
          helper={sectionConfig.formHelper}
          mode={canEditSection ? 'editable' : 'read-only'}
          title={sectionConfig.formTitle}
        />
      </>
    );
  }

  return (
    <PatientWorkspaceShell
      eyebrow="Epic 3 record workspace"
      title={section === 'overview' ? 'Patient detail workspace' : sectionConfig.label}
      description={sectionConfig.description}
    >
      <PatientWorkspaceGrid>
        <PatientRecordHeader patient={patientHeader} />
        <PatientSectionNavigation currentPath={location.pathname} links={navLinks} />

        {patientLoading ? (
          <PatientPanel
            title="Loading patient record"
            description="The detail workspace header is backed by `GET /api/patients/{patientId}`."
          >
            <PatientModuleState
              title="Fetching patient header"
              description="The record shell waits for patient details before rendering the module content."
            />
          </PatientPanel>
        ) : patientError ? (
          <PatientPanel
            title="Patient record unavailable"
            description="The patient shell keeps record load failures consistent across all Epic 3 modules."
          >
            <p className="alert">{patientError}</p>
          </PatientPanel>
        ) : (
          <>
            {isNewPatient && section !== 'demographics' ? (
              <PatientPanel
                title={`${sectionConfig.label} requires a saved patient record`}
                description="Create the patient demographics first so the record can receive contacts, address details, and the later Epic 3 modules."
              >
                <PatientModuleState
                  title="Save the patient before continuing."
                  description="Once the demographic record is created, the rest of the patient workspace becomes available on the new record ID."
                  variant="empty"
                />
              </PatientPanel>
            ) : section === 'overview'
              ? renderOverviewContent()
              : section === 'demographics'
                ? renderDemographicsContent()
                : section === 'contacts'
                  ? renderContactsContent()
                  : section === 'address'
                    ? renderAddressContent()
                    : renderScaffoldContent()}

            <PatientPanel
              title="Related patient sections"
              description="Record-side navigation stays consistent even as individual Epic 3 modules arrive across phases."
            >
              <PatientModuleCards cards={cards} />
            </PatientPanel>
          </>
        )}
      </PatientWorkspaceGrid>
    </PatientWorkspaceShell>
  );
}
