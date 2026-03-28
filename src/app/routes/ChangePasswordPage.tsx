import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { ApiError, changePassword } from '../auth/session-api';
import { loadDevSessionCredentials } from '../auth/session-storage';
import { PasswordPolicyPanel } from '../components/PasswordPolicyPanel';

export function ChangePasswordPage() {
  const { state } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invalidateOtherSessions, setInvalidateOtherSessions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (state.status !== 'authenticated') {
    return null;
  }

  const activeSession = state.session;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const devSession = loadDevSessionCredentials();
      const result = await changePassword({
        accessToken: devSession?.accessToken,
        sessionId: devSession?.sessionId ?? activeSession.sessionId,
        currentPassword,
        newPassword,
        invalidateOtherSessions,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(
        result.invalidatedOtherSessions
          ? 'Password changed successfully. Other sessions were invalidated.'
          : 'Password changed successfully.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to change your password right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-07</span>
        <h2>Change password from account settings.</h2>
        <p>
          This screen uses the authenticated backend change-password API, enforces the backend password policy,
          and allows the user to invalidate other sessions as part of the change.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Change password</h3>
          <p>Your current password is required before a new password can be saved.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <label className="field field-light">
            <span>Current password</span>
            <input
              autoComplete="current-password"
              className="input input-light"
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              required
              type="password"
              value={currentPassword}
            />
          </label>

          <label className="field field-light">
            <span>New password</span>
            <input
              autoComplete="new-password"
              className="input input-light"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Choose a new password"
              required
              type="password"
              value={newPassword}
            />
          </label>

          <label className="field field-light">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              className="input input-light"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat the new password"
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          <label className="checkbox checkbox-light">
            <input
              checked={invalidateOtherSessions}
              onChange={(event) => setInvalidateOtherSessions(event.target.checked)}
              type="checkbox"
            />
            <span>Sign out all other active sessions after changing password</span>
          </label>

          <div className="button-row">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Saving password...' : 'Update password'}
            </button>
            <Link className="button button-secondary" to="/app">
              Back to session home
            </Link>
          </div>

          {errorMessage ? (
            <p className="alert">
              <strong>Password change failed.</strong> {errorMessage}
            </p>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Password policy</h3>
          <p>The frontend reads these rules from the backend instead of hardcoding them.</p>
        </div>

        <PasswordPolicyPanel
          description="This panel owns its own fetch from the backend policy endpoint so every credential screen can reuse the same source of truth."
          futureReuseNote="The same component can be embedded in invite acceptance and any future account setup flow without duplicating rule rendering."
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Security behavior</h3>
        </div>
        <ul className="check-list">
          <li>Calls <code>POST /api/auth/change-password</code></li>
          <li>Requires the current password</li>
          <li>Supports invalidating other sessions</li>
          <li>Surfaces backend validation for weak, reused, or incorrect passwords</li>
          <li>Keeps the user inside the authenticated settings area</li>
        </ul>
      </section>
    </div>
  );
}
