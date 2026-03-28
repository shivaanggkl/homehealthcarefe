import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError, resetPassword } from '../auth/session-api';
import { useAuth } from '../auth/auth-context';
import { PasswordPolicyPanel } from '../components/PasswordPolicyPanel';

type TokenState = 'ready' | 'missing' | 'expired' | 'invalid' | 'used' | 'success';

function mapResetError(error: ApiError): { tokenState: TokenState; message: string } {
  if (error.status === 410) {
    return {
      tokenState: 'expired',
      message: 'This reset link has expired. Request a new one to continue.',
    };
  }

  const lower = error.message.toLowerCase();
  if (lower.includes('already used')) {
    return {
      tokenState: 'used',
      message: error.message,
    };
  }

  if (lower.includes('not found') || lower.includes('invalid')) {
    return {
      tokenState: 'invalid',
      message: error.message,
    };
  }

  return {
    tokenState: 'ready',
    message: error.message,
  };
}

export function ResetPasswordPage() {
  const { state } = useAuth();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeExistingSessions, setRevokeExistingSessions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      setTokenState('missing');
    } else if (tokenState === 'missing') {
      setTokenState('ready');
    }
  }, [token, tokenState]);

  if (state.status === 'authenticated') {
    return <Navigate replace to="/app" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setTokenState('missing');
      setErrorMessage('This reset link is incomplete. Request a new password reset email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await resetPassword({
        token,
        newPassword,
        revokeExistingSessions,
      });
      setTokenState('success');
      setSuccessMessage(
        result.revokedExistingSessions
          ? 'Password reset successful. Existing sessions were revoked.'
          : 'Password reset successful.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapResetError(error);
        setTokenState(mapped.tokenState);
        setErrorMessage(mapped.message);
      } else {
        setErrorMessage('Unable to reset your password right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const terminalState = tokenState !== 'ready';

  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">Frontend Story FE-06</span>
        <h1>Set a new password</h1>
        <p>
          Complete your password reset using the secure token from your email link. This flow also supports
          revoking existing sessions.
        </p>

        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        {tokenState === 'missing' ? (
          <p className="alert">
            <strong>Missing reset token.</strong> Open the full reset link from your email or request a new
            one.
          </p>
        ) : null}

        {tokenState === 'expired' || tokenState === 'invalid' || tokenState === 'used' ? (
          <p className="alert">
            <strong>Reset link unavailable.</strong> {errorMessage}
          </p>
        ) : null}

        {!terminalState ? (
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                className="input"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Create a strong password"
                required
                type="password"
                value={newPassword}
              />
            </label>

            <label className="field">
              <span>Confirm new password</span>
              <input
                autoComplete="new-password"
                className="input"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your new password"
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            <label className="checkbox">
              <input
                checked={revokeExistingSessions}
                onChange={(event) => setRevokeExistingSessions(event.target.checked)}
                type="checkbox"
              />
              <span>Revoke existing sessions after password reset</span>
            </label>

            <div className="button-row">
              <button className="button" disabled={submitting} type="submit">
                {submitting ? 'Resetting password...' : 'Reset password'}
              </button>
              <Link className="button button-secondary" to="/login">
                Back to login
              </Link>
            </div>

            {errorMessage && tokenState === 'ready' ? (
              <p className="alert">
                <strong>Reset failed.</strong> {errorMessage}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="button-row">
            <Link className="button" to="/login">
              Go to login
            </Link>
            <Link className="button button-secondary" to="/forgot-password">
              Request new reset link
            </Link>
          </div>
        )}

        <div className="info-block">
          <h2>What this flow handles</h2>
          <ul className="check-list">
            <li>Reads the reset token from the URL</li>
            <li>Loads the backend password policy from <code>GET /api/auth/password-policy</code></li>
            <li>Posts the new password to <code>POST /api/auth/reset-password</code></li>
            <li>Supports optional revocation of existing sessions</li>
            <li>Shows controlled invalid, expired, and already-used states</li>
          </ul>
        </div>
      </section>

      <section className="auth-card">
        <h2>Password guidance</h2>
        <PasswordPolicyPanel
          description="These rules come directly from the backend password policy endpoint, so the reset flow never drifts from server validation."
          futureReuseNote="This same component is ready to drop into the future invite-acceptance screen without rewriting password-rule logic."
        />

        <dl className="definition-list compact">
          <div>
            <dt>Token present</dt>
            <dd>{token ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Session revocation option</dt>
            <dd>{revokeExistingSessions ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div>
            <dt>Next step after success</dt>
            <dd>Return to login and sign in with the new password</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
