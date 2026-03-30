import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  CaregiverAvailability,
  CaregiverAvailabilityType,
  BranchSummary,
  CaregiverCertificationSummary,
  CaregiverCredential,
  CaregiverCredentialStatus,
  CaregiverCredentialVerificationStatus,
  CaregiverGeographyPreference,
  CaregiverGeographyPreferenceType,
  CaregiverLanguage,
  CaregiverPerformanceSummary,
  CaregiverProfile,
  CaregiverShiftPreference,
  CaregiverSkillProfileEntry,
  CaregiverSkillSummary,
  CaregiverUnavailability,
  CaregiverUnavailabilityApprovalStatus,
  CaregiverUnavailabilityReasonType,
  createCaregiverProfile,
  deactivateCaregiverAvailability,
  deactivateCaregiverCredential,
  deactivateCaregiverGeographyPreference,
  deactivateCaregiverLanguage,
  deactivateCaregiverProfile,
  deactivateCaregiverShiftPreference,
  deactivateCaregiverSkillProfile,
  deactivateCaregiverUnavailability,
  fetchCaregiverAvailabilities,
  fetchBranches,
  fetchCaregiver,
  fetchCaregiverCertifications,
  fetchCaregiverCredentials,
  fetchCaregiverGeographyPreferences,
  fetchCaregiverLanguages,
  fetchCaregiverPerformanceSummary,
  fetchCaregiverShiftPreferences,
  fetchCaregiverSkillProfiles,
  fetchCaregiverSkills,
  fetchCaregiverUnavailabilities,
  fetchUserDirectory,
  saveCaregiverAvailability,
  saveCaregiverCredential,
  saveCaregiverGeographyPreference,
  saveCaregiverLanguage,
  saveCaregiverShiftPreference,
  saveCaregiverSkillProfile,
  saveCaregiverUnavailability,
  ShiftPreferenceStrength,
  updateCaregiverProfile,
  UserDirectoryEntry,
} from '../auth/session-api';
import {
  WorkforceFormFramework,
  WorkforceModuleCards,
  WorkforceModuleState,
  WorkforcePanel,
  WorkforceRecordHeader,
  WorkforceSectionNavigation,
  WorkforceWorkspaceGrid,
  WorkforceWorkspaceShell,
} from '../components/WorkforceWorkspaceFoundation';

type CaregiverSectionKey =
  | 'overview'
  | 'profile'
  | 'credentials'
  | 'capabilities'
  | 'geography'
  | 'shifts'
  | 'availability'
  | 'unavailability'
  | 'performance';

type CaregiverRecordWorkspacePageProps = {
  section: CaregiverSectionKey;
  createMode?: boolean;
};

type CaregiverSectionState = 'available' | 'read-only' | 'restricted';

type ProfileFormState = {
  agencyMembershipId: string;
  primaryBranchId: string;
  caregiverCode: string;
  displayName: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type CredentialFormState = {
  certificationId: string;
  credentialType: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuedOn: string;
  expiresOn: string;
  status: CaregiverCredentialStatus;
  verificationStatus: CaregiverCredentialVerificationStatus | '';
  notes: string;
};

type LanguageFormState = {
  languageCode: string;
  proficiencyLevel: string;
  primaryLanguage: boolean;
};

type SkillFormState = {
  skillId: string;
  proficiencyLevel: string;
  verified: boolean;
  notes: string;
};

type GeographyFormState = {
  branchId: string;
  preferenceType: CaregiverGeographyPreferenceType;
  postalCode: string;
  city: string;
  state: string;
  anchorLatitude: string;
  anchorLongitude: string;
  radiusMiles: string;
  priorityRank: string;
  notes: string;
};

type ShiftFormState = {
  dayOfWeek: string;
  preferredStartTime: string;
  preferredEndTime: string;
  preferredShiftLengthMinutes: string;
  preferredVisitTypes: string;
  preferenceStrength: ShiftPreferenceStrength;
  notes: string;
};

type AvailabilityFormState = {
  branchId: string;
  availabilityType: CaregiverAvailabilityType;
  startsAt: string;
  endsAt: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
};

type UnavailabilityFormState = {
  reasonType: CaregiverUnavailabilityReasonType;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  approvalStatus: CaregiverUnavailabilityApprovalStatus;
  notes: string;
};

const PROFILE_INITIAL: ProfileFormState = {
  agencyMembershipId: '',
  primaryBranchId: '',
  caregiverCode: '',
  displayName: '',
  employmentType: '',
  startDate: '',
  endDate: '',
  notes: '',
};

const CREDENTIAL_INITIAL: CredentialFormState = {
  certificationId: '',
  credentialType: '',
  licenseNumber: '',
  issuingAuthority: '',
  issuedOn: '',
  expiresOn: '',
  status: 'ACTIVE',
  verificationStatus: 'UNVERIFIED',
  notes: '',
};

const LANGUAGE_INITIAL: LanguageFormState = {
  languageCode: '',
  proficiencyLevel: '',
  primaryLanguage: false,
};

const SKILL_INITIAL: SkillFormState = {
  skillId: '',
  proficiencyLevel: '',
  verified: false,
  notes: '',
};

const GEOGRAPHY_INITIAL: GeographyFormState = {
  branchId: '',
  preferenceType: 'BRANCH',
  postalCode: '',
  city: '',
  state: '',
  anchorLatitude: '',
  anchorLongitude: '',
  radiusMiles: '',
  priorityRank: '',
  notes: '',
};

const SHIFT_INITIAL: ShiftFormState = {
  dayOfWeek: '',
  preferredStartTime: '',
  preferredEndTime: '',
  preferredShiftLengthMinutes: '',
  preferredVisitTypes: '',
  preferenceStrength: 'PREFERRED',
  notes: '',
};

const AVAILABILITY_INITIAL: AvailabilityFormState = {
  branchId: '',
  availabilityType: 'RECURRING',
  startsAt: '',
  endsAt: '',
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  effectiveFrom: '',
  effectiveTo: '',
  notes: '',
};

const UNAVAILABILITY_INITIAL: UnavailabilityFormState = {
  reasonType: 'PTO',
  startsAt: '',
  endsAt: '',
  allDay: false,
  approvalStatus: 'PENDING',
  notes: '',
};

const DAY_OPTIONS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const SECTION_CONFIG: Record<
  CaregiverSectionKey,
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
    description: 'Shared caregiver workspace summary and section-level routing.',
    formTitle: 'Overview scaffold',
    formHelper: 'The overview route reuses the same caregiver summary shell used by every Epic 4 module.',
    fields: ['Record header', 'Secondary navigation', 'Module cards'],
  },
  profile: {
    label: 'Profile',
    description: 'Identity, branch, employment, and role context live in one reusable workforce profile surface.',
    permission: 'manage_caregiver_profiles',
    formTitle: 'Caregiver profile form shell',
    formHelper: 'Profile create and edit screens share inline validation, conflict messaging, and controlled status-change UX.',
    fields: ['Display name', 'Caregiver code', 'Primary branch', 'Employment type', 'Start date'],
  },
  credentials: {
    label: 'Credentials',
    description: 'Licensure and certification data stay grouped in one credential-management workflow.',
    permission: 'manage_caregiver_credentials',
    formTitle: 'Credential form shell',
    formHelper: 'Expiration windows, verification state, and conflict errors share one credential pattern.',
    fields: ['Credential type', 'License number', 'Issued on', 'Expires on', 'Verification status'],
  },
  capabilities: {
    label: 'Skills & languages',
    description: 'Languages and skill linkage share one capability-oriented section before assignment workflows arrive in Epic 5.',
    permission: 'manage_caregiver_profiles',
    formTitle: 'Capability form shell',
    formHelper: 'Primary-language flags, proficiency indicators, and verified skill states follow one reusable preference pattern.',
    fields: ['Language code', 'Primary language', 'Skill name', 'Proficiency', 'Verified'],
  },
  geography: {
    label: 'Geography',
    description: 'Preferred branch, postal area, and radius expectations live in one travel-preference workspace.',
    permission: 'manage_caregiver_profiles',
    formTitle: 'Geography preference shell',
    formHelper: 'Area, radius, and priority fields share the same date-less structured preference layout.',
    fields: ['Preference type', 'Branch', 'Postal code', 'Radius miles', 'Priority'],
  },
  shifts: {
    label: 'Shift preferences',
    description: 'Day-based work-pattern preferences remain separate from actual availability windows.',
    permission: 'manage_caregiver_profiles',
    formTitle: 'Shift preference shell',
    formHelper: 'Time-window and preference-strength fields use a shared recurring-pattern form layout.',
    fields: ['Day of week', 'Preferred start', 'Preferred end', 'Shift length', 'Preference strength'],
  },
  availability: {
    label: 'Availability',
    description: 'Recurring and date-specific schedulability windows share one backend-backed availability module.',
    permission: 'manage_caregiver_availability',
    formTitle: 'Availability form shell',
    formHelper: 'Date ranges, recurring windows, and overlap conflicts use one consistent availability foundation.',
    fields: ['Availability type', 'Start time', 'End time', 'Effective from', 'Effective to'],
  },
  unavailability: {
    label: 'PTO & unavailability',
    description: 'Blocked time and PTO windows stay grouped in one controlled unavailability workflow.',
    permission: 'manage_caregiver_unavailability',
    formTitle: 'Unavailability form shell',
    formHelper: 'All-day flags, approval state, and overlap handling share one unavailability pattern.',
    fields: ['Reason type', 'Starts at', 'Ends at', 'All day', 'Approval status'],
  },
  performance: {
    label: 'Performance',
    description: 'Concise profile-level workforce indicators stay readable without exposing unsupported analytics internals.',
    viewPermission: 'view_caregiver_performance',
    formTitle: 'Performance summary shell',
    formHelper: 'Read-only summary cards and unavailable-metric messaging share one workforce performance presentation pattern.',
    fields: ['Window start', 'Window end', 'Schedulable', 'Active credentials', 'Unsupported metrics'],
  },
};

function formatDateForInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function formatDateTimeLocalInput(value: string | null): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 16);
}

function formatTimeInput(value: string | null): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 5);
}

function buildDefaultPerformanceWindow(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}

function workforceAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

function buildFieldValues(
  caregiver: CaregiverProfile | null,
  section: CaregiverSectionKey,
): string[] {
  const fallback = 'Pending module data';
  const valuesBySection: Record<CaregiverSectionKey, string[]> = {
    overview: [
      caregiver?.displayName ?? 'New caregiver',
      caregiver?.status ?? 'Draft shell',
      caregiver?.primaryBranchName ?? fallback,
    ],
    profile: [
      caregiver?.displayName ?? '',
      caregiver?.caregiverCode ?? '',
      caregiver?.primaryBranchName ?? '',
      caregiver?.employmentType ?? '',
      caregiver?.startDate ?? '',
    ],
    credentials: ['RN', 'LIC-2044', '2025-01-01', '2027-01-01', 'VERIFIED'],
    capabilities: ['en-US', 'true', 'IV Therapy', 'ADVANCED', 'true'],
    geography: ['PRIMARY_BRANCH', caregiver?.primaryBranchName ?? '', '60601', '20', '1'],
    shifts: ['MONDAY', '08:00', '16:00', '480', 'PREFERRED'],
    availability: ['RECURRING', '08:00', '16:00', '2026-04-01', '2026-12-31'],
    unavailability: ['PTO', '2026-04-10T08:00:00Z', '2026-04-12T18:00:00Z', 'false', 'APPROVED'],
    performance: ['Past 30 days', 'Today', 'true', '3', 'No unsupported metrics'],
  };

  return valuesBySection[section];
}

export function CaregiverRecordWorkspacePage({
  section,
  createMode = false,
}: CaregiverRecordWorkspacePageProps) {
  const { caregiverId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAccess();
  const { state } = useAuth();

  const [caregiver, setCaregiver] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(!createMode);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<UserDirectoryEntry[]>([]);
  const [certificationOptions, setCertificationOptions] = useState<CaregiverCertificationSummary[]>([]);
  const [skillOptions, setSkillOptions] = useState<CaregiverSkillSummary[]>([]);

  const [profileForm, setProfileForm] = useState<ProfileFormState>(PROFILE_INITIAL);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [credentials, setCredentials] = useState<CaregiverCredential[]>([]);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialSuccess, setCredentialSuccess] = useState<string | null>(null);
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [credentialForm, setCredentialForm] = useState<CredentialFormState>(CREDENTIAL_INITIAL);

  const [languages, setLanguages] = useState<CaregiverLanguage[]>([]);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(null);
  const [languageForm, setLanguageForm] = useState<LanguageFormState>(LANGUAGE_INITIAL);
  const [skills, setSkills] = useState<CaregiverSkillProfileEntry[]>([]);
  const [skillSaving, setSkillSaving] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState<SkillFormState>(SKILL_INITIAL);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilitySuccess, setCapabilitySuccess] = useState<string | null>(null);

  const [geographyPreferences, setGeographyPreferences] = useState<CaregiverGeographyPreference[]>([]);
  const [geographyLoading, setGeographyLoading] = useState(false);
  const [geographyError, setGeographyError] = useState<string | null>(null);
  const [geographySuccess, setGeographySuccess] = useState<string | null>(null);
  const [geographySaving, setGeographySaving] = useState(false);
  const [editingGeographyId, setEditingGeographyId] = useState<string | null>(null);
  const [geographyForm, setGeographyForm] = useState<GeographyFormState>(GEOGRAPHY_INITIAL);

  const [shiftPreferences, setShiftPreferences] = useState<CaregiverShiftPreference[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(SHIFT_INITIAL);

  const [availabilities, setAvailabilities] = useState<CaregiverAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySuccess, setAvailabilitySuccess] = useState<string | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityFormState>(AVAILABILITY_INITIAL);

  const [unavailabilities, setUnavailabilities] = useState<CaregiverUnavailability[]>([]);
  const [unavailabilityLoading, setUnavailabilityLoading] = useState(false);
  const [unavailabilityError, setUnavailabilityError] = useState<string | null>(null);
  const [unavailabilitySuccess, setUnavailabilitySuccess] = useState<string | null>(null);
  const [unavailabilitySaving, setUnavailabilitySaving] = useState(false);
  const [editingUnavailabilityId, setEditingUnavailabilityId] = useState<string | null>(null);
  const [unavailabilityForm, setUnavailabilityForm] =
    useState<UnavailabilityFormState>(UNAVAILABILITY_INITIAL);

  const [performanceSummary, setPerformanceSummary] = useState<CaregiverPerformanceSummary | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [performanceWindowDays, setPerformanceWindowDays] = useState(30);

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
    if (createMode || !caregiverId || state.status !== 'authenticated') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchCaregiver(caregiverId, authContext)
      .then((response) => {
        if (!cancelled) {
          setCaregiver(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load the caregiver record right now.',
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
  }, [authContext, caregiverId, createMode, state.status]);

  useEffect(() => {
    if (createMode) {
      setProfileForm(PROFILE_INITIAL);
      return;
    }

    if (!caregiver) {
      return;
    }

    setProfileForm({
      agencyMembershipId: caregiver.agencyMembershipId,
      primaryBranchId: caregiver.primaryBranchId ?? '',
      caregiverCode: caregiver.caregiverCode ?? '',
      displayName: caregiver.displayName ?? '',
      employmentType: caregiver.employmentType ?? '',
      startDate: formatDateForInput(caregiver.startDate),
      endDate: formatDateForInput(caregiver.endDate),
      notes: caregiver.notes ?? '',
    });
  }, [caregiver, createMode]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    if (
      !createMode &&
      !['profile', 'geography', 'availability'].includes(section)
    ) {
      return;
    }

    let cancelled = false;

    void Promise.all([
      fetchBranches(authContext),
      fetchUserDirectory({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ])
      .then(([branchResponse, membershipResponse]) => {
        if (!cancelled) {
          setBranches(branchResponse.filter((branch) => branch.status === 'ACTIVE'));
          setMembershipOptions(membershipResponse.content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
          setMembershipOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, createMode, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'credentials' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setCredentialLoading(true);
    setCredentialError(null);

    void Promise.all([
      fetchCaregiverCredentials(caregiverId, authContext),
      fetchCaregiverCertifications({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ])
      .then(([credentialResponse, certificationResponse]) => {
        if (!cancelled) {
          setCredentials(credentialResponse);
          setCertificationOptions(certificationResponse.content);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCredentialError(
            cause instanceof ApiError ? cause.message : 'Unable to load caregiver credentials.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCredentialLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'capabilities' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setCapabilityLoading(true);
    setCapabilityError(null);

    void Promise.all([
      fetchCaregiverLanguages(caregiverId, authContext),
      fetchCaregiverSkillProfiles(caregiverId, authContext),
      fetchCaregiverSkills({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ])
      .then(([languageResponse, skillProfileResponse, skillCatalogResponse]) => {
        if (!cancelled) {
          setLanguages(languageResponse);
          setSkills(skillProfileResponse);
          setSkillOptions(skillCatalogResponse.content);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCapabilityError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver capabilities right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCapabilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'performance' || !caregiverId) {
      return;
    }

    const { windowStart, windowEnd } = buildDefaultPerformanceWindow(performanceWindowDays);
    let cancelled = false;
    setPerformanceLoading(true);
    setPerformanceError(null);

    void fetchCaregiverPerformanceSummary({
      ...authContext,
      caregiverId,
      windowStart,
      windowEnd,
    })
      .then((response) => {
        if (!cancelled) {
          setPerformanceSummary(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPerformanceError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver performance right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPerformanceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, performanceWindowDays, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'geography' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setGeographyLoading(true);
    setGeographyError(null);

    void fetchCaregiverGeographyPreferences(caregiverId, authContext)
      .then((response) => {
        if (!cancelled) {
          setGeographyPreferences(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setGeographyError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver geography preferences right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGeographyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'shifts' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setShiftLoading(true);
    setShiftError(null);

    void fetchCaregiverShiftPreferences(caregiverId, authContext)
      .then((response) => {
        if (!cancelled) {
          setShiftPreferences(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setShiftError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver shift preferences right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setShiftLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'availability' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError(null);

    void fetchCaregiverAvailabilities(caregiverId, authContext)
      .then((response) => {
        if (!cancelled) {
          setAvailabilities(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setAvailabilityError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver availability windows right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || section !== 'unavailability' || !caregiverId) {
      return;
    }

    let cancelled = false;
    setUnavailabilityLoading(true);
    setUnavailabilityError(null);

    void fetchCaregiverUnavailabilities(caregiverId, authContext)
      .then((response) => {
        if (!cancelled) {
          setUnavailabilities(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setUnavailabilityError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load caregiver unavailability windows right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setUnavailabilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, caregiverId, section, state.status]);

  const sectionConfig = SECTION_CONFIG[section];
  const isViewOnlySection = sectionConfig.viewPermission && !sectionConfig.permission;

  const sectionLinks: Array<{
    path: string;
    label: string;
    state: CaregiverSectionState;
  }> = (Object.entries(SECTION_CONFIG) as Array<
    [CaregiverSectionKey, (typeof SECTION_CONFIG)[CaregiverSectionKey]]
  >).map(([key, config]) => {
    if (createMode) {
      return {
        path: '/app/workforce/new/profile',
        label: config.label,
        state: key === 'profile' ? 'available' : 'restricted',
      };
    }

    const requiredPermission = config.permission ?? config.viewPermission;
    const allowed = requiredPermission ? canAccessPermission(profile, requiredPermission) : true;
    const stateForLink: CaregiverSectionState =
      !allowed ? 'restricted' : config.viewPermission && !config.permission ? 'read-only' : 'available';

    return {
      path: key === 'overview' ? `/app/workforce/${caregiverId}` : `/app/workforce/${caregiverId}/${key}`,
      label: config.label,
      state: stateForLink,
    };
  });

  const moduleCards = (Object.entries(SECTION_CONFIG) as Array<
    [CaregiverSectionKey, (typeof SECTION_CONFIG)[CaregiverSectionKey]]
  >)
    .filter(([key]) => key !== 'overview')
    .map(([key, config]) => ({
      path: createMode ? '/app/workforce/new/profile' : `/app/workforce/${caregiverId}/${key}`,
      label: config.label,
      description: config.description,
      state: sectionLinks.find((link) => link.label === config.label)?.state ?? 'restricted',
    }));

  const headerRecord = caregiver
    ? {
        id: caregiver.id,
        status: caregiver.status,
        displayName: caregiver.displayName,
        caregiverCode: caregiver.caregiverCode,
        membershipRole: caregiver.membershipRole,
        primaryBranchName: caregiver.primaryBranchName,
        employmentType: caregiver.employmentType,
        startDate: caregiver.startDate,
        userEmail: caregiver.userEmail,
        userPhone: caregiver.userPhone,
      }
    : {
        id: 'new-caregiver',
        status: 'DRAFT_SHELL',
        displayName: 'New caregiver profile',
        caregiverCode: null,
        membershipRole: null,
        primaryBranchName: null,
        employmentType: null,
        startDate: null,
        userEmail: null,
        userPhone: null,
      };

  async function refreshCredentialData() {
    if (!caregiverId) {
      return;
    }
    const [credentialResponse, certificationResponse] = await Promise.all([
      fetchCaregiverCredentials(caregiverId, authContext),
      fetchCaregiverCertifications({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ]);
    setCredentials(credentialResponse);
    setCertificationOptions(certificationResponse.content);
  }

  async function refreshCapabilityData() {
    if (!caregiverId) {
      return;
    }
    const [languageResponse, skillProfileResponse, skillCatalogResponse] = await Promise.all([
      fetchCaregiverLanguages(caregiverId, authContext),
      fetchCaregiverSkillProfiles(caregiverId, authContext),
      fetchCaregiverSkills({
        ...authContext,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      }),
    ]);
    setLanguages(languageResponse);
    setSkills(skillProfileResponse);
    setSkillOptions(skillCatalogResponse.content);
  }

  async function refreshGeographyData() {
    if (!caregiverId) {
      return;
    }
    const response = await fetchCaregiverGeographyPreferences(caregiverId, authContext);
    setGeographyPreferences(response);
  }

  async function refreshShiftData() {
    if (!caregiverId) {
      return;
    }
    const response = await fetchCaregiverShiftPreferences(caregiverId, authContext);
    setShiftPreferences(response);
  }

  async function refreshAvailabilityData() {
    if (!caregiverId) {
      return;
    }
    const response = await fetchCaregiverAvailabilities(caregiverId, authContext);
    setAvailabilities(response);
  }

  async function refreshUnavailabilityData() {
    if (!caregiverId) {
      return;
    }
    const response = await fetchCaregiverUnavailabilities(caregiverId, authContext);
    setUnavailabilities(response);
  }

  function selectedMembershipLabel(entry: UserDirectoryEntry) {
    return `${entry.firstName} ${entry.lastName} · ${entry.role} · ${entry.email}`;
  }

  function selectedBranchName(branchId: string | null) {
    if (!branchId) {
      return 'Agency-wide';
    }
    return branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
  }

  function renderAuditCallout(actionType: string, title: string, description: string) {
    return (
      <div className="workforce-audit-callout">
        <strong>{title}</strong>
        <p>{description}</p>
        <Link className="workforce-audit-link" to={workforceAuditHref(actionType)}>
          Open matching audit activity
        </Link>
      </div>
    );
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!profileForm.agencyMembershipId) {
      setProfileError('Select the agency membership that should own this caregiver record.');
      return;
    }

    if (profileForm.startDate && profileForm.endDate && profileForm.endDate < profileForm.startDate) {
      setProfileError('End date cannot be earlier than the start date.');
      return;
    }

    setProfileSaving(true);
    try {
      const saved = createMode
        ? await createCaregiverProfile({
            ...authContext,
            ...profileForm,
          })
        : await updateCaregiverProfile({
            ...authContext,
            caregiverId,
            ...profileForm,
          });

      setCaregiver(saved);
      setProfileSuccess(createMode ? 'Caregiver profile created.' : 'Caregiver profile updated.');

      if (createMode) {
        navigate(`/app/workforce/${saved.id}/profile`, { replace: true });
      }
    } catch (cause) {
      setProfileError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver profile right now.',
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleDeactivateProfile() {
    if (!caregiver || !window.confirm('Deactivate this caregiver profile? This is logged and can affect schedulability.')) {
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    try {
      const saved = await deactivateCaregiverProfile(caregiver.id, authContext);
      setCaregiver(saved);
      setProfileSuccess('Caregiver profile deactivated.');
    } catch (cause) {
      setProfileError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to deactivate caregiver profile right now.',
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setCredentialError(null);
    setCredentialSuccess(null);

    if (!credentialForm.credentialType.trim()) {
      setCredentialError('Credential type is required.');
      return;
    }

    if (
      credentialForm.issuedOn &&
      credentialForm.expiresOn &&
      credentialForm.expiresOn < credentialForm.issuedOn
    ) {
      setCredentialError('Expiration date cannot be earlier than the issued date.');
      return;
    }

    setCredentialSaving(true);
    try {
      await saveCaregiverCredential({
        ...authContext,
        caregiverId,
        credentialId: editingCredentialId ?? undefined,
        ...credentialForm,
      });
      await refreshCredentialData();
      setCredentialForm(CREDENTIAL_INITIAL);
      setEditingCredentialId(null);
      setCredentialSuccess(editingCredentialId ? 'Credential updated.' : 'Credential added.');
    } catch (cause) {
      setCredentialError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver credential.',
      );
    } finally {
      setCredentialSaving(false);
    }
  }

  async function handleDeactivateCredential(credentialId: string) {
    if (!caregiverId || !window.confirm('Deactivate this credential?')) {
      return;
    }

    setCredentialError(null);
    setCredentialSuccess(null);
    try {
      await deactivateCaregiverCredential(caregiverId, credentialId, authContext);
      await refreshCredentialData();
      setCredentialSuccess('Credential deactivated.');
    } catch (cause) {
      setCredentialError(
        cause instanceof ApiError ? cause.message : 'Unable to deactivate caregiver credential.',
      );
    }
  }

  async function handleLanguageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setCapabilityError(null);
    setCapabilitySuccess(null);

    if (!languageForm.languageCode.trim()) {
      setCapabilityError('Language code is required.');
      return;
    }

    setLanguageSaving(true);
    try {
      await saveCaregiverLanguage({
        ...authContext,
        caregiverId,
        languageId: editingLanguageId ?? undefined,
        ...languageForm,
      });
      await refreshCapabilityData();
      setLanguageForm(LANGUAGE_INITIAL);
      setEditingLanguageId(null);
      setCapabilitySuccess(editingLanguageId ? 'Language updated.' : 'Language added.');
    } catch (cause) {
      setCapabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver language.',
      );
    } finally {
      setLanguageSaving(false);
    }
  }

  async function handleDeactivateLanguage(languageId: string) {
    if (!caregiverId || !window.confirm('Deactivate this language entry?')) {
      return;
    }

    setCapabilityError(null);
    setCapabilitySuccess(null);
    try {
      await deactivateCaregiverLanguage(caregiverId, languageId, authContext);
      await refreshCapabilityData();
      setCapabilitySuccess('Language deactivated.');
    } catch (cause) {
      setCapabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to deactivate caregiver language.',
      );
    }
  }

  async function handleSkillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setCapabilityError(null);
    setCapabilitySuccess(null);

    if (!skillForm.skillId) {
      setCapabilityError('Select a configured skill.');
      return;
    }

    setSkillSaving(true);
    try {
      await saveCaregiverSkillProfile({
        ...authContext,
        caregiverId,
        skillProfileId: editingSkillId ?? undefined,
        ...skillForm,
      });
      await refreshCapabilityData();
      setSkillForm(SKILL_INITIAL);
      setEditingSkillId(null);
      setCapabilitySuccess(editingSkillId ? 'Skill updated.' : 'Skill added.');
    } catch (cause) {
      setCapabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver skill.',
      );
    } finally {
      setSkillSaving(false);
    }
  }

  async function handleDeactivateSkill(skillProfileId: string) {
    if (!caregiverId || !window.confirm('Deactivate this skill entry?')) {
      return;
    }

    setCapabilityError(null);
    setCapabilitySuccess(null);
    try {
      await deactivateCaregiverSkillProfile(caregiverId, skillProfileId, authContext);
      await refreshCapabilityData();
      setCapabilitySuccess('Skill deactivated.');
    } catch (cause) {
      setCapabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to deactivate caregiver skill.',
      );
    }
  }

  async function handleGeographySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setGeographyError(null);
    setGeographySuccess(null);

    if (geographyForm.preferenceType === 'BRANCH' && !geographyForm.branchId) {
      setGeographyError('Select a branch when the preference type is branch-based.');
      return;
    }

    if (geographyForm.preferenceType === 'POSTAL_CODE' && !geographyForm.postalCode.trim()) {
      setGeographyError('Postal code is required for postal-code preferences.');
      return;
    }

    if (
      geographyForm.preferenceType === 'CITY_STATE' &&
      (!geographyForm.city.trim() || !geographyForm.state.trim())
    ) {
      setGeographyError('City and state are required for city/state preferences.');
      return;
    }

    if (geographyForm.preferenceType === 'RADIUS' && !geographyForm.radiusMiles.trim()) {
      setGeographyError('Radius miles is required for radius preferences.');
      return;
    }

    setGeographySaving(true);
    try {
      await saveCaregiverGeographyPreference({
        ...authContext,
        caregiverId,
        preferenceId: editingGeographyId ?? undefined,
        ...geographyForm,
      });
      await refreshGeographyData();
      setGeographyForm(GEOGRAPHY_INITIAL);
      setEditingGeographyId(null);
      setGeographySuccess(
        editingGeographyId ? 'Geography preference updated.' : 'Geography preference added.',
      );
    } catch (cause) {
      setGeographyError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to save caregiver geography preference.',
      );
    } finally {
      setGeographySaving(false);
    }
  }

  async function handleDeactivateGeography(preferenceId: string) {
    if (!caregiverId || !window.confirm('Deactivate this geography preference?')) {
      return;
    }

    setGeographyError(null);
    setGeographySuccess(null);
    try {
      await deactivateCaregiverGeographyPreference(caregiverId, preferenceId, authContext);
      await refreshGeographyData();
      setGeographySuccess('Geography preference deactivated.');
    } catch (cause) {
      setGeographyError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to deactivate caregiver geography preference.',
      );
    }
  }

  async function handleShiftSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setShiftError(null);
    setShiftSuccess(null);

    if (!shiftForm.dayOfWeek) {
      setShiftError('Day of week is required.');
      return;
    }

    if (
      shiftForm.preferredStartTime &&
      shiftForm.preferredEndTime &&
      shiftForm.preferredEndTime <= shiftForm.preferredStartTime
    ) {
      setShiftError('Preferred end time must be later than the preferred start time.');
      return;
    }

    setShiftSaving(true);
    try {
      await saveCaregiverShiftPreference({
        ...authContext,
        caregiverId,
        shiftPreferenceId: editingShiftId ?? undefined,
        ...shiftForm,
      });
      await refreshShiftData();
      setShiftForm(SHIFT_INITIAL);
      setEditingShiftId(null);
      setShiftSuccess(editingShiftId ? 'Shift preference updated.' : 'Shift preference added.');
    } catch (cause) {
      setShiftError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver shift preference.',
      );
    } finally {
      setShiftSaving(false);
    }
  }

  async function handleDeactivateShift(shiftPreferenceId: string) {
    if (!caregiverId || !window.confirm('Deactivate this shift preference?')) {
      return;
    }

    setShiftError(null);
    setShiftSuccess(null);
    try {
      await deactivateCaregiverShiftPreference(caregiverId, shiftPreferenceId, authContext);
      await refreshShiftData();
      setShiftSuccess('Shift preference deactivated.');
    } catch (cause) {
      setShiftError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to deactivate caregiver shift preference.',
      );
    }
  }

  async function handleAvailabilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setAvailabilityError(null);
    setAvailabilitySuccess(null);

    if (availabilityForm.availabilityType === 'RECURRING') {
      if (!availabilityForm.dayOfWeek || !availabilityForm.startTime || !availabilityForm.endTime) {
        setAvailabilityError('Recurring availability requires day-of-week, start time, and end time.');
        return;
      }
      if (availabilityForm.endTime <= availabilityForm.startTime) {
        setAvailabilityError('Recurring availability end time must be later than the start time.');
        return;
      }
    }

    if (availabilityForm.availabilityType === 'DATE_SPECIFIC') {
      if (!availabilityForm.startsAt || !availabilityForm.endsAt) {
        setAvailabilityError('Date-specific availability requires both start and end date-times.');
        return;
      }
      if (availabilityForm.endsAt <= availabilityForm.startsAt) {
        setAvailabilityError('Date-specific availability end must be later than the start.');
        return;
      }
    }

    if (
      availabilityForm.effectiveFrom &&
      availabilityForm.effectiveTo &&
      availabilityForm.effectiveTo < availabilityForm.effectiveFrom
    ) {
      setAvailabilityError('Effective-to cannot be earlier than effective-from.');
      return;
    }

    setAvailabilitySaving(true);
    try {
      await saveCaregiverAvailability({
        ...authContext,
        caregiverId,
        availabilityId: editingAvailabilityId ?? undefined,
        ...availabilityForm,
      });
      await refreshAvailabilityData();
      setAvailabilityForm(AVAILABILITY_INITIAL);
      setEditingAvailabilityId(null);
      setAvailabilitySuccess(
        editingAvailabilityId ? 'Availability updated.' : 'Availability added.',
      );
    } catch (cause) {
      setAvailabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver availability.',
      );
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function handleDeactivateAvailability(availabilityId: string) {
    if (!caregiverId || !window.confirm('Deactivate this availability window?')) {
      return;
    }

    setAvailabilityError(null);
    setAvailabilitySuccess(null);
    try {
      await deactivateCaregiverAvailability(caregiverId, availabilityId, authContext);
      await refreshAvailabilityData();
      setAvailabilitySuccess('Availability deactivated.');
    } catch (cause) {
      setAvailabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to deactivate caregiver availability.',
      );
    }
  }

  async function handleUnavailabilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caregiverId) {
      return;
    }

    setUnavailabilityError(null);
    setUnavailabilitySuccess(null);

    if (!unavailabilityForm.startsAt || !unavailabilityForm.endsAt) {
      setUnavailabilityError('Both start and end date-times are required.');
      return;
    }

    if (unavailabilityForm.endsAt <= unavailabilityForm.startsAt) {
      setUnavailabilityError('End date-time must be later than the start date-time.');
      return;
    }

    setUnavailabilitySaving(true);
    try {
      await saveCaregiverUnavailability({
        ...authContext,
        caregiverId,
        unavailabilityId: editingUnavailabilityId ?? undefined,
        ...unavailabilityForm,
      });
      await refreshUnavailabilityData();
      setUnavailabilityForm(UNAVAILABILITY_INITIAL);
      setEditingUnavailabilityId(null);
      setUnavailabilitySuccess(
        editingUnavailabilityId ? 'Unavailability updated.' : 'Unavailability added.',
      );
    } catch (cause) {
      setUnavailabilityError(
        cause instanceof ApiError ? cause.message : 'Unable to save caregiver unavailability.',
      );
    } finally {
      setUnavailabilitySaving(false);
    }
  }

  async function handleDeactivateUnavailability(unavailabilityId: string) {
    if (!caregiverId || !window.confirm('Deactivate this unavailability window?')) {
      return;
    }

    setUnavailabilityError(null);
    setUnavailabilitySuccess(null);
    try {
      await deactivateCaregiverUnavailability(caregiverId, unavailabilityId, authContext);
      await refreshUnavailabilityData();
      setUnavailabilitySuccess('Unavailability deactivated.');
    } catch (cause) {
      setUnavailabilityError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to deactivate caregiver unavailability.',
      );
    }
  }

  function renderProfileSection() {
    return (
      <>
        <WorkforceModuleState
          title="Profile management"
          description="Create and edit caregiver workforce profiles with real branch and agency-membership linkage."
        />
        <WorkforcePanel
          title={createMode ? 'Create caregiver profile' : 'Edit caregiver profile'}
          description="The profile form is backed by the Epic 4 profile APIs and the existing branch/user directory data sources."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'Audit-sensitive profile changes',
            'Caregiver profile updates and status changes are logged. Use the filtered audit view when you need to confirm who changed workforce identity or employment details.',
          )}
          <form className="stack-form-light" onSubmit={handleProfileSubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Agency membership</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      agencyMembershipId: event.target.value,
                    }))
                  }
                  value={profileForm.agencyMembershipId}
                >
                  <option value="">Select membership</option>
                  {membershipOptions.map((entry) => (
                    <option key={entry.membershipId} value={entry.membershipId}>
                      {selectedMembershipLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Primary branch</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      primaryBranchId: event.target.value,
                    }))
                  }
                  value={profileForm.primaryBranchId}
                >
                  <option value="">No primary branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Caregiver code</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, caregiverCode: event.target.value }))
                  }
                  value={profileForm.caregiverCode}
                />
              </label>
              <label className="field field-light">
                <span>Display name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                  }
                  value={profileForm.displayName}
                />
              </label>
              <label className="field field-light">
                <span>Employment type</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      employmentType: event.target.value,
                    }))
                  }
                  value={profileForm.employmentType}
                />
              </label>
              <label className="field field-light">
                <span>Start date</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  type="date"
                  value={profileForm.startDate}
                />
              </label>
              <label className="field field-light">
                <span>End date</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                  type="date"
                  value={profileForm.endDate}
                />
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={4}
                  value={profileForm.notes}
                />
              </label>
            </div>
            {profileError ? <p className="alert">{profileError}</p> : null}
            {profileSuccess ? <p className="success-message">{profileSuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={profileSaving} type="submit">
                {profileSaving ? 'Saving...' : createMode ? 'Create caregiver profile' : 'Save profile'}
              </button>
              {!createMode && caregiver ? (
                <button
                  className="button button-ghost"
                  disabled={profileSaving}
                  onClick={() => void handleDeactivateProfile()}
                  type="button"
                >
                  Deactivate profile
                </button>
              ) : null}
            </div>
          </form>
        </WorkforcePanel>
      </>
    );
  }

  function renderCredentialsSection() {
    return (
      <>
        <WorkforceModuleState
          title="Credential management"
          description="Expiration, verification, and agency certification linkage are all backed by the live credential APIs."
        />
        <WorkforcePanel
          title="Credential form"
          description="Invalid date windows and backend conflicts surface here as controlled inline errors."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'Credential changes are logged',
            'Credential saves and deactivations are treated as controlled workforce mutations. Review the audit log when you need to confirm credential maintenance activity.',
          )}
          <form className="stack-form-light" onSubmit={handleCredentialSubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Certification</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      certificationId: event.target.value,
                    }))
                  }
                  value={credentialForm.certificationId}
                >
                  <option value="">No linked certification</option>
                  {certificationOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Credential type</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      credentialType: event.target.value,
                    }))
                  }
                  value={credentialForm.credentialType}
                />
              </label>
              <label className="field field-light">
                <span>License number</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      licenseNumber: event.target.value,
                    }))
                  }
                  value={credentialForm.licenseNumber}
                />
              </label>
              <label className="field field-light">
                <span>Issuing authority</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      issuingAuthority: event.target.value,
                    }))
                  }
                  value={credentialForm.issuingAuthority}
                />
              </label>
              <label className="field field-light">
                <span>Issued on</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({ ...current, issuedOn: event.target.value }))
                  }
                  type="date"
                  value={credentialForm.issuedOn}
                />
              </label>
              <label className="field field-light">
                <span>Expires on</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({ ...current, expiresOn: event.target.value }))
                  }
                  type="date"
                  value={credentialForm.expiresOn}
                />
              </label>
              <label className="field field-light">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      status: event.target.value as CaregiverCredentialStatus,
                    }))
                  }
                  value={credentialForm.status}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Verification</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setCredentialForm((current) => ({
                      ...current,
                      verificationStatus: event.target.value as
                        | CaregiverCredentialVerificationStatus
                        | '',
                    }))
                  }
                  value={credentialForm.verificationStatus}
                >
                  <option value="">Not set</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setCredentialForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={credentialForm.notes}
                />
              </label>
            </div>
            {credentialError ? <p className="alert">{credentialError}</p> : null}
            {credentialSuccess ? <p className="success-message">{credentialSuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={credentialSaving} type="submit">
                {credentialSaving ? 'Saving...' : editingCredentialId ? 'Save credential' : 'Add credential'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingCredentialId(null);
                  setCredentialForm(CREDENTIAL_INITIAL);
                }}
                type="button"
              >
                Clear form
              </button>
            </div>
          </form>
        </WorkforcePanel>
        <WorkforcePanel
          title="Credential list"
          description="Expiration and verification states remain visible at list level so admins do not need to open every record to spot issues."
        >
          {credentialLoading ? <p>Loading credentials...</p> : null}
          {!credentialLoading && credentials.length === 0 ? (
            <WorkforceModuleState
              title="No credentials on file"
              description="Add the first caregiver credential to establish licensure and certification context."
              variant="empty"
            />
          ) : null}
          <div className="workforce-module-list">
            {credentials.map((credential) => (
              <article key={credential.id} className="workforce-module-row">
                <div>
                  <strong>{credential.credentialType}</strong>
                  <p>{credential.licenseNumber ?? 'No license number'}</p>
                  <p>
                    {credential.issuedOn ?? 'No issue date'} to {credential.expiresOn ?? 'No expiration'}
                  </p>
                </div>
                <div>
                  <span className={`status-pill status-${credential.status.toLowerCase()}`}>
                    {credential.status}
                  </span>
                  <p>{credential.verificationStatus ?? 'No verification state'}</p>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingCredentialId(credential.id);
                      setCredentialForm({
                        certificationId: credential.certificationId ?? '',
                        credentialType: credential.credentialType,
                        licenseNumber: credential.licenseNumber ?? '',
                        issuingAuthority: credential.issuingAuthority ?? '',
                        issuedOn: formatDateForInput(credential.issuedOn),
                        expiresOn: formatDateForInput(credential.expiresOn),
                        status: credential.status,
                        verificationStatus: credential.verificationStatus ?? '',
                        notes: credential.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateCredential(credential.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderCapabilitiesSection() {
    return (
      <>
        <WorkforceModuleState
          title="Languages and skills"
          description="Epic 4 keeps language and skill profile management together so communication and capability data stay visible from one section."
        />
        <WorkforcePanel
          title="Language profile"
          description="Primary language and proficiency are saved through the live language API."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'Capability changes are logged',
            'Language and skill profile updates feed later scheduling decisions, so successful mutations explicitly link back to workforce audit activity.',
          )}
          <form className="stack-form-light" onSubmit={handleLanguageSubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Language code</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setLanguageForm((current) => ({
                      ...current,
                      languageCode: event.target.value,
                    }))
                  }
                  placeholder="en-US"
                  value={languageForm.languageCode}
                />
              </label>
              <label className="field field-light">
                <span>Proficiency</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setLanguageForm((current) => ({
                      ...current,
                      proficiencyLevel: event.target.value,
                    }))
                  }
                  value={languageForm.proficiencyLevel}
                />
              </label>
              <label className="workforce-toggle">
                <input
                  checked={languageForm.primaryLanguage}
                  onChange={(event) =>
                    setLanguageForm((current) => ({
                      ...current,
                      primaryLanguage: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Primary language</span>
              </label>
            </div>
            {capabilityError ? <p className="alert">{capabilityError}</p> : null}
            {capabilitySuccess ? <p className="success-message">{capabilitySuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={languageSaving} type="submit">
                {languageSaving ? 'Saving...' : editingLanguageId ? 'Save language' : 'Add language'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingLanguageId(null);
                  setLanguageForm(LANGUAGE_INITIAL);
                }}
                type="button"
              >
                Clear language form
              </button>
            </div>
          </form>
          <div className="workforce-module-list">
            {capabilityLoading ? <p>Loading languages...</p> : null}
            {!capabilityLoading && languages.length === 0 ? (
              <WorkforceModuleState
                title="No languages on file"
                description="Add the caregiver's primary and supporting languages."
                variant="empty"
              />
            ) : null}
            {languages.map((language) => (
              <article key={language.id} className="workforce-module-row">
                <div>
                  <strong>{language.languageCode}</strong>
                  <p>{language.proficiencyLevel ?? 'No proficiency recorded'}</p>
                  <p>{language.primaryLanguage ? 'Primary language' : 'Secondary language'}</p>
                </div>
                <div>
                  <span className={`status-pill status-${language.status.toLowerCase()}`}>
                    {language.status}
                  </span>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingLanguageId(language.id);
                      setLanguageForm({
                        languageCode: language.languageCode,
                        proficiencyLevel: language.proficiencyLevel ?? '',
                        primaryLanguage: language.primaryLanguage,
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateLanguage(language.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>

        <WorkforcePanel
          title="Skill profile"
          description="Configured skill catalog linkage, proficiency, and verification are saved through the live skill-profile API."
        >
          <form className="stack-form-light" onSubmit={handleSkillSubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Skill</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setSkillForm((current) => ({ ...current, skillId: event.target.value }))
                  }
                  value={skillForm.skillId}
                >
                  <option value="">Select skill</option>
                  {skillOptions.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Proficiency</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setSkillForm((current) => ({
                      ...current,
                      proficiencyLevel: event.target.value,
                    }))
                  }
                  value={skillForm.proficiencyLevel}
                />
              </label>
              <label className="workforce-toggle">
                <input
                  checked={skillForm.verified}
                  onChange={(event) =>
                    setSkillForm((current) => ({ ...current, verified: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Verified skill</span>
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setSkillForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={skillForm.notes}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="button" disabled={skillSaving} type="submit">
                {skillSaving ? 'Saving...' : editingSkillId ? 'Save skill' : 'Add skill'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingSkillId(null);
                  setSkillForm(SKILL_INITIAL);
                }}
                type="button"
              >
                Clear skill form
              </button>
            </div>
          </form>
          <div className="workforce-module-list">
            {capabilityLoading ? <p>Loading skill profiles...</p> : null}
            {!capabilityLoading && skills.length === 0 ? (
              <WorkforceModuleState
                title="No skills on file"
                description="Add the caregiver's linked skills from the configured agency catalog."
                variant="empty"
              />
            ) : null}
            {skills.map((skill) => (
              <article key={skill.id} className="workforce-module-row">
                <div>
                  <strong>{skill.skillName}</strong>
                  <p>{skill.skillCode}</p>
                  <p>{skill.proficiencyLevel ?? 'No proficiency recorded'}</p>
                </div>
                <div>
                  <span className={`status-pill status-${skill.status.toLowerCase()}`}>
                    {skill.status}
                  </span>
                  <p>{skill.verified ? 'Verified' : 'Not verified'}</p>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingSkillId(skill.id);
                      setSkillForm({
                        skillId: skill.skillId,
                        proficiencyLevel: skill.proficiencyLevel ?? '',
                        verified: skill.verified,
                        notes: skill.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateSkill(skill.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderGeographySection() {
    return (
      <>
        <WorkforceModuleState
          title="Preferred geography"
          description="Branch, postal-area, city/state, and travel-radius preferences are now managed through the live geography APIs."
        />
        <WorkforcePanel
          title="Geography preference form"
          description="Priority rank stays visible so schedulability inputs remain understandable before scheduling logic arrives in Epic 5."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'Geography preferences are logged',
            'Branch, area, and radius changes affect future assignment behavior. Use the filtered audit view to review recent geography updates.',
          )}
          <form className="stack-form-light" onSubmit={handleGeographySubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Preference type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setGeographyForm((current) => ({
                      ...current,
                      preferenceType: event.target.value as CaregiverGeographyPreferenceType,
                    }))
                  }
                  value={geographyForm.preferenceType}
                >
                  <option value="BRANCH">Branch</option>
                  <option value="POSTAL_CODE">Postal code</option>
                  <option value="CITY_STATE">City and state</option>
                  <option value="RADIUS">Radius</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Branch</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, branchId: event.target.value }))
                  }
                  value={geographyForm.branchId}
                >
                  <option value="">No branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Postal code</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, postalCode: event.target.value }))
                  }
                  value={geographyForm.postalCode}
                />
              </label>
              <label className="field field-light">
                <span>City</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, city: event.target.value }))
                  }
                  value={geographyForm.city}
                />
              </label>
              <label className="field field-light">
                <span>State</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, state: event.target.value }))
                  }
                  value={geographyForm.state}
                />
              </label>
              <label className="field field-light">
                <span>Radius miles</span>
                <input
                  className="input input-light"
                  inputMode="decimal"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, radiusMiles: event.target.value }))
                  }
                  value={geographyForm.radiusMiles}
                />
              </label>
              <label className="field field-light">
                <span>Anchor latitude</span>
                <input
                  className="input input-light"
                  inputMode="decimal"
                  onChange={(event) =>
                    setGeographyForm((current) => ({
                      ...current,
                      anchorLatitude: event.target.value,
                    }))
                  }
                  value={geographyForm.anchorLatitude}
                />
              </label>
              <label className="field field-light">
                <span>Anchor longitude</span>
                <input
                  className="input input-light"
                  inputMode="decimal"
                  onChange={(event) =>
                    setGeographyForm((current) => ({
                      ...current,
                      anchorLongitude: event.target.value,
                    }))
                  }
                  value={geographyForm.anchorLongitude}
                />
              </label>
              <label className="field field-light">
                <span>Priority rank</span>
                <input
                  className="input input-light"
                  inputMode="numeric"
                  onChange={(event) =>
                    setGeographyForm((current) => ({
                      ...current,
                      priorityRank: event.target.value,
                    }))
                  }
                  value={geographyForm.priorityRank}
                />
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setGeographyForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={geographyForm.notes}
                />
              </label>
            </div>
            {geographyError ? <p className="alert">{geographyError}</p> : null}
            {geographySuccess ? <p className="success-message">{geographySuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={geographySaving} type="submit">
                {geographySaving ? 'Saving...' : editingGeographyId ? 'Save preference' : 'Add preference'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingGeographyId(null);
                  setGeographyForm(GEOGRAPHY_INITIAL);
                }}
                type="button"
              >
                Clear form
              </button>
            </div>
          </form>
        </WorkforcePanel>
        <WorkforcePanel
          title="Geography preferences"
          description="Priority, branch/area shape, and travel radius remain visible at list level."
        >
          {geographyLoading ? <p>Loading geography preferences...</p> : null}
          {!geographyLoading && geographyPreferences.length === 0 ? (
            <WorkforceModuleState
              title="No geography preferences on file"
              description="Add branch, city/state, postal-code, or radius preferences to capture where this caregiver prefers to work."
              variant="empty"
            />
          ) : null}
          <div className="workforce-module-list">
            {geographyPreferences.map((preference) => (
              <article key={preference.id} className="workforce-module-row">
                <div>
                  <strong>{preference.preferenceType}</strong>
                  <p>
                    {preference.preferenceType === 'BRANCH'
                      ? selectedBranchName(preference.branchId)
                      : preference.preferenceType === 'POSTAL_CODE'
                        ? preference.postalCode ?? 'No postal code'
                        : preference.preferenceType === 'CITY_STATE'
                          ? `${preference.city ?? ''}${preference.city && preference.state ? ', ' : ''}${preference.state ?? ''}`
                          : `${preference.radiusMiles ?? 'No'} mile radius`}
                  </p>
                  <p>Priority: {preference.priorityRank ?? 'Not set'}</p>
                </div>
                <div>
                  <span className={`status-pill status-${preference.status.toLowerCase()}`}>
                    {preference.status}
                  </span>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingGeographyId(preference.id);
                      setGeographyForm({
                        branchId: preference.branchId ?? '',
                        preferenceType: preference.preferenceType,
                        postalCode: preference.postalCode ?? '',
                        city: preference.city ?? '',
                        state: preference.state ?? '',
                        anchorLatitude:
                          preference.anchorLatitude === null ? '' : String(preference.anchorLatitude),
                        anchorLongitude:
                          preference.anchorLongitude === null ? '' : String(preference.anchorLongitude),
                        radiusMiles: preference.radiusMiles === null ? '' : String(preference.radiusMiles),
                        priorityRank:
                          preference.priorityRank === null ? '' : String(preference.priorityRank),
                        notes: preference.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateGeography(preference.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderShiftsSection() {
    return (
      <>
        <WorkforceModuleState
          title="Shift preferences"
          description="Preferred days, hours, visit-type notes, and strength signals are now saved through the live shift-preference API."
        />
        <WorkforcePanel
          title="Shift preference form"
          description="These are preferences, not guaranteed assignments, so the screen keeps work-pattern intent readable without implying a schedule."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'Shift preferences are logged',
            'Shift preference changes are tracked as workforce record updates so later scheduling decisions can be audited against caregiver-stated patterns.',
          )}
          <form className="stack-form-light" onSubmit={handleShiftSubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Day of week</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setShiftForm((current) => ({ ...current, dayOfWeek: event.target.value }))
                  }
                  value={shiftForm.dayOfWeek}
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Preferred start</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setShiftForm((current) => ({
                      ...current,
                      preferredStartTime: event.target.value,
                    }))
                  }
                  type="time"
                  value={shiftForm.preferredStartTime}
                />
              </label>
              <label className="field field-light">
                <span>Preferred end</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setShiftForm((current) => ({
                      ...current,
                      preferredEndTime: event.target.value,
                    }))
                  }
                  type="time"
                  value={shiftForm.preferredEndTime}
                />
              </label>
              <label className="field field-light">
                <span>Preferred shift length (minutes)</span>
                <input
                  className="input input-light"
                  inputMode="numeric"
                  onChange={(event) =>
                    setShiftForm((current) => ({
                      ...current,
                      preferredShiftLengthMinutes: event.target.value,
                    }))
                  }
                  value={shiftForm.preferredShiftLengthMinutes}
                />
              </label>
              <label className="field field-light">
                <span>Preferred visit types</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setShiftForm((current) => ({
                      ...current,
                      preferredVisitTypes: event.target.value,
                    }))
                  }
                  placeholder="Skilled, personal care"
                  value={shiftForm.preferredVisitTypes}
                />
              </label>
              <label className="field field-light">
                <span>Preference strength</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setShiftForm((current) => ({
                      ...current,
                      preferenceStrength: event.target.value as ShiftPreferenceStrength,
                    }))
                  }
                  value={shiftForm.preferenceStrength}
                >
                  <option value="PREFERRED">Preferred</option>
                  <option value="AVAILABLE_ONLY">Available only</option>
                  <option value="AVOID">Avoid</option>
                </select>
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setShiftForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={shiftForm.notes}
                />
              </label>
            </div>
            {shiftError ? <p className="alert">{shiftError}</p> : null}
            {shiftSuccess ? <p className="success-message">{shiftSuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={shiftSaving} type="submit">
                {shiftSaving ? 'Saving...' : editingShiftId ? 'Save shift preference' : 'Add shift preference'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingShiftId(null);
                  setShiftForm(SHIFT_INITIAL);
                }}
                type="button"
              >
                Clear form
              </button>
            </div>
          </form>
        </WorkforcePanel>
        <WorkforcePanel
          title="Shift preference list"
          description="Preference strength and time pattern stay visible in one scan-friendly list."
        >
          {shiftLoading ? <p>Loading shift preferences...</p> : null}
          {!shiftLoading && shiftPreferences.length === 0 ? (
            <WorkforceModuleState
              title="No shift preferences on file"
              description="Add the caregiver's day and time preferences to clarify work-pattern intent."
              variant="empty"
            />
          ) : null}
          <div className="workforce-module-list">
            {shiftPreferences.map((preference) => (
              <article key={preference.id} className="workforce-module-row">
                <div>
                  <strong>{preference.dayOfWeek ?? 'No day selected'}</strong>
                  <p>
                    {preference.preferredStartTime ?? 'No start'} to{' '}
                    {preference.preferredEndTime ?? 'No end'}
                  </p>
                  <p>{preference.preferredVisitTypes ?? 'No visit-type preference recorded'}</p>
                </div>
                <div>
                  <span className={`status-pill status-${preference.status.toLowerCase()}`}>
                    {preference.status}
                  </span>
                  <p>{preference.preferenceStrength ?? 'No strength set'}</p>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingShiftId(preference.id);
                      setShiftForm({
                        dayOfWeek: preference.dayOfWeek ?? '',
                        preferredStartTime: formatTimeInput(preference.preferredStartTime),
                        preferredEndTime: formatTimeInput(preference.preferredEndTime),
                        preferredShiftLengthMinutes:
                          preference.preferredShiftLengthMinutes === null
                            ? ''
                            : String(preference.preferredShiftLengthMinutes),
                        preferredVisitTypes: preference.preferredVisitTypes ?? '',
                        preferenceStrength: preference.preferenceStrength ?? 'PREFERRED',
                        notes: preference.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateShift(preference.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderAvailabilitySection() {
    return (
      <>
        <WorkforceModuleState
          title="Availability windows"
          description="Recurring and date-specific availability now share one live schedulability module with explicit conflict handling."
        />
        <WorkforcePanel
          title="Availability form"
          description="Recurring patterns stay separate from date-specific windows so schedulability inputs remain clear."
        >
          {renderAuditCallout(
            'WORKFORCE_CONFLICT_FLAGGED',
            'Availability conflicts are audit-sensitive',
            'Availability changes can trigger overlap conflicts. The filtered audit view helps confirm when schedulability windows were updated or conflict-flagged.',
          )}
          <form className="stack-form-light" onSubmit={handleAvailabilitySubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Availability type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({
                      ...current,
                      availabilityType: event.target.value as CaregiverAvailabilityType,
                    }))
                  }
                  value={availabilityForm.availabilityType}
                >
                  <option value="RECURRING">Recurring</option>
                  <option value="DATE_SPECIFIC">Date specific</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Branch</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, branchId: event.target.value }))
                  }
                  value={availabilityForm.branchId}
                >
                  <option value="">Agency-wide</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Day of week</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, dayOfWeek: event.target.value }))
                  }
                  value={availabilityForm.dayOfWeek}
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Start time</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                  type="time"
                  value={availabilityForm.startTime}
                />
              </label>
              <label className="field field-light">
                <span>End time</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                  type="time"
                  value={availabilityForm.endTime}
                />
              </label>
              <label className="field field-light">
                <span>Starts at</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, startsAt: event.target.value }))
                  }
                  type="datetime-local"
                  value={availabilityForm.startsAt}
                />
              </label>
              <label className="field field-light">
                <span>Ends at</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, endsAt: event.target.value }))
                  }
                  type="datetime-local"
                  value={availabilityForm.endsAt}
                />
              </label>
              <label className="field field-light">
                <span>Effective from</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({
                      ...current,
                      effectiveFrom: event.target.value,
                    }))
                  }
                  type="date"
                  value={availabilityForm.effectiveFrom}
                />
              </label>
              <label className="field field-light">
                <span>Effective to</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({
                      ...current,
                      effectiveTo: event.target.value,
                    }))
                  }
                  type="date"
                  value={availabilityForm.effectiveTo}
                />
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setAvailabilityForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={availabilityForm.notes}
                />
              </label>
            </div>
            {availabilityError ? <p className="alert">{availabilityError}</p> : null}
            {availabilitySuccess ? <p className="success-message">{availabilitySuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={availabilitySaving} type="submit">
                {availabilitySaving ? 'Saving...' : editingAvailabilityId ? 'Save availability' : 'Add availability'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingAvailabilityId(null);
                  setAvailabilityForm(AVAILABILITY_INITIAL);
                }}
                type="button"
              >
                Clear form
              </button>
            </div>
          </form>
        </WorkforcePanel>
        <WorkforcePanel
          title="Availability list"
          description="Recurring versus date-specific windows remain visible so schedulability inputs are easy to compare."
        >
          {availabilityLoading ? <p>Loading availabilities...</p> : null}
          {!availabilityLoading && availabilities.length === 0 ? (
            <WorkforceModuleState
              title="No availability windows on file"
              description="Add recurring or date-specific availability windows to express when this caregiver can be scheduled."
              variant="empty"
            />
          ) : null}
          <div className="workforce-module-list">
            {availabilities.map((availability) => (
              <article key={availability.id} className="workforce-module-row">
                <div>
                  <strong>{availability.availabilityType}</strong>
                  <p>
                    {availability.availabilityType === 'RECURRING'
                      ? `${availability.dayOfWeek ?? 'No day'} · ${availability.startTime ?? 'No start'} to ${availability.endTime ?? 'No end'}`
                      : `${availability.startsAt ?? 'No start'} to ${availability.endsAt ?? 'No end'}`}
                  </p>
                  <p>
                    Effective: {availability.effectiveFrom ?? 'Now'} to{' '}
                    {availability.effectiveTo ?? 'Open-ended'}
                  </p>
                </div>
                <div>
                  <span className={`status-pill status-${availability.status.toLowerCase()}`}>
                    {availability.status}
                  </span>
                  <p>{selectedBranchName(availability.branchId)}</p>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingAvailabilityId(availability.id);
                      setAvailabilityForm({
                        branchId: availability.branchId ?? '',
                        availabilityType: availability.availabilityType,
                        startsAt: formatDateTimeLocalInput(availability.startsAt),
                        endsAt: formatDateTimeLocalInput(availability.endsAt),
                        dayOfWeek: availability.dayOfWeek ?? '',
                        startTime: formatTimeInput(availability.startTime),
                        endTime: formatTimeInput(availability.endTime),
                        effectiveFrom: formatDateForInput(availability.effectiveFrom),
                        effectiveTo: formatDateForInput(availability.effectiveTo),
                        notes: availability.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateAvailability(availability.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderUnavailabilitySection() {
    return (
      <>
        <WorkforceModuleState
          title="PTO and blocked time"
          description="Unavailability windows now distinguish reason, approval state, and all-day behavior in one live workflow."
        />
        <WorkforcePanel
          title="Unavailability form"
          description="The form keeps PTO, blocked, training, and other time away in a single consistent structure."
        >
          {renderAuditCallout(
            'WORKFORCE_RECORD_UPDATED',
            'PTO and blocked time are logged',
            'Unavailability updates affect schedulability directly, so successful saves and deactivations should be reviewed through the workforce audit trail when needed.',
          )}
          <form className="stack-form-light" onSubmit={handleUnavailabilitySubmit}>
            <div className="workforce-form-grid">
              <label className="field field-light">
                <span>Reason type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({
                      ...current,
                      reasonType: event.target.value as CaregiverUnavailabilityReasonType,
                    }))
                  }
                  value={unavailabilityForm.reasonType}
                >
                  <option value="PTO">PTO</option>
                  <option value="SICK">Sick</option>
                  <option value="TRAINING">Training</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Starts at</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={unavailabilityForm.startsAt}
                />
              </label>
              <label className="field field-light">
                <span>Ends at</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={unavailabilityForm.endsAt}
                />
              </label>
              <label className="field field-light">
                <span>Approval status</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({
                      ...current,
                      approvalStatus: event.target.value as CaregiverUnavailabilityApprovalStatus,
                    }))
                  }
                  value={unavailabilityForm.approvalStatus}
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
              <label className="workforce-toggle">
                <input
                  checked={unavailabilityForm.allDay}
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({
                      ...current,
                      allDay: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>All day</span>
              </label>
              <label className="field field-light workforce-field-span">
                <span>Notes</span>
                <textarea
                  className="input input-light textarea"
                  onChange={(event) =>
                    setUnavailabilityForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={unavailabilityForm.notes}
                />
              </label>
            </div>
            {unavailabilityError ? <p className="alert">{unavailabilityError}</p> : null}
            {unavailabilitySuccess ? <p className="success-message">{unavailabilitySuccess} This change is logged.</p> : null}
            <div className="button-row">
              <button className="button" disabled={unavailabilitySaving} type="submit">
                {unavailabilitySaving ? 'Saving...' : editingUnavailabilityId ? 'Save unavailability' : 'Add unavailability'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingUnavailabilityId(null);
                  setUnavailabilityForm(UNAVAILABILITY_INITIAL);
                }}
                type="button"
              >
                Clear form
              </button>
            </div>
          </form>
        </WorkforcePanel>
        <WorkforcePanel
          title="Unavailability list"
          description="Approval state and reason stay visible so PTO and blocked time are distinguishable at a glance."
        >
          {unavailabilityLoading ? <p>Loading unavailability windows...</p> : null}
          {!unavailabilityLoading && unavailabilities.length === 0 ? (
            <WorkforceModuleState
              title="No unavailability windows on file"
              description="Add PTO or blocked time so schedulability constraints remain explicit."
              variant="empty"
            />
          ) : null}
          <div className="workforce-module-list">
            {unavailabilities.map((unavailability) => (
              <article key={unavailability.id} className="workforce-module-row">
                <div>
                  <strong>{unavailability.reasonType}</strong>
                  <p>
                    {unavailability.startsAt} to {unavailability.endsAt}
                  </p>
                  <p>{unavailability.allDay ? 'All day' : 'Partial day'}</p>
                </div>
                <div>
                  <span className={`status-pill status-${unavailability.status.toLowerCase()}`}>
                    {unavailability.status}
                  </span>
                  <p>{unavailability.approvalStatus ?? 'No approval status'}</p>
                </div>
                <div className="workforce-row-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingUnavailabilityId(unavailability.id);
                      setUnavailabilityForm({
                        reasonType: unavailability.reasonType,
                        startsAt: formatDateTimeLocalInput(unavailability.startsAt),
                        endsAt: formatDateTimeLocalInput(unavailability.endsAt),
                        allDay: unavailability.allDay,
                        approvalStatus: unavailability.approvalStatus ?? 'PENDING',
                        notes: unavailability.notes ?? '',
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void handleDeactivateUnavailability(unavailability.id)}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkforcePanel>
      </>
    );
  }

  function renderPerformanceSection() {
    return (
      <>
        <WorkforceModuleState
          title="Performance indicators"
          description="This read-only section uses the live performance summary API and clearly separates supported profile indicators from unsupported analytics."
          variant="readonly"
        />
        <WorkforcePanel
          title="Performance summary"
          description="Window controls stay simple in Epic 4 so the profile surface remains concise."
        >
          {renderAuditCallout(
            'WORKFORCE_PERFORMANCE_REFRESHED',
            'Performance refreshes are logged',
            'Refreshing performance indicators is treated as an audit-visible workforce action without exposing internal analytics metadata.',
          )}
          <div className="workforce-toolbar">
            <label className="field field-light">
              <span>Window</span>
              <select
                className="input input-light"
                onChange={(event) => setPerformanceWindowDays(Number(event.target.value))}
                value={performanceWindowDays}
              >
                <option value={30}>Past 30 days</option>
                <option value={60}>Past 60 days</option>
                <option value={90}>Past 90 days</option>
              </select>
            </label>
          </div>
          {performanceError ? <p className="alert">{performanceError}</p> : null}
          {performanceLoading ? <p>Loading performance summary...</p> : null}
          {performanceSummary ? (
            <>
              <div className="workforce-summary-cards">
                <article className="workforce-summary-card">
                  <span className="eyebrow">Schedulable</span>
                  <strong>{performanceSummary.currentlySchedulable ? 'Yes' : 'No'}</strong>
                  <p>Profile status: {performanceSummary.profileStatus}</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Active credentials</span>
                  <strong>{performanceSummary.activeCredentialCount}</strong>
                  <p>{performanceSummary.expiringCredentialCount} expiring soon</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Languages & skills</span>
                  <strong>
                    {performanceSummary.activeLanguageCount} / {performanceSummary.activeSkillCount}
                  </strong>
                  <p>Active languages and active skills</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Availability</span>
                  <strong>
                    {performanceSummary.recurringAvailabilityCount} /{' '}
                    {performanceSummary.dateSpecificAvailabilityCount}
                  </strong>
                  <p>Recurring and date-specific availability windows</p>
                </article>
              </div>
              <div className="workforce-module-state workforce-module-state-readonly">
                <strong>Unsupported metrics</strong>
                <p>
                  {performanceSummary.unsupportedMetrics.length > 0
                    ? performanceSummary.unsupportedMetrics.join(', ')
                    : 'No unsupported metrics returned for this window.'}
                </p>
              </div>
            </>
          ) : null}
        </WorkforcePanel>
      </>
    );
  }

  function renderScaffoldSection() {
    return (
      <>
        <WorkforceModuleState
          title={sectionConfig.label}
          description={sectionConfig.description}
          variant={isViewOnlySection ? 'readonly' : 'info'}
        />
        <WorkforceFormFramework
          destructiveActionLabel={section === 'profile' ? 'Controlled deactivate action' : undefined}
          fields={sectionConfig.fields.map((label, index) => ({
            label,
            value: buildFieldValues(caregiver, section)[index] ?? '',
          }))}
          helper={sectionConfig.formHelper}
          mode={isViewOnlySection ? 'read-only' : 'editable'}
          statusMessage={
            isViewOnlySection
              ? undefined
              : {
                  tone: section === 'availability' || section === 'unavailability' ? 'conflict' : 'success',
                  text:
                    section === 'availability' || section === 'unavailability'
                      ? 'Overlap conflicts and invalid windows will surface here consistently when the live module mutations land.'
                      : 'Saved workforce changes will show a logged success state here when the live module mutations land.',
                }
          }
          title={sectionConfig.formTitle}
        />
      </>
    );
  }

  return (
    <WorkforceWorkspaceShell
      eyebrow={createMode ? 'Epic 4 workforce create shell' : 'Epic 4 caregiver record'}
      title={createMode ? 'Create caregiver profile' : 'Caregiver detail workspace'}
      description={
        createMode
          ? 'The create route now uses the live caregiver profile API plus branch and agency-membership lookups.'
          : 'The Phase A shell now hosts real Phase B profile, credential, capability, and performance modules.'
      }
    >
      <WorkforceWorkspaceGrid>
        <WorkforceRecordHeader caregiver={headerRecord} />

        <WorkforceSectionNavigation currentPath={location.pathname} links={sectionLinks} />

        {loading ? (
          <WorkforceModuleState
            title="Loading caregiver record"
            description="Fetching the caregiver profile before rendering the shared Epic 4 workspace shell."
          />
        ) : null}

        {!loading && error ? (
          <WorkforceModuleState
            title="Unable to load this caregiver record"
            description={error}
            variant="error"
          />
        ) : null}

        {!loading && !error && section === 'overview' ? (
          <>
            <WorkforcePanel
              title="Caregiver workspace overview"
              description="Profile, credential, capability, schedulability-input, and performance modules now route through real backend-backed Epic 4 surfaces."
            >
              <div className="workforce-audit-callout">
                <strong>Workforce changes are sensitive operations.</strong>
                <p>
                  Credential, profile, and capability mutations show logged success states and can
                  route into the shared audit log.
                </p>
                {!createMode ? (
                  <Link className="workforce-audit-link" to="/app/admin/audit?module=workforce">
                    Open audit log
                  </Link>
                ) : null}
              </div>
              <WorkforceModuleCards cards={moduleCards} />
            </WorkforcePanel>

            <WorkforcePanel
              title="Phase C module coverage"
              description="The overview keeps the module states visible so admins can move quickly between profile, capability, and schedulability inputs."
            >
              <div className="workforce-summary-cards">
                <article className="workforce-summary-card">
                  <span className="eyebrow">Profile</span>
                  <strong>{caregiver?.displayName ?? 'Create profile'}</strong>
                  <p>Live create and edit workflow with branch and membership linkage.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Credentials</span>
                  <strong>{canAccessPermission(profile, 'manage_caregiver_credentials') ? 'Live' : 'Restricted'}</strong>
                  <p>Expiration and verification tracking backed by the credential APIs.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Skills & languages</span>
                  <strong>{canAccessPermission(profile, 'manage_caregiver_profiles') ? 'Live' : 'Restricted'}</strong>
                  <p>Language and skill profile editing backed by the capability APIs.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Performance</span>
                  <strong>{canAccessPermission(profile, 'view_caregiver_performance') ? 'Live' : 'Restricted'}</strong>
                  <p>Read-only summary cards backed by the performance summary API.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Geography & shifts</span>
                  <strong>{canAccessPermission(profile, 'manage_caregiver_profiles') ? 'Live' : 'Restricted'}</strong>
                  <p>Preferred branch, area, radius, and work-pattern inputs are now editable.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Availability</span>
                  <strong>{canAccessPermission(profile, 'manage_caregiver_availability') ? 'Live' : 'Restricted'}</strong>
                  <p>Recurring and date-specific availability now have live conflict-aware forms.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">PTO & blocked time</span>
                  <strong>{canAccessPermission(profile, 'manage_caregiver_unavailability') ? 'Live' : 'Restricted'}</strong>
                  <p>Unavailability windows now track reason, approval state, and all-day behavior.</p>
                </article>
              </div>
            </WorkforcePanel>
          </>
        ) : null}

        {!loading && !error && section === 'profile' ? renderProfileSection() : null}
        {!loading && !error && section === 'credentials' ? renderCredentialsSection() : null}
        {!loading && !error && section === 'capabilities' ? renderCapabilitiesSection() : null}
        {!loading && !error && section === 'geography' ? renderGeographySection() : null}
        {!loading && !error && section === 'shifts' ? renderShiftsSection() : null}
        {!loading && !error && section === 'availability' ? renderAvailabilitySection() : null}
        {!loading && !error && section === 'unavailability' ? renderUnavailabilitySection() : null}
        {!loading && !error && section === 'performance' ? renderPerformanceSection() : null}
        {!loading &&
        !error &&
        ![
          'overview',
          'profile',
          'credentials',
          'capabilities',
          'geography',
          'shifts',
          'availability',
          'unavailability',
          'performance',
        ].includes(section)
          ? renderScaffoldSection()
          : null}

        {!createMode && !loading && !error ? (
          <WorkforcePanel
            title="Record routing helpers"
            description="The global navigation stays focused on the workforce workspace, while record-specific navigation remains local to the caregiver context."
          >
            <div className="button-row">
              <button
                className="button button-secondary"
                onClick={() => navigate('/app/workforce')}
                type="button"
              >
                Back to workforce workspace
              </button>
              {caregiver ? (
                <button
                  className="button button-ghost"
                  onClick={() => navigate(`/app/workforce/${caregiver.id}/profile`)}
                  type="button"
                >
                  Open profile
                </button>
              ) : null}
            </div>
          </WorkforcePanel>
        ) : null}
      </WorkforceWorkspaceGrid>
    </WorkforceWorkspaceShell>
  );
}
