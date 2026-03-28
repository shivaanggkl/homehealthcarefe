import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { requestPasswordReset, ApiError } from '../auth/session-api';
import { useAuth } from '../auth/auth-context';

export function ForgotPasswordPage() {
  const { state } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prefilledEmail = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('email') ?? '';
  }, [location.search]);

  if (state.status === 'authenticated') {
    return <Navigate replace to="/app" />;
  }

  const effectiveEmail = email || prefilledEmail;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await requestPasswordReset({
        email: effectiveEmail.trim(),
      });
      setSuccessMessage(
        result.message ||
          'If an account exists for that email, a password reset link has been sent.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to request a password reset right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">Frontend Story FE-05</span>
        <h1>Reset your password</h1>
        <p>
          Request a secure reset link by email. The response is intentionally generic and never reveals
          whether an account exists for the address you enter.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          {successMessage ? (
            <p className="success-note">{successMessage}</p>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              className="input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
              type="email"
              value={effectiveEmail}
            />
          </label>

          <div className="button-row">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Requesting reset...' : 'Send reset email'}
            </button>
            <Link className="button button-secondary" to="/login">
              Back to login
            </Link>
          </div>

          {errorMessage ? (
            <p className="alert">
              <strong>Request failed.</strong> {errorMessage}
            </p>
          ) : null}
        </form>

        <div className="info-block">
          <h2>What this flow guarantees</h2>
          <ul className="check-list">
            <li>Posts to <code>POST /api/auth/forgot-password</code></li>
            <li>Does not leak whether the email exists</li>
            <li>Explains that reset links expire</li>
            <li>Keeps the UX usable even when the backend returns the same generic message every time</li>
          </ul>
        </div>
      </section>

      <section className="auth-card">
        <h2>What the user sees next</h2>
        <p>
          If the account exists and is eligible, the backend sends a password reset email using the signed
          expiring link flow already implemented in Epic 1.
        </p>

        <dl className="definition-list compact">
          <div>
            <dt>Endpoint</dt>
            <dd>
              <code>POST /api/auth/forgot-password</code>
            </dd>
          </div>
          <div>
            <dt>Security behavior</dt>
            <dd>Same success response for known and unknown emails</dd>
          </div>
          <div>
            <dt>User guidance</dt>
            <dd>Tell users to check spam and remember that the link expires</dd>
          </div>
        </dl>

        <div className="note-card">
          <strong>Reset links expire.</strong>
          <p>
            The reset-password screen now consumes the token from the email link and sends the new password
            to the backend reset endpoint.
          </p>
        </div>
      </section>
    </div>
  );
}
