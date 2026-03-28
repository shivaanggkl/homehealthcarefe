import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchSelfProfile,
  SelfProfileResponse,
  updateSelfProfile,
} from '../auth/session-api';

type ProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: string;
  timeZone: string;
};

export function SelfProfilePage() {
  const { state } = useAuth();
  const [profile, setProfile] = useState<SelfProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    preferredLanguage: '',
    timeZone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void fetchSelfProfile(authContext)
      .then((response) => {
        setProfile(response);
        setForm({
          firstName: response.firstName,
          lastName: response.lastName,
          phone: response.phone ?? '',
          preferredLanguage: response.preferredLanguage ?? '',
          timeZone: response.timeZone ?? '',
        });
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your profile.');
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
      const response = await updateSelfProfile({
        ...authContext,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        preferredLanguage: form.preferredLanguage,
        timeZone: form.timeZone,
      });
      setProfile(response);
      setForm({
        firstName: response.firstName,
        lastName: response.lastName,
        phone: response.phone ?? '',
        preferredLanguage: response.preferredLanguage ?? '',
        timeZone: response.timeZone ?? '',
      });
      setSuccessMessage('Profile updated successfully.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to update your profile right now.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-20</span>
        <h2>Manage your own profile details.</h2>
        <p>
          This screen uses <code>GET /api/me/profile</code> and <code>PUT /api/me/profile</code> to update
          your personal profile without exposing any role-editing path.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Current profile</h3>
          <p>Role and agency assignment are intentionally omitted from self-service editing.</p>
        </div>

        {loading ? <p className="session-note">Loading profile...</p> : null}
        {errorMessage ? (
          <p className="alert">
            <strong>Profile unavailable.</strong> {errorMessage}
          </p>
        ) : null}

        {profile ? (
          <dl className="definition-list compact">
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>
                <code>{profile.userId}</code>
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Edit my profile</h3>
          <p>Validation errors come from the backend and are shown inline.</p>
        </div>

        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          <div className="split-grid">
            <label className="field field-light">
              <span>First name</span>
              <input
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                required
                type="text"
                value={form.firstName}
              />
            </label>

            <label className="field field-light">
              <span>Last name</span>
              <input
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                required
                type="text"
                value={form.lastName}
              />
            </label>
          </div>

          <div className="split-grid">
            <label className="field field-light">
              <span>Phone</span>
              <input
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                type="tel"
                value={form.phone}
              />
            </label>

            <label className="field field-light">
              <span>Preferred language</span>
              <input
                className="input input-light"
                onChange={(event) =>
                  setForm((current) => ({ ...current, preferredLanguage: event.target.value }))
                }
                placeholder="en-US"
                type="text"
                value={form.preferredLanguage}
              />
            </label>
          </div>

          <label className="field field-light">
            <span>Time zone</span>
            <input
              className="input input-light"
              onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}
              placeholder="America/Chicago"
              type="text"
              value={form.timeZone}
            />
          </label>

          <div className="callout-card">
            <strong>Protected fields</strong>
            <p>
              Email, role, branch assignments, status, password, and MFA settings are intentionally not editable
              from this self-service screen.
            </p>
          </div>

          <div className="button-row">
            <button className="button" disabled={saving || loading} type="submit">
              {saving ? 'Saving profile...' : 'Save profile'}
            </button>
            <Link className="button button-secondary" to="/app/home">
              Back to home
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
