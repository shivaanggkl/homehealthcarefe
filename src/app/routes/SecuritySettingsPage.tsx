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
import { PasswordPolicyPanel } from '../components/PasswordPolicyPanel';

const AGENCY_ROLE_OPTIONS: Array<{
  value: AgencyRole;
  label: string;
  description: string;
}> = [
  {
    value: 'AGENCY_OWNER',
    label: 'Agency Owner',
    description: 'Agency-wide owners and security decision makers.',
  },
  {
    value: 'BRANCH_ADMIN',
    label: 'Branch Admin',
    description: 'Operational admins responsible for branch-level management.',
  },
  {
    value: 'SCHEDULER_COORDINATOR',
    label: 'Scheduler Coordinator',
    description: 'Scheduling staff coordinating day-to-day operations.',
  },
  {
    value: 'CAREGIVER',
    label: 'Caregiver',
    description: 'Field staff who may need enforcement under selected-role policies.',
  },
  {
    value: 'QA_CLINICAL_REVIEWER',
    label: 'QA Clinical Reviewer',
    description: 'Clinical review staff with quality oversight responsibilities.',
  },
  {
    value: 'BILLING_BACK_OFFICE',
    label: 'Billing Back Office',
    description: 'Revenue-cycle and billing operations users.',
  },
  {
    value: 'READ_ONLY_AUDITOR',
    label: 'Read Only Auditor',
    description: 'Audit-only users with agency-wide read visibility.',
  },
];

const MODE_COPY: Record<AgencyMfaPolicyMode, { label: string; description: string }> = {
  OFF: {
    label: 'MFA optional',
    description: 'Users may enroll MFA individually, but the agency does not require it.',
  },
  ALL_USERS: {
    label: 'Require MFA for all users',
    description: 'Every user in the current agency must complete MFA during login.',
  },
  SELECTED_ROLES: {
    label: 'Require MFA for selected roles',
    description: 'Only the checked roles below must complete MFA during login.',
  },
};

function normalizeRolesForMode(mode: AgencyMfaPolicyMode, roles: AgencyRole[]): AgencyRole[] {
  if (mode !== 'SELECTED_ROLES') {
    return [];
  }
  return [...new Set(roles)];
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SecuritySettingsPage() {
  const { state } = useAuth();
  const [policy, setPolicy] = useState<AgencyMfaPolicyResponse | null>(null);
  const [mode, setMode] = useState<AgencyMfaPolicyMode>('OFF');
  const [requiredRoles, setRequiredRoles] = useState<AgencyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    void loadPolicy();
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  async function loadPolicy() {
    setLoading(true);
    setLoadError(null);

    try {
      const currentPolicy = await fetchAgencyMfaPolicy(authContext);
      setPolicy(currentPolicy);
      setMode(currentPolicy.mode);
      setRequiredRoles(currentPolicy.requiredRoles);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoadError('The security policy could not be loaded for the current agency context.');
      } else {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load current security settings.',
        );
      }
    } finally {
      setLoading(false);
    }
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
      setSaveError('Choose at least one role when MFA enforcement is limited to selected roles.');
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
      setSuccessMessage('Security settings updated. This change is audit-sensitive and will be logged.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setSaveError('The MFA policy could not be updated in the current agency context.');
      } else if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Unable to save the MFA policy right now.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card panel-span-2">
        <span className="eyebrow">Frontend Story FE-24</span>
        <h2>Consolidated security settings for the agency.</h2>
        <p>
          This owner-facing screen groups MFA enforcement, password rules, and session security in one place.
          MFA policy changes are live and audit-sensitive today. Password policy is read directly from the
          backend. Session-timeout configuration is designed and labeled, but the backend configuration API is
          not exposed yet.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>MFA enforcement</h3>
          <p>Uses the existing agency MFA policy endpoints and affects login security across the agency.</p>
        </div>

        <span className="permission-chip">Audit-sensitive change</span>

        {loading ? <p className="session-note">Loading current MFA policy...</p> : null}
        {loadError ? (
          <p className="alert">
            <strong>Policy unavailable.</strong> {loadError}
          </p>
        ) : null}
        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        {policy ? (
          <dl className="definition-list compact">
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

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <div className="mfa-policy-mode-grid">
            {(['OFF', 'ALL_USERS', 'SELECTED_ROLES'] as AgencyMfaPolicyMode[]).map((value) => (
              <label
                className={`policy-option ${mode === value ? 'policy-option-active' : ''}`}
                key={value}
              >
                <input
                  checked={mode === value}
                  name="security-page-mfa-mode"
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
              {saving ? 'Saving security settings...' : 'Save MFA enforcement'}
            </button>
            <button
              className="button button-secondary"
              disabled={loading || saving}
              onClick={() => void loadPolicy()}
              type="button"
            >
              Reload current values
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Password policy</h3>
          <p>Displays the live password rules enforced by the backend so admins can review current baseline security.</p>
        </div>

        <PasswordPolicyPanel
          description="These rules are read directly from the backend password-policy endpoint. This section is display-only, but still important for security review and support workflows."
          futureReuseNote="Any future invite acceptance or onboarding flow should continue to reuse this same backend-driven password rules component."
        />

        <div className="button-row">
          <Link className="button button-secondary" to="/app/settings/password">
            Go to personal password settings
          </Link>
        </div>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Session policy</h3>
          <p>
            Designed now for future timeout configuration. The current backend exposes runtime timeout status,
            but not an owner-facing update API yet.
          </p>
        </div>

        <span className="permission-chip">Designed for future API</span>

        <div className="session-policy-grid">
          <label className="field field-light">
            <span>Idle timeout</span>
            <input
              className="input input-light"
              disabled
              type="text"
              value={formatTimestamp(state.session.idleTimeoutAt)}
            />
          </label>

          <label className="field field-light">
            <span>Absolute timeout</span>
            <input
              className="input input-light"
              disabled
              type="text"
              value={formatTimestamp(state.session.absoluteTimeoutAt)}
            />
          </label>

          <label className="field field-light">
            <span>Forced logout at</span>
            <input
              className="input input-light"
              disabled
              type="text"
              value={formatTimestamp(state.session.forcedLogoutAt)}
            />
          </label>

          <label className="field field-light">
            <span>Warning window state</span>
            <input
              className="input input-light"
              disabled
              type="text"
              value={
                state.session.warningRequired
                  ? `${state.session.secondsUntilForcedLogout} seconds remaining`
                  : 'No active warning window'
              }
            />
          </label>
        </div>

        <div className="note-card">
          <strong>Configuration API not exposed yet</strong>
          <p>
            The UI is intentionally laid out for future timeout settings such as idle timeout, absolute max
            duration, and warning-window thresholds. Once a backend configuration endpoint exists, this section
            can move from read-only to editable without redesigning the page.
          </p>
        </div>
      </section>
    </div>
  );
}
