import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyProfileResponse,
  ApiError,
  fetchAgencyProfile,
  updateAgencyProfile,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { ConfigurationAuditNotice, formatConfigurationError } from '../components/ConfigurationSupport';
import {
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type AgencyProfileFormState = {
  displayName: string;
  legalName: string;
  primaryPhone: string;
  primaryAddress: string;
  operationsContactName: string;
  operationsContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  defaultTimezone: string;
  defaultLocale: string;
};

const INITIAL_FORM: AgencyProfileFormState = {
  displayName: '',
  legalName: '',
  primaryPhone: '',
  primaryAddress: '',
  operationsContactName: '',
  operationsContactEmail: '',
  supportContactName: '',
  supportContactEmail: '',
  defaultTimezone: 'America/Chicago',
  defaultLocale: 'en-US',
};

function mapProfileToForm(profile: AgencyProfileResponse): AgencyProfileFormState {
  return {
    displayName: profile.displayName ?? '',
    legalName: profile.legalName ?? '',
    primaryPhone: profile.primaryPhone ?? '',
    primaryAddress: profile.primaryAddress ?? '',
    operationsContactName: profile.operationsContactName ?? '',
    operationsContactEmail: profile.operationsContactEmail ?? '',
    supportContactName: profile.supportContactName ?? '',
    supportContactEmail: profile.supportContactEmail ?? '',
    defaultTimezone: profile.defaultTimezone,
    defaultLocale: profile.defaultLocale,
  };
}

export function AgencyProfileSetupPage() {
  const { state } = useAuth();
  const { profile: accessProfile } = useAccess();
  const [profile, setProfile] = useState<AgencyProfileResponse | null>(null);
  const [form, setForm] = useState<AgencyProfileFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    void fetchAgencyProfile(authContext)
      .then((response) => {
        setProfile(response);
        setForm(mapProfileToForm(response));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
          setUnauthorized(true);
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load agency profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  const ownerOnlyViolation = accessProfile.role !== 'AGENCY_OWNER';
  if (ownerOnlyViolation || unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-02"
          title="Agency profile setup is owner-only."
          message="Only the agency owner can manage Epic 2 agency profile defaults in this UI."
          primaryLink="/app/setup"
          primaryLabel="Back to setup"
          secondaryLink="/app/home"
          secondaryLabel="Back to home"
        />
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await updateAgencyProfile({
        ...authContext,
        ...form,
      });
      setProfile(response);
      setForm(mapProfileToForm(response));
      setSuccessMessage('Agency profile saved successfully.');
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save agency profile right now.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button
            className="button button-secondary"
            disabled={loading}
            onClick={() => {
              if (profile) {
                setForm(mapProfileToForm(profile));
                setSuccessMessage(null);
                setErrorMessage(null);
              }
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      }
      description="Manage the operational agency profile used by later Epic 2 configuration modules. This screen is intentionally owner-only in the UI."
      eyebrow="Frontend Story FE2-02"
      title="Agency profile setup"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            profile ? (
              <span className={`status-pill status-${profile.status.toLowerCase()}`}>{profile.status}</span>
            ) : null
          }
          description="This panel shows the currently effective agency profile as loaded from the backend."
          title="Current profile snapshot"
        >
          {loading ? <p className="session-note">Loading agency profile...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Agency profile unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          {profile ? (
            <dl className="definition-list compact">
              <div>
                <dt>Display name</dt>
                <dd>{profile.displayName || 'Not set yet'}</dd>
              </div>
              <div>
                <dt>Legal name</dt>
                <dd>{profile.legalName || 'Not set yet'}</dd>
              </div>
              <div>
                <dt>Operations contact</dt>
                <dd>
                  {profile.operationsContactName || profile.operationsContactEmail
                    ? `${profile.operationsContactName || 'No name'} • ${profile.operationsContactEmail || 'No email'}`
                    : 'Not set yet'}
                </dd>
              </div>
              <div>
                <dt>Support contact</dt>
                <dd>
                  {profile.supportContactName || profile.supportContactEmail
                    ? `${profile.supportContactName || 'No name'} • ${profile.supportContactEmail || 'No email'}`
                    : 'Not set yet'}
                </dd>
              </div>
              <div>
                <dt>Primary phone</dt>
                <dd>{profile.primaryPhone || 'Not set yet'}</dd>
              </div>
              <div>
                <dt>Primary address</dt>
                <dd>{profile.primaryAddress || 'Not set yet'}</dd>
              </div>
              <div>
                <dt>Timezone default</dt>
                <dd>{profile.defaultTimezone}</dd>
              </div>
              <div>
                <dt>Locale default</dt>
                <dd>{profile.defaultLocale}</dd>
              </div>
            </dl>
          ) : null}
        </ConfigurationPanel>

        <ConfigurationPanel
          description="Edit agency name, contact details, optional address, and the default locale/timezone values used elsewhere in Epic 2."
          title="Edit agency profile"
        >
          <ConfigurationAuditNotice subject="agency profile defaults" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <div className="split-grid">
              <label className="field field-light">
                <span>Display name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, displayName: event.target.value }))
                  }
                  placeholder="North Star Home Care"
                  type="text"
                  value={form.displayName}
                />
              </label>
              <label className="field field-light">
                <span>Legal name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, legalName: event.target.value }))
                  }
                  placeholder="North Star Home Care LLC"
                  type="text"
                  value={form.legalName}
                />
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Primary phone</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, primaryPhone: event.target.value }))
                  }
                  placeholder="(312) 555-0101"
                  type="tel"
                  value={form.primaryPhone}
                />
              </label>
              <label className="field field-light">
                <span>Primary address</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, primaryAddress: event.target.value }))
                  }
                  placeholder="123 Main St, Chicago, IL 60601"
                  type="text"
                  value={form.primaryAddress}
                />
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Operations contact name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, operationsContactName: event.target.value }))
                  }
                  placeholder="Jordan Lee"
                  type="text"
                  value={form.operationsContactName}
                />
              </label>
              <label className="field field-light">
                <span>Operations contact email</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, operationsContactEmail: event.target.value }))
                  }
                  placeholder="operations@example.com"
                  type="email"
                  value={form.operationsContactEmail}
                />
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Support contact name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, supportContactName: event.target.value }))
                  }
                  placeholder="Alex Morgan"
                  type="text"
                  value={form.supportContactName}
                />
              </label>
              <label className="field field-light">
                <span>Support contact email</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, supportContactEmail: event.target.value }))
                  }
                  placeholder="support@example.com"
                  type="email"
                  value={form.supportContactEmail}
                />
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Default timezone</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultTimezone: event.target.value }))
                  }
                  required
                  type="text"
                  value={form.defaultTimezone}
                />
              </label>
              <label className="field field-light">
                <span>Default locale</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultLocale: event.target.value }))
                  }
                  required
                  type="text"
                  value={form.defaultLocale}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="button" disabled={saving || loading} type="submit">
                {saving ? 'Saving profile...' : 'Save agency profile'}
              </button>
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
