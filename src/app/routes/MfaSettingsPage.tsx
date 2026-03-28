import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import {
  ApiError,
  confirmMfaEnrollment,
  fetchMfaStatus,
  MfaEnrollmentStartResponse,
  MfaStatusResponse,
  startMfaEnrollment,
} from '../auth/session-api';
import { loadDevSessionCredentials } from '../auth/session-storage';

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not enrolled';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function MfaSettingsPage() {
  const { state } = useAuth();
  const [mfaStatus, setMfaStatus] = useState<MfaStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [enrollment, setEnrollment] = useState<MfaEnrollmentStartResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  if (state.status !== 'authenticated') {
    return null;
  }

  const activeSession = state.session;

  async function loadStatus() {
    setStatusError(null);
    try {
      const devSession = loadDevSessionCredentials();
      const status = await fetchMfaStatus({
        accessToken: devSession?.accessToken,
        sessionId: devSession?.sessionId ?? activeSession.sessionId,
      });
      setMfaStatus(status);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to load MFA status.');
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    let active = true;

    if (!enrollment?.otpauthUri) {
      setQrCodeDataUrl(null);
      return;
    }

    void (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(enrollment.otpauthUri, {
          margin: 1,
          width: 208,
          color: {
            dark: '#08395d',
            light: '#ffffff',
          },
        });
        if (active) {
          setQrCodeDataUrl(dataUrl);
        }
      } catch {
        if (active) {
          setQrCodeDataUrl(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [enrollment]);

  async function handleStartEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStarting(true);
    setStartError(null);
    setSuccessMessage(null);

    try {
      const devSession = loadDevSessionCredentials();
      const started = await startMfaEnrollment({
        accessToken: devSession?.accessToken,
        sessionId: devSession?.sessionId ?? activeSession.sessionId,
        currentPassword,
      });
      setEnrollment(started);
      setCurrentPassword('');
      setTotpCode('');
    } catch (error) {
      if (error instanceof ApiError) {
        setStartError(error.message);
      } else {
        setStartError('Unable to start MFA enrollment right now.');
      }
    } finally {
      setStarting(false);
    }
  }

  async function handleConfirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) {
      return;
    }

    setConfirming(true);
    setConfirmError(null);
    setSuccessMessage(null);

    try {
      const confirmed = await confirmMfaEnrollment({
        enrollmentToken: enrollment.enrollmentToken,
        totpCode: totpCode.trim(),
      });
      setMfaStatus((previous) => ({
        userId: confirmed.userId,
        mfaEnabled: confirmed.mfaEnabled,
        enrolledAt: new Date().toISOString(),
        recoveryCodesRemaining: confirmed.recoveryCodesRemaining,
      }));
      setEnrollment(null);
      setTotpCode('');
      setQrCodeDataUrl(null);
      setSuccessMessage('MFA is now enabled for your account.');
      await loadStatus();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 410) {
          setEnrollment(null);
          setQrCodeDataUrl(null);
          setConfirmError('The enrollment session expired. Start enrollment again.');
        } else {
          setConfirmError(error.message);
        }
      } else {
        setConfirmError('Unable to confirm MFA enrollment right now.');
      }
    } finally {
      setConfirming(false);
    }
  }

  const recoveryCodes = useMemo(() => enrollment?.recoveryCodes ?? [], [enrollment]);

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-08</span>
        <h2>Manage multi-factor authentication.</h2>
        <p>
          This settings flow loads the current MFA status, requires recent password re-auth to start
          enrollment, and completes TOTP enrollment with one-time recovery-code display.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Current MFA status</h3>
          <p>Backed by <code>GET /api/auth/mfa/status</code>.</p>
        </div>

        {statusError ? (
          <p className="alert">
            <strong>Status unavailable.</strong> {statusError}
          </p>
        ) : null}

        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        <dl className="definition-list">
          <div>
            <dt>MFA enabled</dt>
            <dd>{mfaStatus?.mfaEnabled ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Enrolled at</dt>
            <dd>{formatTimestamp(mfaStatus?.enrolledAt ?? null)}</dd>
          </div>
          <div>
            <dt>Recovery codes remaining</dt>
            <dd>{mfaStatus?.recoveryCodesRemaining ?? 'Loading...'}</dd>
          </div>
        </dl>

        <div className="button-row">
          <button className="button button-secondary" onClick={() => void loadStatus()} type="button">
            Refresh MFA status
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Start enrollment</h3>
          <p>Enter your current password to begin TOTP enrollment.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleStartEnrollment}>
          <label className="field field-light">
            <span>Current password</span>
            <input
              autoComplete="current-password"
              className="input input-light"
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Confirm your current password"
              required
              type="password"
              value={currentPassword}
            />
          </label>

          <div className="button-row">
            <button className="button" disabled={starting} type="submit">
              {starting ? 'Starting enrollment...' : 'Start MFA enrollment'}
            </button>
          </div>

          {startError ? (
            <p className="alert">
              <strong>Enrollment could not start.</strong> {startError}
            </p>
          ) : null}
        </form>
      </section>

      {enrollment ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <h3>Authenticator setup</h3>
              <p>Scan the QR code or enter the manual key in your authenticator app.</p>
            </div>

            {qrCodeDataUrl ? (
              <div className="qr-card">
                <img alt="MFA QR code" className="qr-image" src={qrCodeDataUrl} />
              </div>
            ) : (
              <div className="note-card">
                <strong>QR code unavailable.</strong>
                <p>Use the manual entry key below instead.</p>
              </div>
            )}

            <dl className="definition-list compact">
              <div>
                <dt>Manual entry key</dt>
                <dd>
                  <code>{enrollment.manualEntryKey}</code>
                </dd>
              </div>
              <div>
                <dt>otpauth URI</dt>
                <dd className="code-wrap">
                  <code>{enrollment.otpauthUri}</code>
                </dd>
              </div>
              <div>
                <dt>Expires at</dt>
                <dd>{formatTimestamp(enrollment.expiresAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Recovery codes</h3>
              <p>These are shown once. Save them before completing enrollment.</p>
            </div>

            <div className="recovery-grid">
              {recoveryCodes.map((code) => (
                <code className="recovery-code" key={code}>
                  {code}
                </code>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Confirm enrollment</h3>
              <p>Enter the current authenticator code to finish enabling MFA.</p>
            </div>

            <form className="stack-form stack-form-light" onSubmit={handleConfirmEnrollment}>
              <label className="field field-light">
                <span>Authenticator code</span>
                <input
                  autoComplete="one-time-code"
                  className="input input-light"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\s+/g, ''))}
                  placeholder="123456"
                  required
                  value={totpCode}
                />
              </label>

              <div className="button-row">
                <button className="button" disabled={confirming} type="submit">
                  {confirming ? 'Confirming...' : 'Enable MFA'}
                </button>
              </div>

              {confirmError ? (
                <p className="alert">
                  <strong>Confirmation failed.</strong> {confirmError}
                </p>
              ) : null}
            </form>
          </section>
        </>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Security notes</h3>
        </div>
        <ul className="check-list">
          <li>Loads current status from <code>GET /api/auth/mfa/status</code></li>
          <li>Starts enrollment with current-password re-auth via <code>POST /api/auth/mfa/enrollment/start</code></li>
          <li>Confirms enrollment via <code>POST /api/auth/mfa/enrollment/confirm</code></li>
          <li>Displays recovery codes exactly once from the backend start response</li>
          <li>Handles expired enrollment challenges and invalid TOTP codes cleanly</li>
        </ul>

        <div className="button-row">
          <Link className="button button-secondary" to="/app">
            Back to session home
          </Link>
        </div>
      </section>
    </div>
  );
}
