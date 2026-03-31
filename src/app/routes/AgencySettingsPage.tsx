import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencySettingsResponse,
  ApiError,
  fetchAgencySettings,
  updateAgencySettings,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

type AgencyFormState = {
  name: string;
  timezone: string;
  contactEmail: string;
};

export function AgencySettingsPage() {
  const { state } = useAuth();
  const [settings, setSettings] = useState<AgencySettingsResponse | null>(null);
  const [form, setForm] = useState<AgencyFormState>({
    name: '',
    timezone: '',
    contactEmail: '',
  });
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

    void fetchAgencySettings(authContext)
      .then((response) => {
        setSettings(response);
        setForm({
          name: response.name,
          timezone: response.timezone,
          contactEmail: response.contactEmail,
        });
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
          setUnauthorized(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load agency settings.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await updateAgencySettings({
        ...authContext,
        name: form.name,
        timezone: form.timezone,
        contactEmail: form.contactEmail,
      });
      setSettings(response);
      setForm({
        name: response.name,
        timezone: response.timezone,
        contactEmail: response.contactEmail,
      });
      setSuccessMessage('Agency settings updated successfully.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to save agency settings right now.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-22</span>
          <h2>Agency settings are owner-only.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for agency settings access, so the
            frontend is rendering a clear owner-only unauthorized state.
          </p>
        </section>
        <AccessDeniedPanel message="Only the agency owner can update agency profile settings." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-22</span>
        <h2>Manage agency profile settings.</h2>
        <p>
          This owner-only screen reads and updates <code>/api/agency/settings</code> for the active agency.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Current agency profile</h3>
          <p>Success and validation states are surfaced directly from the backend response.</p>
        </div>

        {loading ? <p className="session-note">Loading agency settings...</p> : null}
        {errorMessage ? (
          <p className="alert">
            <strong>Agency settings unavailable.</strong> {errorMessage}
          </p>
        ) : null}

        {settings ? (
          <dl className="definition-list compact">
            <div>
              <dt>Agency ID</dt>
              <dd>
                <code>{settings.agencyId}</code>
              </dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>{settings.slug}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{settings.status}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Edit agency settings</h3>
          <p>Agency name, contact email, and timezone are editable here.</p>
        </div>

        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <label className="field field-light">
            <span>Agency name</span>
            <input
              className="input input-light"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              type="text"
              value={form.name}
            />
          </label>

          <div className="split-grid">
            <label className="field field-light">
              <span>Contact email</span>
              <input
                className="input input-light"
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                required
                type="email"
                value={form.contactEmail}
              />
            </label>

            <label className="field field-light">
              <span>Time zone</span>
              <input
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                required
                type="text"
                value={form.timezone}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="button" disabled={saving || loading} type="submit">
              {saving ? 'Saving agency...' : 'Save agency settings'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
