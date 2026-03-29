import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { ApiError, CaregiverProfile, fetchCaregiver } from '../auth/session-api';
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
    availability: ['RECURRING_WEEKLY', '08:00', '16:00', '2026-04-01', '2026-12-31'],
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

  const sectionConfig = SECTION_CONFIG[section];
  const isViewOnlySection = sectionConfig.viewPermission && !sectionConfig.permission;

  const sectionLinks: Array<{
    path: string;
    label: string;
    state: CaregiverSectionState;
  }> = (Object.entries(SECTION_CONFIG) as Array<
    [CaregiverSectionKey, (typeof SECTION_CONFIG)[CaregiverSectionKey]]
  >).map(([key, config]) => {
    const requiredPermission = config.permission ?? config.viewPermission;
    const allowed = requiredPermission ? canAccessPermission(profile, requiredPermission) : true;
    const stateForLink: CaregiverSectionState =
      !allowed ? 'restricted' : config.viewPermission && !config.permission ? 'read-only' : 'available';

    const path = createMode
      ? '/app/workforce/new/profile'
      : key === 'overview'
        ? `/app/workforce/${caregiverId}`
        : `/app/workforce/${caregiverId}/${key}`;

    return {
      path,
      label: config.label,
      state: stateForLink,
    };
  });

  const moduleCards = (Object.entries(SECTION_CONFIG) as Array<
    [CaregiverSectionKey, (typeof SECTION_CONFIG)[CaregiverSectionKey]]
  >)
    .filter(([key]) => key !== 'overview')
    .map(([key, config]) => ({
      path: createMode
        ? '/app/workforce/new/profile'
        : `/app/workforce/${caregiverId}/${key}`,
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

  return (
    <WorkforceWorkspaceShell
      eyebrow={createMode ? 'Epic 4 workforce create shell' : 'Epic 4 caregiver record'}
      title={createMode ? 'Create caregiver profile' : 'Caregiver detail workspace'}
      description={
        createMode
          ? 'The create route uses the same workforce shell, permission checks, and form framework that later profile CRUD stories will extend.'
          : 'Every caregiver module now routes through one consistent header, secondary navigation, and module-state foundation before the full CRUD modules land.'
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
              description="FE4-04 and FE4-13 organize the caregiver record into reusable module entry points without exposing unsupported backend internals."
            >
              <div className="workforce-audit-callout">
                <strong>Workforce changes are sensitive operations.</strong>
                <p>
                  Credential, availability, and profile mutations should later surface logged success
                  states and filtered audit links without changing the shared record shell.
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
              title="Section foundation"
              description="Each module can opt into editable, read-only, or restricted behavior without changing the caregiver header or record navigation."
            >
              <div className="workforce-summary-cards">
                <article className="workforce-summary-card">
                  <span className="eyebrow">Editable</span>
                  <strong>Profile and operational modules</strong>
                  <p>Profile, credentials, availability, and unavailability can render full mutation workflows when the matching backend permissions exist.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Read only</span>
                  <strong>Performance</strong>
                  <p>The performance route stays read-only and degrades cleanly when unsupported metrics are returned.</p>
                </article>
                <article className="workforce-summary-card">
                  <span className="eyebrow">Restricted</span>
                  <strong>Unauthorized sections</strong>
                  <p>Unavailable sections stay visible in the record nav as restricted states rather than failing silently.</p>
                </article>
              </div>
            </WorkforcePanel>
          </>
        ) : null}

        {!loading && !error && section !== 'overview' ? (
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
        ) : null}

        {!createMode && !loading && !error ? (
          <WorkforcePanel
            title="Record routing helpers"
            description="The global navigation stays focused on the workforce workspace, while record-specific navigation remains local to the caregiver context."
          >
            <div className="button-row">
              <button className="button button-secondary" onClick={() => navigate('/app/workforce')} type="button">
                Back to workforce workspace
              </button>
              {caregiver ? (
                <button
                  className="button button-ghost"
                  onClick={() => navigate(`/app/workforce/${caregiver.id}/profile`)}
                  type="button"
                >
                  Open profile shell
                </button>
              ) : null}
            </div>
          </WorkforcePanel>
        ) : null}
      </WorkforceWorkspaceGrid>
    </WorkforceWorkspaceShell>
  );
}
