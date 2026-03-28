import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { ApiError } from '../auth/session-api';
import { clearPendingMfaChallenge, loadPendingMfaChallenge } from '../auth/session-storage';

type MfaMode = 'totp' | 'recovery';

export function MfaChallengePage() {
  const { state, completeMfaLogin } = useAuth();
  const navigate = useNavigate();
  const challenge = useMemo(() => loadPendingMfaChallenge(), []);
  const [mode, setMode] = useState<MfaMode>('totp');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryCodeUsed, setRecoveryCodeUsed] = useState(false);

  if (state.status === 'authenticated') {
    return <Navigate replace to="/app" />;
  }

  if (!challenge) {
    return (
      <div className="auth-layout">
        <section className="auth-card auth-card-primary">
          <span className="eyebrow">MFA challenge missing</span>
          <h1>No pending login challenge</h1>
          <p>
            This route requires a successful password login that returned a backend MFA challenge token.
          </p>
          <div className="button-row">
            <Link className="button" to="/login">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const pendingChallenge = challenge;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setRecoveryCodeUsed(false);

    const trimmedTotp = totpCode.trim();
    const trimmedRecoveryCode = recoveryCode.trim();

    if (mode === 'totp' && !trimmedTotp) {
      setSubmitting(false);
      setErrorMessage('Enter the 6-digit code from your authenticator app.');
      return;
    }

    if (mode === 'recovery' && !trimmedRecoveryCode) {
      setSubmitting(false);
      setErrorMessage('Enter one of your saved recovery codes.');
      return;
    }

    try {
      const result = await completeMfaLogin({
        challengeToken: pendingChallenge.challengeToken,
        totpCode: mode === 'totp' ? trimmedTotp : undefined,
        recoveryCode: mode === 'recovery' ? trimmedRecoveryCode : undefined,
        persistDevSession: pendingChallenge.persistDevSession,
      });

      setRecoveryCodeUsed(result.recoveryCodeUsed);
      navigate('/app', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 410) {
          clearPendingMfaChallenge();
          setErrorMessage('This MFA challenge expired. Start sign-in again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Unable to complete MFA right now. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">Frontend Story FE-03</span>
        <h1>Complete multi-factor sign-in</h1>
        <p>
          Password verification already succeeded for <strong>{pendingChallenge.email}</strong>. Finish login with
          either your authenticator app or a one-time recovery code.
        </p>

        <div className="segmented-control" role="tablist" aria-label="MFA method">
          <button
            aria-selected={mode === 'totp'}
            className={`segment ${mode === 'totp' ? 'segment-active' : ''}`}
            onClick={() => {
              setMode('totp');
              setErrorMessage(null);
            }}
            type="button"
          >
            Authenticator code
          </button>
          <button
            aria-selected={mode === 'recovery'}
            className={`segment ${mode === 'recovery' ? 'segment-active' : ''}`}
            onClick={() => {
              setMode('recovery');
              setErrorMessage(null);
            }}
            type="button"
          >
            Recovery code
          </button>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          {mode === 'totp' ? (
            <label className="field">
              <span>6-digit authenticator code</span>
              <input
                autoComplete="one-time-code"
                className="input"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setTotpCode(event.target.value.replace(/\s+/g, ''))}
                placeholder="123456"
                value={totpCode}
              />
            </label>
          ) : (
            <label className="field">
              <span>Recovery code</span>
              <input
                className="input"
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="Enter saved recovery code"
                value={recoveryCode}
              />
            </label>
          )}

          <div className="button-row">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Verifying...' : 'Complete sign-in'}
            </button>
            <Link className="button button-secondary" to="/login">
              Back to login
            </Link>
          </div>

          {errorMessage ? (
            <p className="alert">
              <strong>MFA failed.</strong> {errorMessage}
            </p>
          ) : null}

          {recoveryCodeUsed ? (
            <p className="success-note">
              Recovery code accepted. This code is now consumed and cannot be used again.
            </p>
          ) : null}
        </form>
      </section>

      <section className="auth-card">
        <h2>What FE-03 now handles</h2>
        <ul className="check-list">
          <li>Submits TOTP codes to <code>POST /api/auth/login/mfa</code></li>
          <li>Supports recovery-code fallback using the same endpoint</li>
          <li>Handles invalid and expired challenge states cleanly</li>
          <li>Completes authenticated session bootstrap after MFA success</li>
          <li>Preserves localhost token fallback mode from FE-02 when enabled</li>
        </ul>

        <dl className="definition-list compact mfa-meta">
          <div>
            <dt>User ID</dt>
            <dd>
              <code>{pendingChallenge.userId}</code>
            </dd>
          </div>
          <div>
            <dt>Challenge token</dt>
            <dd>
              <code>{pendingChallenge.challengeToken}</code>
            </dd>
          </div>
          <div>
            <dt>Localhost fallback</dt>
            <dd>{pendingChallenge.persistDevSession ? 'Enabled' : 'Disabled'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
