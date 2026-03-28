import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyMfaPolicyMode,
  AgencyMfaPolicyResponse,
  AgencyRole,
  ApiError,
  fetchAgencyMfaPolicy,
  updateAgencyMfaPolicy,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

const AGENCY_ROLE_OPTIONS: Array<{
  value: AgencyRole;
  label: string;
  description: string;
}> = [
  {
    value: 'AGENCY_OWNER',
    label: 'Agency Owner',
    description: 'Agency-wide owners with the highest access level.',
  },
  {
    value: 'BRANCH_ADMIN',
    label: 'Branch Admin',
    description: 'Operational admins responsible for one or more branches.',
  },
  {
    value: 'SCHEDULER_COORDINATOR',
    label: 'Scheduler Coordinator',
    description: 'Scheduling staff who manage daily branch assignments.',
  },
  {
    value: 'CAREGIVER',
    label: 'Caregiver',
    description: 'Field staff delivering home healthcare services.',
  },
  {
    value: 'QA_CLINICAL_REVIEWER',
    label: 'QA Clinical Reviewer',
    description: 'Clinical quality and documentation reviewers.',
  },
  {
    value: 'BILLING_BACK_OFFICE',
    label: 'Billing Back Office',
    description: 'Finance and reimbursement operations staff.',
  },
  {
    value: 'READ_ONLY_AUDITOR',
    label: 'Read Only Auditor',
    description: 'Read-only compliance and audit users.',
  },
];

const MODE_COPY: Record<
  AgencyMfaPolicyMode,
  { label: string; description: string }
> = {
  OFF: {
    label: 'MFA optional',
    description: 'Users can enroll MFA individually, but the agency does not enforce it.',
  },
  ALL_USERS: {
    label: 'Require MFA for all users',
    description: 'Every user in the current agency must complete MFA at login.',
  },
  SELECTED_ROLES: {
    label: 'Require MFA for selected roles',
    description: 'Only the checked roles below are required to complete MFA at login.',
  },
};

function normalizeRolesForMode(mode: AgencyMfaPolicyMode, roles: AgencyRole[]): AgencyRole[] {
  if (mode !== 'SELECTED_ROLES') {
    return [];
  }
  return [...new Set(roles)];
}

export function AdminMfaPolicyPage() {
  const { state } = useAuth();
  const [policy, setPolicy] = useState<AgencyMfaPolicyResponse | null>(null);
  const [mode, setMode] = useState<AgencyMfaPolicyMode>('OFF');
  const [requiredRoles, setRequiredRoles] = useState<AgencyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId: devSession?.sessionId ?? (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  async function loadPolicy() {
    setLoading(true);
    setLoadError(null);
    setUnauthorized(false);

    try {
      const currentPolicy = await fetchAgencyMfaPolicy(authContext);
      setPolicy(currentPolicy);
      setMode(currentPolicy.mode);
      setRequiredRoles(currentPolicy.requiredRoles);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError && error.status === 404) {
        setLoadError('The policy endpoint could not find MFA settings in the current agency context.');
      } else {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load the agency MFA policy.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    void loadPolicy();
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  function toggleRole(role: AgencyRole) {
    setRequiredRoles((current) =>
      current.includes(role) ? current.filter((value) => value !== role) : [...current, role],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSuccessMessage(null);

    const nextRoles = normalizeRolesForMode(mode, requiredRoles);
    if (mode === 'SELECTED_ROLES' && nextRoles.length === 0) {
      setSaveError('Choose at least one role when MFA is limited to selected roles.');
      return;
    }

    setSaving(true);

    try {
      const updatedPolicy = await updateAgencyMfaPolicy({
        ...authContext,
        mode,
        requiredRoles: nextRoles,
      });
      setPolicy(updatedPolicy);
      setMode(updatedPolicy.mode);
      setRequiredRoles(updatedPolicy.requiredRoles);
      setSuccessMessage('Agency MFA enforcement settings saved successfully.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError && error.status === 404) {
        setSaveError('The agency MFA policy is not available in the current agency context.');
      } else if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Unable to save the agency MFA policy right now.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-13</span>
          <h2>Agency MFA policy is admin-only.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for this route, so the frontend is
            showing an explicit unauthorized state instead of a broken form.
          </p>
        </section>
        <AccessDeniedPanel message="Only agency admins with MFA policy permissions can view or update this security setting." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-13</span>
        <h2>Configure agency-wide MFA enforcement.</h2>
        <p>
          This screen reads and updates <code>/api/security/mfa-policy</code> so admin users can decide
          whether MFA is optional, required for everyone, or required only for selected roles.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Current backend policy</h3>
          <p>The UI never displays MFA secrets or recovery codes. It only surfaces the agency enforcement rule.</p>
        </div>

        {loading ? <p className="session-note">Loading agency MFA policy...</p> : null}
        {loadError ? (
          <p className="alert">
            <strong>Policy unavailable.</strong> {loadError}
          </p>
        ) : null}
        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        {policy ? (
          <dl className="definition-list">
            <div>
              <dt>Agency ID</dt>
              <dd>
                <code>{policy.agencyId}</code>
              </dd>
            </div>
            <div>
              <dt>Current mode</dt>
              <dd>{MODE_COPY[policy.mode].label}</dd>
            </div>
            <div>
              <dt>Required roles</dt>
              <dd>{policy.requiredRoles.length > 0 ? policy.requiredRoles.join(', ') : 'None'}</dd>
            </div>
          </dl>
        ) : null}

        <div className="button-row">
          <button
            className="button button-secondary"
            disabled={loading || saving}
            onClick={() => void loadPolicy()}
            type="button"
          >
            Reload Policy
          </button>
        </div>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Update MFA enforcement</h3>
          <p>Selected-roles mode requires at least one role. `OFF` and `ALL_USERS` must save with no role list.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <div className="mfa-policy-mode-grid">
            {(['OFF', 'ALL_USERS', 'SELECTED_ROLES'] as AgencyMfaPolicyMode[]).map((value) => (
              <label
                className={`policy-option ${mode === value ? 'policy-option-active' : ''}`}
                key={value}
              >
                <input
                  checked={mode === value}
                  name="mfa-policy-mode"
                  onChange={() => {
                    setMode(value);
                    if (value !== 'SELECTED_ROLES') {
                      setRequiredRoles([]);
                    }
                  }}
                  type="radio"
                />
                <strong>{MODE_COPY[value].label}</strong>
                <span>{MODE_COPY[value].description}</span>
              </label>
            ))}
          </div>

          <div className="panel-header">
            <h3>Selected roles</h3>
            <p>Only used when the mode is set to selected roles.</p>
          </div>

          <div className="role-grid">
            {AGENCY_ROLE_OPTIONS.map((role) => {
              const checked = requiredRoles.includes(role.value);
              return (
                <label
                  className={`role-option ${
                    checked && mode === 'SELECTED_ROLES' ? 'role-option-active' : ''
                  } ${mode !== 'SELECTED_ROLES' ? 'role-option-disabled' : ''}`}
                  key={role.value}
                >
                  <input
                    checked={checked}
                    disabled={mode !== 'SELECTED_ROLES'}
                    onChange={() => toggleRole(role.value)}
                    type="checkbox"
                  />
                  <strong>{role.label}</strong>
                  <span>{role.description}</span>
                </label>
              );
            })}
          </div>

          {saveError ? (
            <p className="alert">
              <strong>Save failed.</strong> {saveError}
            </p>
          ) : null}

          <div className="button-row">
            <button className="button" disabled={loading || saving} type="submit">
              {saving ? 'Saving policy...' : 'Save MFA policy'}
            </button>
            <Link className="button button-secondary" to="/app/settings/security">
              Back to security settings
            </Link>
            <Link className="button button-secondary" to="/app/settings/mfa">
              Back to personal MFA settings
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
