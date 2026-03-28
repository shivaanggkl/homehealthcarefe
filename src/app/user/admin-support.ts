import { AgencyRole, BranchSummary, UserDirectoryEntry, UserStatus } from '../auth/session-api';

export const AGENCY_ROLE_OPTIONS: Array<{
  value: AgencyRole;
  label: string;
  description: string;
}> = [
  {
    value: 'AGENCY_OWNER',
    label: 'Agency Owner',
    description: 'Agency-wide owner with full staff and security control.',
  },
  {
    value: 'BRANCH_ADMIN',
    label: 'Branch Admin',
    description: 'Operational admin responsible for one or more branches.',
  },
  {
    value: 'SCHEDULER_COORDINATOR',
    label: 'Scheduler Coordinator',
    description: 'Scheduling staff limited to assigned branches.',
  },
  {
    value: 'CAREGIVER',
    label: 'Caregiver',
    description: 'Field staff limited to assigned branches.',
  },
  {
    value: 'QA_CLINICAL_REVIEWER',
    label: 'QA Clinical Reviewer',
    description: 'Clinical review staff limited to assigned branches.',
  },
  {
    value: 'BILLING_BACK_OFFICE',
    label: 'Billing Back Office',
    description: 'Agency-wide back-office billing staff.',
  },
  {
    value: 'READ_ONLY_AUDITOR',
    label: 'Read Only Auditor',
    description: 'Agency-wide read-only auditor.',
  },
];

export const USER_STATUS_OPTIONS: Array<{ value: UserStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
];

export function roleLabel(role: AgencyRole): string {
  return AGENCY_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export function isRoleBranchScoped(role: AgencyRole): boolean {
  return !['AGENCY_OWNER', 'BILLING_BACK_OFFICE', 'READ_ONLY_AUDITOR'].includes(role);
}

export function mapBranchNamesToIds(
  branchNames: string[],
  branches: BranchSummary[],
): string[] {
  const ids = branches
    .filter((branch) => branchNames.includes(branch.name))
    .map((branch) => branch.id);

  return [...new Set(ids)];
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function fullName(entry: Pick<UserDirectoryEntry, 'firstName' | 'lastName'>): string {
  return `${entry.firstName} ${entry.lastName}`.trim();
}
