import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  createPatient,
  createPatientAuthorization,
  createPatientContact,
  createPatientDiagnosis,
  createPatientEligibility,
  createPatientPayerLink,
  deactivatePatient,
  deactivatePatientAuthorization,
  deactivatePatientContact,
  deactivatePatientDiagnosis,
  deactivatePatientEligibility,
  deactivatePatientPayerLink,
  fetchPatient,
  fetchPatientAddress,
  fetchPatientAuthorizations,
  fetchPatientContacts,
  fetchPatientDiagnoses,
  fetchPatientEligibilities,
  fetchPatientPayerLinks,
  fetchServiceLines,
  ManagePatientAddressRequest,
  ManagePatientAuthorizationRequest,
  ManagePatientContactRequest,
  ManagePatientDiagnosisRequest,
  ManagePatientRequest,
  ManagePatientPayerLinkRequest,
  ManagePatientServiceEligibilityRequest,
  PatientAddress,
  PatientAuthorization,
  PatientContact,
  PatientDiagnosis,
  PatientDiagnosisStatus,
  PatientEpisodeAuthorizationStatus,
  PatientPayerLink,
  PatientPayerLinkStatus,
  PatientServiceEligibility,
  PatientServiceEligibilityStatus,
  PatientSummary,
  ServiceLineSummary,
  updatePatient,
  updatePatientAuthorization,
  updatePatientContact,
  updatePatientDiagnosis,
  updatePatientEligibility,
  updatePatientPayerLink,
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

type EligibilityFormState = {
  serviceLineId: string;
  status: PatientServiceEligibilityStatus;
  effectiveFrom: string;
  effectiveTo: string;
  verificationSource: string;
  notes: string;
};

type DiagnosisFormState = {
  diagnosisCode: string;
  description: string;
  diagnosisType: string;
  primaryCondition: boolean;
  onsetDate: string;
  resolvedDate: string;
  status: PatientDiagnosisStatus;
  notes: string;
};

type PayerFormState = {
  payerName: string;
  payerExternalId: string;
  memberPolicyNumber: string;
  groupNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  primaryPayer: boolean;
  status: PatientPayerLinkStatus;
  notes: string;
};

type AuthorizationFormState = {
  patientPayerLinkId: string;
  serviceLineId: string;
  authorizationNumber: string;
  startDate: string;
  endDate: string;
  authorizedUnits: string;
  usedUnits: string;
  status: PatientEpisodeAuthorizationStatus;
  notes: string;
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

const EMPTY_ELIGIBILITY_FORM: EligibilityFormState = {
  serviceLineId: '',
  status: 'ELIGIBLE',
  effectiveFrom: '',
  effectiveTo: '',
  verificationSource: '',
  notes: '',
};

const EMPTY_DIAGNOSIS_FORM: DiagnosisFormState = {
  diagnosisCode: '',
  description: '',
  diagnosisType: '',
  primaryCondition: false,
  onsetDate: '',
  resolvedDate: '',
  status: 'ACTIVE',
  notes: '',
};

const EMPTY_PAYER_FORM: PayerFormState = {
  payerName: '',
  payerExternalId: '',
  memberPolicyNumber: '',
  groupNumber: '',
  effectiveFrom: '',
  effectiveTo: '',
  primaryPayer: false,
  status: 'ACTIVE',
  notes: '',
};

const EMPTY_AUTHORIZATION_FORM: AuthorizationFormState = {
  patientPayerLinkId: '',
  serviceLineId: '',
  authorizationNumber: '',
  startDate: '',
  endDate: '',
  authorizedUnits: '',
  usedUnits: '',
  status: 'PENDING',
  notes: '',
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

function mapEligibilityToForm(item: PatientServiceEligibility): EligibilityFormState {
  return {
    serviceLineId: item.serviceLineId ?? '',
    status: item.status,
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo ?? '',
    verificationSource: item.verificationSource ?? '',
    notes: item.notes ?? '',
  };
}

function mapDiagnosisToForm(item: PatientDiagnosis): DiagnosisFormState {
  return {
    diagnosisCode: item.diagnosisCode ?? '',
    description: item.description,
    diagnosisType: item.diagnosisType ?? '',
    primaryCondition: item.primaryCondition,
    onsetDate: item.onsetDate ?? '',
    resolvedDate: item.resolvedDate ?? '',
    status: item.status,
    notes: item.notes ?? '',
  };
}

function mapPayerToForm(item: PatientPayerLink): PayerFormState {
  return {
    payerName: item.payerName ?? '',
    payerExternalId: item.payerExternalId ?? '',
    memberPolicyNumber: item.memberPolicyNumber ?? '',
    groupNumber: item.groupNumber ?? '',
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo ?? '',
    primaryPayer: item.primaryPayer,
    status: item.status,
    notes: item.notes ?? '',
  };
}

function mapAuthorizationToForm(item: PatientAuthorization): AuthorizationFormState {
  return {
    patientPayerLinkId: item.patientPayerLinkId ?? '',
    serviceLineId: item.serviceLineId ?? '',
    authorizationNumber: item.authorizationNumber ?? '',
    startDate: item.startDate,
    endDate: item.endDate,
    authorizedUnits: item.authorizedUnits != null ? String(item.authorizedUnits) : '',
    usedUnits: item.usedUnits != null ? String(item.usedUnits) : '',
    status: item.status,
    notes: item.notes ?? '',
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

function validateEligibilityForm(
  form: EligibilityFormState,
): Partial<Record<keyof EligibilityFormState, string>> {
  const errors: Partial<Record<keyof EligibilityFormState, string>> = {};
  if (!form.effectiveFrom.trim()) {
    errors.effectiveFrom = 'Effective start date is required.';
  }
  if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
    errors.effectiveTo = 'End date must be on or after the start date.';
  }
  return errors;
}

function validateDiagnosisForm(
  form: DiagnosisFormState,
): Partial<Record<keyof DiagnosisFormState, string>> {
  const errors: Partial<Record<keyof DiagnosisFormState, string>> = {};
  if (!form.description.trim()) {
    errors.description = 'Diagnosis description is required.';
  }
  if (form.resolvedDate && form.onsetDate && form.resolvedDate < form.onsetDate) {
    errors.resolvedDate = 'Resolved date must be on or after onset date.';
  }
  return errors;
}

function validatePayerForm(form: PayerFormState): Partial<Record<keyof PayerFormState, string>> {
  const errors: Partial<Record<keyof PayerFormState, string>> = {};
  if (!form.effectiveFrom.trim()) {
    errors.effectiveFrom = 'Effective start date is required.';
  }
  if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
    errors.effectiveTo = 'End date must be on or after the start date.';
  }
  return errors;
}

function validateAuthorizationForm(
  form: AuthorizationFormState,
): Partial<Record<keyof AuthorizationFormState, string>> {
  const errors: Partial<Record<keyof AuthorizationFormState, string>> = {};
  if (!form.startDate.trim()) {
    errors.startDate = 'Start date is required.';
  }
  if (!form.endDate.trim()) {
    errors.endDate = 'End date is required.';
  }
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'End date must be on or after the start date.';
  }
  if (form.authorizedUnits && Number.isNaN(Number(form.authorizedUnits))) {
    errors.authorizedUnits = 'Authorized units must be numeric.';
  }
  if (form.usedUnits && Number.isNaN(Number(form.usedUnits))) {
    errors.usedUnits = 'Used units must be numeric.';
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

  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [eligibilities, setEligibilities] = useState<PatientServiceEligibility[]>([]);
  const [eligibilitiesLoading, setEligibilitiesLoading] = useState(false);
  const [eligibilitiesError, setEligibilitiesError] = useState<string | null>(null);
  const [eligibilityForm, setEligibilityForm] = useState<EligibilityFormState>(EMPTY_ELIGIBILITY_FORM);
  const [eligibilityFormErrors, setEligibilityFormErrors] = useState<
    Partial<Record<keyof EligibilityFormState, string>>
  >({});
  const [selectedEligibilityId, setSelectedEligibilityId] = useState<string | null>(null);
  const [eligibilitySaving, setEligibilitySaving] = useState(false);
  const [eligibilitySuccessMessage, setEligibilitySuccessMessage] = useState<string | null>(null);

  const [diagnoses, setDiagnoses] = useState<PatientDiagnosis[]>([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [diagnosesError, setDiagnosesError] = useState<string | null>(null);
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisFormState>(EMPTY_DIAGNOSIS_FORM);
  const [diagnosisFormErrors, setDiagnosisFormErrors] = useState<
    Partial<Record<keyof DiagnosisFormState, string>>
  >({});
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
  const [diagnosisSaving, setDiagnosisSaving] = useState(false);
  const [diagnosisSuccessMessage, setDiagnosisSuccessMessage] = useState<string | null>(null);

  const [payerLinks, setPayerLinks] = useState<PatientPayerLink[]>([]);
  const [payerLinksLoading, setPayerLinksLoading] = useState(false);
  const [payerLinksError, setPayerLinksError] = useState<string | null>(null);
  const [payerForm, setPayerForm] = useState<PayerFormState>(EMPTY_PAYER_FORM);
  const [payerFormErrors, setPayerFormErrors] = useState<
    Partial<Record<keyof PayerFormState, string>>
  >({});
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [payerSaving, setPayerSaving] = useState(false);
  const [payerSuccessMessage, setPayerSuccessMessage] = useState<string | null>(null);

  const [authorizations, setAuthorizations] = useState<PatientAuthorization[]>([]);
  const [authorizationsLoading, setAuthorizationsLoading] = useState(false);
  const [authorizationsError, setAuthorizationsError] = useState<string | null>(null);
  const [authorizationForm, setAuthorizationForm] = useState<AuthorizationFormState>(EMPTY_AUTHORIZATION_FORM);
  const [authorizationFormErrors, setAuthorizationFormErrors] = useState<
    Partial<Record<keyof AuthorizationFormState, string>>
  >({});
  const [selectedAuthorizationId, setSelectedAuthorizationId] = useState<string | null>(null);
  const [authorizationSaving, setAuthorizationSaving] = useState(false);
  const [authorizationSuccessMessage, setAuthorizationSuccessMessage] = useState<string | null>(null);

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
    if (state.status !== 'authenticated' || isNewPatient) {
      return;
    }

    let cancelled = false;

    void fetchServiceLines({
      ...authContext,
      status: 'ALL',
      page: 0,
      size: 100,
    })
      .then((response) => {
        if (!cancelled) {
          setServiceLines(response.content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServiceLines([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, isNewPatient, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !patientId || isNewPatient) {
      return;
    }

    const shouldLoadPhaseC =
      section === 'overview' ||
      section === 'eligibility' ||
      section === 'diagnoses' ||
      section === 'payer' ||
      section === 'authorizations';

    if (!shouldLoadPhaseC) {
      return;
    }

    let cancelled = false;
    setEligibilitiesLoading(true);
    setDiagnosesLoading(true);
    setPayerLinksLoading(true);
    setAuthorizationsLoading(true);
    setEligibilitiesError(null);
    setDiagnosesError(null);
    setPayerLinksError(null);
    setAuthorizationsError(null);

    void Promise.allSettled([
      fetchPatientEligibilities(patientId, { ...authContext, status: 'ALL', serviceLineId: 'ALL' }),
      fetchPatientDiagnoses(patientId, { ...authContext, status: 'ALL' }),
      fetchPatientPayerLinks(patientId, { ...authContext, status: 'ALL', primaryPayer: 'ALL' }),
      fetchPatientAuthorizations(patientId, {
        ...authContext,
        status: 'ALL',
        patientPayerLinkId: 'ALL',
        serviceLineId: 'ALL',
      }),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      const [eligibilityResult, diagnosisResult, payerResult, authorizationResult] = results;

      if (eligibilityResult.status === 'fulfilled') {
        setEligibilities(eligibilityResult.value);
      } else {
        setEligibilitiesError(
          eligibilityResult.reason instanceof Error
            ? eligibilityResult.reason.message
            : 'Unable to load eligibilities.',
        );
      }
      setEligibilitiesLoading(false);

      if (diagnosisResult.status === 'fulfilled') {
        setDiagnoses(diagnosisResult.value);
      } else {
        setDiagnosesError(
          diagnosisResult.reason instanceof Error
            ? diagnosisResult.reason.message
            : 'Unable to load diagnoses.',
        );
      }
      setDiagnosesLoading(false);

      if (payerResult.status === 'fulfilled') {
        setPayerLinks(payerResult.value);
      } else {
        setPayerLinksError(
          payerResult.reason instanceof Error
            ? payerResult.reason.message
            : 'Unable to load payer links.',
        );
      }
      setPayerLinksLoading(false);

      if (authorizationResult.status === 'fulfilled') {
        setAuthorizations(authorizationResult.value);
      } else {
        setAuthorizationsError(
          authorizationResult.reason instanceof Error
            ? authorizationResult.reason.message
            : 'Unable to load authorizations.',
        );
      }
      setAuthorizationsLoading(false);
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

  async function handleEligibilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateEligibilityForm(eligibilityForm);
    setEligibilityFormErrors(validationErrors);
    setEligibilitySuccessMessage(null);
    setEligibilitiesError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setEligibilitySaving(true);
    try {
      const response = selectedEligibilityId
        ? await updatePatientEligibility(selectedEligibilityId, {
            ...authContext,
            ...eligibilityForm,
          } satisfies ManagePatientServiceEligibilityRequest)
        : await createPatientEligibility(patientId, {
            ...authContext,
            ...eligibilityForm,
          } satisfies ManagePatientServiceEligibilityRequest);
      setEligibilities((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.id);
        return [response, ...withoutCurrent];
      });
      setSelectedEligibilityId(null);
      setEligibilityForm(EMPTY_ELIGIBILITY_FORM);
      setEligibilitySuccessMessage(
        selectedEligibilityId ? 'Eligibility updated successfully.' : 'Eligibility created successfully.',
      );
    } catch (cause) {
      setEligibilitiesError(cause instanceof Error ? cause.message : 'Unable to save eligibility.');
    } finally {
      setEligibilitySaving(false);
    }
  }

  async function handleEligibilityDeactivate(eligibilityId: string) {
    if (!window.confirm('Deactivate this eligibility record?')) {
      return;
    }

    setEligibilitySaving(true);
    try {
      const response = await deactivatePatientEligibility(eligibilityId, authContext);
      setEligibilities((current) => current.map((item) => (item.id === response.id ? response : item)));
      setEligibilitySuccessMessage('Eligibility marked inactive.');
    } catch (cause) {
      setEligibilitiesError(cause instanceof Error ? cause.message : 'Unable to deactivate eligibility.');
    } finally {
      setEligibilitySaving(false);
    }
  }

  async function handleDiagnosisSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateDiagnosisForm(diagnosisForm);
    setDiagnosisFormErrors(validationErrors);
    setDiagnosisSuccessMessage(null);
    setDiagnosesError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setDiagnosisSaving(true);
    try {
      const response = selectedDiagnosisId
        ? await updatePatientDiagnosis(selectedDiagnosisId, {
            ...authContext,
            ...diagnosisForm,
          } satisfies ManagePatientDiagnosisRequest)
        : await createPatientDiagnosis(patientId, {
            ...authContext,
            ...diagnosisForm,
          } satisfies ManagePatientDiagnosisRequest);
      setDiagnoses((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.id);
        return [response, ...withoutCurrent].sort(
          (left, right) => Number(right.primaryCondition) - Number(left.primaryCondition),
        );
      });
      setSelectedDiagnosisId(null);
      setDiagnosisForm(EMPTY_DIAGNOSIS_FORM);
      setDiagnosisSuccessMessage(
        selectedDiagnosisId ? 'Diagnosis updated successfully.' : 'Diagnosis created successfully.',
      );
    } catch (cause) {
      setDiagnosesError(cause instanceof Error ? cause.message : 'Unable to save diagnosis.');
    } finally {
      setDiagnosisSaving(false);
    }
  }

  async function handleDiagnosisDeactivate(diagnosisId: string) {
    if (!window.confirm('Deactivate this diagnosis record?')) {
      return;
    }

    setDiagnosisSaving(true);
    try {
      const response = await deactivatePatientDiagnosis(diagnosisId, authContext);
      setDiagnoses((current) => current.map((item) => (item.id === response.id ? response : item)));
      setDiagnosisSuccessMessage('Diagnosis marked inactive.');
    } catch (cause) {
      setDiagnosesError(cause instanceof Error ? cause.message : 'Unable to deactivate diagnosis.');
    } finally {
      setDiagnosisSaving(false);
    }
  }

  async function handlePayerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validatePayerForm(payerForm);
    setPayerFormErrors(validationErrors);
    setPayerSuccessMessage(null);
    setPayerLinksError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setPayerSaving(true);
    try {
      const response = selectedPayerId
        ? await updatePatientPayerLink(selectedPayerId, {
            ...authContext,
            ...payerForm,
          } satisfies ManagePatientPayerLinkRequest)
        : await createPatientPayerLink(patientId, {
            ...authContext,
            ...payerForm,
          } satisfies ManagePatientPayerLinkRequest);
      setPayerLinks((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.id);
        return [response, ...withoutCurrent].sort(
          (left, right) => Number(right.primaryPayer) - Number(left.primaryPayer),
        );
      });
      setSelectedPayerId(null);
      setPayerForm(EMPTY_PAYER_FORM);
      setPayerSuccessMessage(
        selectedPayerId ? 'Payer link updated successfully.' : 'Payer link created successfully.',
      );
    } catch (cause) {
      setPayerLinksError(cause instanceof Error ? cause.message : 'Unable to save payer link.');
    } finally {
      setPayerSaving(false);
    }
  }

  async function handlePayerDeactivate(payerLinkId: string) {
    if (!window.confirm('Deactivate this payer link?')) {
      return;
    }

    setPayerSaving(true);
    try {
      const response = await deactivatePatientPayerLink(payerLinkId, authContext);
      setPayerLinks((current) => current.map((item) => (item.id === response.id ? response : item)));
      setPayerSuccessMessage('Payer link marked inactive.');
    } catch (cause) {
      setPayerLinksError(cause instanceof Error ? cause.message : 'Unable to deactivate payer link.');
    } finally {
      setPayerSaving(false);
    }
  }

  async function handleAuthorizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateAuthorizationForm(authorizationForm);
    setAuthorizationFormErrors(validationErrors);
    setAuthorizationSuccessMessage(null);
    setAuthorizationsError(null);

    if (Object.keys(validationErrors).length > 0 || !patientId || isNewPatient) {
      return;
    }

    setAuthorizationSaving(true);
    try {
      const response = selectedAuthorizationId
        ? await updatePatientAuthorization(selectedAuthorizationId, {
            ...authContext,
            ...authorizationForm,
            authorizedUnits: authorizationForm.authorizedUnits
              ? Number(authorizationForm.authorizedUnits)
              : undefined,
            usedUnits: authorizationForm.usedUnits ? Number(authorizationForm.usedUnits) : undefined,
          } satisfies ManagePatientAuthorizationRequest)
        : await createPatientAuthorization(patientId, {
            ...authContext,
            ...authorizationForm,
            authorizedUnits: authorizationForm.authorizedUnits
              ? Number(authorizationForm.authorizedUnits)
              : undefined,
            usedUnits: authorizationForm.usedUnits ? Number(authorizationForm.usedUnits) : undefined,
          } satisfies ManagePatientAuthorizationRequest);
      setAuthorizations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.id);
        return [response, ...withoutCurrent];
      });
      setSelectedAuthorizationId(null);
      setAuthorizationForm(EMPTY_AUTHORIZATION_FORM);
      setAuthorizationSuccessMessage(
        selectedAuthorizationId
          ? 'Authorization updated successfully.'
          : 'Authorization created successfully.',
      );
    } catch (cause) {
      setAuthorizationsError(cause instanceof Error ? cause.message : 'Unable to save authorization.');
    } finally {
      setAuthorizationSaving(false);
    }
  }

  async function handleAuthorizationDeactivate(authorizationId: string) {
    if (!window.confirm('Deactivate this authorization?')) {
      return;
    }

    setAuthorizationSaving(true);
    try {
      const response = await deactivatePatientAuthorization(authorizationId, authContext);
      setAuthorizations((current) =>
        current.map((item) => (item.id === response.id ? response : item)),
      );
      setAuthorizationSuccessMessage('Authorization marked inactive.');
    } catch (cause) {
      setAuthorizationsError(cause instanceof Error ? cause.message : 'Unable to deactivate authorization.');
    } finally {
      setAuthorizationSaving(false);
    }
  }

  function serviceLineLabel(serviceLineId: string | null) {
    if (!serviceLineId) {
      return 'All services';
    }
    return serviceLines.find((item) => item.id === serviceLineId)?.name ?? serviceLineId;
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
              <strong>
                {eligibilities.find((item) => item.status === 'ELIGIBLE')
                  ? `${eligibilities.filter((item) => item.status === 'ELIGIBLE').length} active / eligible`
                  : 'No active eligibility'}
              </strong>
              <p>
                {eligibilities.find((item) => item.status === 'ELIGIBLE')
                  ? serviceLineLabel(
                      eligibilities.find((item) => item.status === 'ELIGIBLE')?.serviceLineId ?? null,
                    )
                  : 'Eligibility tracking is now live in the record workspace.'}
              </p>
            </article>
            <article className="patient-summary-card">
              <span className="eyebrow">Coverage and authorizations</span>
              <strong>
                {payerLinks.find((item) => item.primaryPayer)?.payerName ??
                  `${authorizations.filter((item) => item.status === 'ACTIVE').length} active authorization(s)`}
              </strong>
              <p>
                {authorizations.find((item) => item.status === 'EXHAUSTED')
                  ? `${authorizations.filter((item) => item.status === 'EXHAUSTED').length} exhausted authorization(s)`
                  : 'No exhausted authorizations in the current record.'}
              </p>
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
              <article>
                <strong>{diagnoses.find((item) => item.primaryCondition)?.description ?? 'Missing'}</strong>
                <span>Primary diagnosis</span>
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

  function renderEligibilityContent() {
    return (
      <>
        <PatientPanel
          title="Eligibility history"
          description="Active vs historical service eligibility is visible here, with service-line linkage and date windows backed by the Epic 3 eligibility API."
        >
          {eligibilitiesLoading ? <p>Loading eligibilities...</p> : null}
          {eligibilitiesError ? <p className="alert">{eligibilitiesError}</p> : null}
          {eligibilitySuccessMessage ? <p className="success-note">{eligibilitySuccessMessage}</p> : null}
          {!eligibilitiesLoading && eligibilities.length === 0 ? (
            <PatientModuleState
              title="No eligibility records on file"
              description="Create an eligibility record below to establish which services the patient can receive."
              variant="empty"
            />
          ) : (
            <div className="patient-phasec-list">
              {eligibilities.map((item) => (
                <article key={item.id} className="patient-phasec-card">
                  <div className="patient-contact-card-header">
                    <strong>{serviceLineLabel(item.serviceLineId)}</strong>
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                  </div>
                  <p>
                    {item.effectiveFrom}
                    {item.effectiveTo ? ` to ${item.effectiveTo}` : ' onward'}
                  </p>
                  <p>{item.verificationSource ?? 'No verification source'}</p>
                  <div className="patient-directory-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setSelectedEligibilityId(item.id);
                        setEligibilityForm(mapEligibilityToForm(item));
                        setEligibilityFormErrors({});
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void handleEligibilityDeactivate(item.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PatientPanel>
        <PatientPanel
          title={selectedEligibilityId ? 'Edit eligibility' : 'Add eligibility'}
          description="Date windows, service-line selection, and overlap/conflict handling are standardized here."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handleEligibilitySubmit}>
            <div className="patient-form-grid">
              <label className="field field-light">
                <span>Service line</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setEligibilityForm((current) => ({ ...current, serviceLineId: event.target.value }))
                  }
                  value={eligibilityForm.serviceLineId}
                >
                  <option value="">All services</option>
                  {serviceLines.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setEligibilityForm((current) => ({
                      ...current,
                      status: event.target.value as PatientServiceEligibilityStatus,
                    }))
                  }
                  value={eligibilityForm.status}
                >
                  <option value="ELIGIBLE">Eligible</option>
                  <option value="INELIGIBLE">Ineligible</option>
                  <option value="PENDING">Pending</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </label>
              {(
                [
                  ['effectiveFrom', 'Effective from'],
                  ['effectiveTo', 'Effective to'],
                  ['verificationSource', 'Verification source'],
                ] as Array<[keyof EligibilityFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) =>
                      setEligibilityForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    type={key.includes('effective') ? 'date' : 'text'}
                    value={eligibilityForm[key]}
                  />
                  {eligibilityFormErrors[key] ? <small className="field-error">{eligibilityFormErrors[key]}</small> : null}
                </label>
              ))}
            </div>
            <label className="field field-light">
              <span>Notes</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                value={eligibilityForm.notes}
              />
            </label>
            <div className="button-row">
              <button className="button" disabled={eligibilitySaving} type="submit">
                {eligibilitySaving ? 'Saving...' : selectedEligibilityId ? 'Save eligibility' : 'Add eligibility'}
              </button>
              {selectedEligibilityId ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedEligibilityId(null);
                    setEligibilityForm(EMPTY_ELIGIBILITY_FORM);
                    setEligibilityFormErrors({});
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

  function renderDiagnosesContent() {
    return (
      <>
        <PatientPanel
          title="Diagnosis history"
          description="Primary vs secondary and active vs resolved condition states are visible in one clinical module."
        >
          {diagnosesLoading ? <p>Loading diagnoses...</p> : null}
          {diagnosesError ? <p className="alert">{diagnosesError}</p> : null}
          {diagnosisSuccessMessage ? <p className="success-note">{diagnosisSuccessMessage}</p> : null}
          {!diagnosesLoading && diagnoses.length === 0 ? (
            <PatientModuleState
              title="No diagnoses on file"
              description="Add the first condition below to establish clinical context."
              variant="empty"
            />
          ) : (
            <div className="patient-phasec-list">
              {diagnoses.map((item) => (
                <article key={item.id} className="patient-phasec-card">
                  <div className="patient-contact-card-header">
                    <strong>{item.description}</strong>
                    <div className="patient-contact-tags">
                      {item.primaryCondition ? <span className="status-pill status-active">Primary</span> : null}
                      <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                    </div>
                  </div>
                  <p>{item.diagnosisCode ?? 'No diagnosis code'} • {item.diagnosisType ?? 'No type'}</p>
                  <p>
                    {item.onsetDate ?? 'No onset date'}
                    {item.resolvedDate ? ` • Resolved ${item.resolvedDate}` : ''}
                  </p>
                  <div className="patient-directory-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setSelectedDiagnosisId(item.id);
                        setDiagnosisForm(mapDiagnosisToForm(item));
                        setDiagnosisFormErrors({});
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void handleDiagnosisDeactivate(item.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PatientPanel>
        <PatientPanel
          title={selectedDiagnosisId ? 'Edit diagnosis' : 'Add diagnosis'}
          description="Primary-condition, active/resolved status, and validation states are handled in one reusable diagnosis form."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handleDiagnosisSubmit}>
            <div className="patient-form-grid">
              {(
                [
                  ['diagnosisCode', 'Diagnosis code'],
                  ['description', 'Description'],
                  ['diagnosisType', 'Diagnosis type'],
                  ['onsetDate', 'Onset date'],
                  ['resolvedDate', 'Resolved date'],
                ] as Array<[keyof DiagnosisFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) =>
                      setDiagnosisForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    type={key.includes('Date') ? 'date' : 'text'}
                    value={diagnosisForm[key] as string}
                  />
                  {diagnosisFormErrors[key] ? <small className="field-error">{diagnosisFormErrors[key]}</small> : null}
                </label>
              ))}
              <label className="field field-light">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setDiagnosisForm((current) => ({
                      ...current,
                      status: event.target.value as PatientDiagnosisStatus,
                    }))
                  }
                  value={diagnosisForm.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="HISTORICAL">Historical</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <div className="patient-toggle-grid">
              <label className="patient-checkbox">
                <input
                  checked={diagnosisForm.primaryCondition}
                  onChange={(event) =>
                    setDiagnosisForm((current) => ({ ...current, primaryCondition: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Primary diagnosis</span>
              </label>
            </div>
            <label className="field field-light">
              <span>Notes</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setDiagnosisForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                value={diagnosisForm.notes}
              />
            </label>
            <div className="button-row">
              <button className="button" disabled={diagnosisSaving} type="submit">
                {diagnosisSaving ? 'Saving...' : selectedDiagnosisId ? 'Save diagnosis' : 'Add diagnosis'}
              </button>
              {selectedDiagnosisId ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedDiagnosisId(null);
                    setDiagnosisForm(EMPTY_DIAGNOSIS_FORM);
                    setDiagnosisFormErrors({});
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

  function renderPayerContent() {
    return (
      <>
        <PatientPanel
          title="Payer links"
          description="Primary payer visibility, effective dates, and overlap-sensitive updates all live in one financial context module."
        >
          {payerLinksLoading ? <p>Loading payer links...</p> : null}
          {payerLinksError ? <p className="alert">{payerLinksError}</p> : null}
          {payerSuccessMessage ? <p className="success-note">{payerSuccessMessage}</p> : null}
          {!payerLinksLoading && payerLinks.length === 0 ? (
            <PatientModuleState
              title="No payer links on file"
              description="Add the first payer record below to establish coverage context."
              variant="empty"
            />
          ) : (
            <div className="patient-phasec-list">
              {payerLinks.map((item) => (
                <article key={item.id} className="patient-phasec-card">
                  <div className="patient-contact-card-header">
                    <strong>{item.payerName ?? 'Unnamed payer'}</strong>
                    <div className="patient-contact-tags">
                      {item.primaryPayer ? <span className="status-pill status-active">Primary</span> : null}
                      <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                    </div>
                  </div>
                  <p>{item.memberPolicyNumber ?? 'No member policy'} • {item.groupNumber ?? 'No group number'}</p>
                  <p>
                    {item.effectiveFrom}
                    {item.effectiveTo ? ` to ${item.effectiveTo}` : ' onward'}
                  </p>
                  <div className="patient-directory-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setSelectedPayerId(item.id);
                        setPayerForm(mapPayerToForm(item));
                        setPayerFormErrors({});
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void handlePayerDeactivate(item.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PatientPanel>
        <PatientPanel
          title={selectedPayerId ? 'Edit payer link' : 'Add payer link'}
          description="Primary payer state, effective dates, and payer identifiers are managed in one reusable form."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handlePayerSubmit}>
            <div className="patient-form-grid">
              {(
                [
                  ['payerName', 'Payer name'],
                  ['payerExternalId', 'Payer external ID'],
                  ['memberPolicyNumber', 'Member / policy number'],
                  ['groupNumber', 'Group number'],
                  ['effectiveFrom', 'Effective from'],
                  ['effectiveTo', 'Effective to'],
                ] as Array<[keyof PayerFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) =>
                      setPayerForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    type={key.includes('effective') ? 'date' : 'text'}
                    value={payerForm[key] as string}
                  />
                  {payerFormErrors[key] ? <small className="field-error">{payerFormErrors[key]}</small> : null}
                </label>
              ))}
              <label className="field field-light">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setPayerForm((current) => ({
                      ...current,
                      status: event.target.value as PatientPayerLinkStatus,
                    }))
                  }
                  value={payerForm.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </label>
            </div>
            <div className="patient-toggle-grid">
              <label className="patient-checkbox">
                <input
                  checked={payerForm.primaryPayer}
                  onChange={(event) =>
                    setPayerForm((current) => ({ ...current, primaryPayer: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Primary payer</span>
              </label>
            </div>
            <label className="field field-light">
              <span>Notes</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setPayerForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                value={payerForm.notes}
              />
            </label>
            <div className="button-row">
              <button className="button" disabled={payerSaving} type="submit">
                {payerSaving ? 'Saving...' : selectedPayerId ? 'Save payer link' : 'Add payer link'}
              </button>
              {selectedPayerId ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedPayerId(null);
                    setPayerForm(EMPTY_PAYER_FORM);
                    setPayerFormErrors({});
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

  function renderAuthorizationsContent() {
    return (
      <>
        <PatientPanel
          title="Authorization tracking"
          description="Current, expired, exhausted, and pending authorizations are visible with their service-line and payer context."
        >
          {authorizationsLoading ? <p>Loading authorizations...</p> : null}
          {authorizationsError ? <p className="alert">{authorizationsError}</p> : null}
          {authorizationSuccessMessage ? <p className="success-note">{authorizationSuccessMessage}</p> : null}
          {!authorizationsLoading && authorizations.length === 0 ? (
            <PatientModuleState
              title="No authorizations on file"
              description="Add an authorization below to track service windows and remaining usage."
              variant="empty"
            />
          ) : (
            <div className="patient-phasec-list">
              {authorizations.map((item) => (
                <article key={item.id} className="patient-phasec-card">
                  <div className="patient-contact-card-header">
                    <strong>{item.authorizationNumber ?? 'Authorization without number'}</strong>
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                  </div>
                  <p>{serviceLineLabel(item.serviceLineId)} • {item.patientPayerLinkId ? 'Linked payer' : 'No payer link'}</p>
                  <p>
                    {item.startDate} to {item.endDate}
                  </p>
                  <p>
                    {item.authorizedUnits ?? 0} authorized / {item.usedUnits ?? 0} used
                  </p>
                  <div className="patient-directory-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setSelectedAuthorizationId(item.id);
                        setAuthorizationForm(mapAuthorizationToForm(item));
                        setAuthorizationFormErrors({});
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void handleAuthorizationDeactivate(item.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PatientPanel>
        <PatientPanel
          title={selectedAuthorizationId ? 'Edit authorization' : 'Add authorization'}
          description="Authorization windows, remaining usage, payer linkage, and service-line linkage are editable here."
        >
          <form className="stack-form-light patient-stack-form" onSubmit={handleAuthorizationSubmit}>
            <div className="patient-form-grid">
              <label className="field field-light">
                <span>Payer link</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAuthorizationForm((current) => ({
                      ...current,
                      patientPayerLinkId: event.target.value,
                    }))
                  }
                  value={authorizationForm.patientPayerLinkId}
                >
                  <option value="">No payer link</option>
                  {payerLinks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.payerName ?? item.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Service line</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAuthorizationForm((current) => ({ ...current, serviceLineId: event.target.value }))
                  }
                  value={authorizationForm.serviceLineId}
                >
                  <option value="">No service line</option>
                  {serviceLines.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ['authorizationNumber', 'Authorization number'],
                  ['startDate', 'Start date'],
                  ['endDate', 'End date'],
                  ['authorizedUnits', 'Authorized units'],
                  ['usedUnits', 'Used units'],
                ] as Array<[keyof AuthorizationFormState, string]>
              ).map(([key, label]) => (
                <label key={key} className="field field-light">
                  <span>{label}</span>
                  <input
                    className="input input-light"
                    onChange={(event) =>
                      setAuthorizationForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    type={
                      key === 'startDate' || key === 'endDate'
                        ? 'date'
                        : key === 'authorizedUnits' || key === 'usedUnits'
                          ? 'number'
                          : 'text'
                    }
                    value={authorizationForm[key] as string}
                  />
                  {authorizationFormErrors[key] ? <small className="field-error">{authorizationFormErrors[key]}</small> : null}
                </label>
              ))}
              <label className="field field-light">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAuthorizationForm((current) => ({
                      ...current,
                      status: event.target.value as PatientEpisodeAuthorizationStatus,
                    }))
                  }
                  value={authorizationForm.status}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="EXHAUSTED">Exhausted</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </div>
            <label className="field field-light">
              <span>Notes</span>
              <textarea
                className="input input-light"
                onChange={(event) =>
                  setAuthorizationForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                value={authorizationForm.notes}
              />
            </label>
            <div className="button-row">
              <button className="button" disabled={authorizationSaving} type="submit">
                {authorizationSaving
                  ? 'Saving...'
                  : selectedAuthorizationId
                    ? 'Save authorization'
                    : 'Add authorization'}
              </button>
              {selectedAuthorizationId ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedAuthorizationId(null);
                    setAuthorizationForm(EMPTY_AUTHORIZATION_FORM);
                    setAuthorizationFormErrors({});
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
                    : section === 'eligibility'
                      ? renderEligibilityContent()
                      : section === 'diagnoses'
                        ? renderDiagnosesContent()
                        : section === 'payer'
                          ? renderPayerContent()
                          : section === 'authorizations'
                            ? renderAuthorizationsContent()
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
