import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AdminNotificationPreferencesResponse,
  ApiError,
  fetchAdminNotificationPreferences,
  updateAdminNotificationPreferences,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

const ALERT_TYPES: Array<{
  key: keyof Pick<
    AdminNotificationPreferencesResponse,
    'failedLoginAlertsEnabled' | 'lockedAccountAlertsEnabled' | 'newAdminAlertsEnabled'
  >;
  title: string;
  description: string;
}> = [
  {
    key: 'failedLoginAlertsEnabled',
    title: 'Repeated failed login',
    description: 'Notify admins when the platform detects suspicious repeated login failures.',
  },
  {
    key: 'lockedAccountAlertsEnabled',
    title: 'Locked account',
    description: 'Notify admins when an account becomes locked and may need operational follow-up.',
  },
  {
    key: 'newAdminAlertsEnabled',
    title: 'New admin created',
    description: 'Notify admins when a user becomes a new agency or branch administrator.',
  },
];

export function AdminNotificationPreferencesPage() {
  const { state } = useAuth();
  const [preferences, setPreferences] = useState<AdminNotificationPreferencesResponse | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [failedLoginAlertsEnabled, setFailedLoginAlertsEnabled] = useState(true);
  const [lockedAccountAlertsEnabled, setLockedAccountAlertsEnabled] = useState(true);
  const [newAdminAlertsEnabled, setNewAdminAlertsEnabled] = useState(true);
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
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  async function loadPreferences() {
    setLoading(true);
    setLoadError(null);
    setUnauthorized(false);

    try {
      const currentPreferences = await fetchAdminNotificationPreferences(authContext);
      setPreferences(currentPreferences);
      setEmailEnabled(currentPreferences.emailEnabled);
      setFailedLoginAlertsEnabled(currentPreferences.failedLoginAlertsEnabled);
      setLockedAccountAlertsEnabled(currentPreferences.lockedAccountAlertsEnabled);
      setNewAdminAlertsEnabled(currentPreferences.newAdminAlertsEnabled);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError && error.status === 404) {
        setLoadError('Notification preferences were not found in the current agency context.');
      } else {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to load admin notification preferences.',
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

    void loadPreferences();
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const updatedPreferences = await updateAdminNotificationPreferences({
        ...authContext,
        emailEnabled,
        failedLoginAlertsEnabled,
        lockedAccountAlertsEnabled,
        newAdminAlertsEnabled,
      });
      setPreferences(updatedPreferences);
      setEmailEnabled(updatedPreferences.emailEnabled);
      setFailedLoginAlertsEnabled(updatedPreferences.failedLoginAlertsEnabled);
      setLockedAccountAlertsEnabled(updatedPreferences.lockedAccountAlertsEnabled);
      setNewAdminAlertsEnabled(updatedPreferences.newAdminAlertsEnabled);
      setSuccessMessage('Admin notification preferences saved successfully.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError && error.status === 404) {
        setSaveError('Notification preferences were not found in the current agency context.');
      } else if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Unable to save admin notification preferences right now.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-14</span>
          <h2>Critical security notifications are admin-only.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for this route, so the UI is showing a
            clear access-denied state instead of exposing a broken settings screen.
          </p>
        </section>
        <AccessDeniedPanel
          message="Only agency admins can view or update critical account notification delivery preferences."
          secondaryLink="/app/settings/admin-mfa-policy"
          secondaryLabel="Go to agency MFA policy"
        />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-14</span>
        <h2>Manage critical security notifications.</h2>
        <p>
          This screen reads and updates <code>/api/security/admin-notifications</code> so admin users can
          control delivery of operational security alerts without exposing any sensitive auth secrets.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Current delivery settings</h3>
          <p>These preferences apply to the current admin membership in the active agency context.</p>
        </div>

        {loading ? <p className="session-note">Loading admin notification preferences...</p> : null}
        {loadError ? (
          <p className="alert">
            <strong>Preferences unavailable.</strong> {loadError}
          </p>
        ) : null}
        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        {preferences ? (
          <dl className="definition-list">
            <div>
              <dt>Membership ID</dt>
              <dd>
                <code>{preferences.membershipId}</code>
              </dd>
            </div>
            <div>
              <dt>Email delivery</dt>
              <dd>{preferences.emailEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Active alert types</dt>
              <dd>
                {ALERT_TYPES.filter(({ key }) => preferences[key]).map(({ title }) => title).join(', ') ||
                  'None'}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="button-row">
          <button
            className="button button-secondary"
            disabled={loading || saving}
            onClick={() => void loadPreferences()}
            type="button"
          >
            Reload Preferences
          </button>
        </div>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Update notification preferences</h3>
          <p>
            Email delivery can be disabled entirely, or you can keep email enabled and tune which critical
            account events should generate alerts.
          </p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <label className="policy-option policy-option-active">
            <input
              checked={emailEnabled}
              onChange={(event) => setEmailEnabled(event.target.checked)}
              type="checkbox"
            />
            <strong>Email delivery enabled</strong>
            <span>Master switch for security alert email delivery to this admin membership.</span>
          </label>

          <div className="role-grid">
            {ALERT_TYPES.map((alertType) => {
              const checked =
                alertType.key === 'failedLoginAlertsEnabled'
                  ? failedLoginAlertsEnabled
                  : alertType.key === 'lockedAccountAlertsEnabled'
                    ? lockedAccountAlertsEnabled
                    : newAdminAlertsEnabled;

              return (
                <label
                  className={`role-option ${checked ? 'role-option-active' : ''} ${
                    !emailEnabled ? 'role-option-disabled' : ''
                  }`}
                  key={alertType.key}
                >
                  <input
                    checked={checked}
                    disabled={!emailEnabled}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      if (alertType.key === 'failedLoginAlertsEnabled') {
                        setFailedLoginAlertsEnabled(nextChecked);
                      } else if (alertType.key === 'lockedAccountAlertsEnabled') {
                        setLockedAccountAlertsEnabled(nextChecked);
                      } else {
                        setNewAdminAlertsEnabled(nextChecked);
                      }
                    }}
                    type="checkbox"
                  />
                  <strong>{alertType.title}</strong>
                  <span>{alertType.description}</span>
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
              {saving ? 'Saving preferences...' : 'Save notification preferences'}
            </button>
            <Link className="button button-secondary" to="/app/settings/security">
              Back to security settings
            </Link>
            <Link className="button button-secondary" to="/app/settings/admin-mfa-policy">
              Back to admin MFA policy
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
