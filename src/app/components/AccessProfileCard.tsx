import { ChangeEvent, useMemo } from 'react';
import { useAccess } from '../access/access-context';
import { AgencyRole } from '../auth/session-api';

const ROLE_OPTIONS: Array<{ value: AgencyRole; label: string }> = [
  { value: 'AGENCY_OWNER', label: 'Agency Owner' },
  { value: 'BRANCH_ADMIN', label: 'Branch Admin' },
  { value: 'SCHEDULER_COORDINATOR', label: 'Scheduler Coordinator' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'QA_CLINICAL_REVIEWER', label: 'QA Clinical Reviewer' },
  { value: 'BILLING_BACK_OFFICE', label: 'Billing Back Office' },
  { value: 'READ_ONLY_AUDITOR', label: 'Read Only Auditor' },
];

export function AccessProfileCard() {
  const { profile, setRoleOverride, setAssignedBranches, clearOverride } = useAccess();

  const branchValue = useMemo(() => profile.assignedBranchIds.join(', '), [profile.assignedBranchIds]);

  function handleBranchChange(event: ChangeEvent<HTMLInputElement>) {
    const branchIds = event.target.value
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    setAssignedBranches(branchIds);
  }

  return (
    <section className="sidebar-card">
      <span className="eyebrow">FE-12 access profile</span>
      <strong>{profile.roleLabel}</strong>
      <p>
        Source: {profile.source === 'override' ? 'frontend override' : 'safe fallback'}.
        {' '}This is a temporary frontend-side access model until the backend provides current-user permissions.
      </p>

      <label className="field field-light compact-field">
        <span>Frontend role</span>
        <select
          className="input input-light"
          onChange={(event) => setRoleOverride(event.target.value as AgencyRole)}
          value={profile.role}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field field-light compact-field">
        <span>Assigned branches</span>
        <input
          className="input input-light"
          disabled={profile.branchScope !== 'branch-assigned'}
          onChange={handleBranchChange}
          placeholder="branch-a, branch-b"
          type="text"
          value={branchValue}
        />
      </label>

      <p className="session-note">
        Scope: {profile.branchScopeLabel}
      </p>
      <div className="permission-chip-grid">
        {profile.permissions.map((permission) => (
          <span className="permission-chip" key={permission}>
            {permission}
          </span>
        ))}
      </div>

      <div className="button-row">
        <button className="button button-secondary" onClick={clearOverride} type="button">
          Reset Access Override
        </button>
      </div>
    </section>
  );
}
