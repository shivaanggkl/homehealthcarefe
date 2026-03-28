import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  acceptInvitation,
  ApiError,
  fetchInvitationDetails,
  InvitationDetailsResponse,
} from '../auth/session-api';
import { useAuth } from '../auth/auth-context';
import { PasswordPolicyPanel } from '../components/PasswordPolicyPanel';
import { roleLabel } from '../user/admin-support';

type InvitationState = 'loading' | 'ready' | 'missing' | 'expired' | 'invalid' | 'used' | 'success';

function mapInvitationError(error: ApiError): { state: InvitationState; message: string } {
  if (error.status === 410) {
    return {
      state: 'expired',
      message: 'This invitation has expired. Ask your agency admin to send a new invite.',
    };
  }

  if (error.status === 404) {
    return {
      state: 'invalid',
      message: 'This invitation link is invalid or no longer available.',
    };
  }

  if (error.status === 409) {
    return {
      state: 'used',
      message: 'This invitation has already been accepted.',
    };
  }

  return {
    state: 'ready',
    message: error.message,
  };
}

export function AcceptInvitationPage() {
  const { state } = useAuth();
  const location = useLocation();
  const [invitation, setInvitation] = useState<InvitationDetailsResponse | null>(null);
  const [invitationState, setInvitationState] = useState<InvitationState>('loading');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  const signedParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      expiresAt: params.get('expiresAt')?.trim() ?? '',
      signature: params.get('signature')?.trim() ?? '',
    };
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      setInvitationState('missing');
      return;
    }

    setInvitationState('loading');
    setErrorMessage(null);

    void fetchInvitationDetails(token)
      .then((response) => {
        setInvitation(response);
        setFirstName(response.firstName);
        setLastName(response.lastName);
        setPhone(response.phone ?? '');
        setInvitationState('ready');
      })
      .catch((error) => {
        if (error instanceof ApiError) {
          const mapped = mapInvitationError(error);
          setInvitationState(mapped.state);
          setErrorMessage(mapped.message);
        } else {
          setInvitationState('invalid');
          setErrorMessage('Unable to load this invitation right now.');
        }
      });
  }, [token]);

  if (state.status === 'authenticated') {
    return <Navigate replace to="/app" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!token) {
      setInvitationState('missing');
      setErrorMessage('This invitation link is incomplete. Open the full invite email link.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and confirmation do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await acceptInvitation({
        token,
        firstName,
        lastName,
        phone,
        password,
      });
      setInvitationState('success');
      setSuccessMessage(
        `Invitation accepted. Your access has been activated for agency ${response.agencyId}.`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapInvitationError(error);
        setInvitationState(mapped.state);
        setErrorMessage(mapped.message);
      } else {
        setErrorMessage('Unable to accept the invitation right now.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const terminalState = ['missing', 'expired', 'invalid', 'used', 'success'].includes(invitationState);

  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">Frontend Story FE-17</span>
        <h1>Accept your agency invitation</h1>
        <p>
          This route resolves the invite token, confirms profile basics, and completes account setup through{' '}
          <code>GET/POST /api/invitations</code>.
        </p>

        {invitationState === 'loading' ? <p className="session-note-light">Loading invitation...</p> : null}

        {successMessage ? <p className="success-note">{successMessage}</p> : null}

        {invitationState === 'missing' ? (
          <p className="alert">
            <strong>Missing invite token.</strong> Open the full invitation link from your email.
          </p>
        ) : null}

        {['expired', 'invalid', 'used'].includes(invitationState) ? (
          <p className="alert">
            <strong>Invitation unavailable.</strong> {errorMessage}
          </p>
        ) : null}

        {!terminalState ? (
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>First name</span>
              <input
                className="input"
                onChange={(event) => setFirstName(event.target.value)}
                required
                type="text"
                value={firstName}
              />
            </label>

            <label className="field">
              <span>Last name</span>
              <input
                className="input"
                onChange={(event) => setLastName(event.target.value)}
                required
                type="text"
                value={lastName}
              />
            </label>

            <label className="field">
              <span>Phone</span>
              <input
                className="input"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional"
                type="tel"
                value={phone}
              />
            </label>

            <label className="field">
              <span>Create password</span>
              <input
                autoComplete="new-password"
                className="input"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            <label className="field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                className="input"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            <div className="button-row">
              <button className="button" disabled={submitting} type="submit">
                {submitting ? 'Accepting invitation...' : 'Accept invitation'}
              </button>
              <Link className="button button-secondary" to="/login">
                Back to login
              </Link>
            </div>

            {errorMessage && invitationState === 'ready' ? (
              <p className="alert">
                <strong>Acceptance failed.</strong> {errorMessage}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="button-row">
            <Link className="button" to="/login">
              Continue to login
            </Link>
          </div>
        )}

        <div className="info-block">
          <h2>Signed invite link metadata</h2>
          <dl className="definition-list compact inverse-definition-list">
            <div>
              <dt>Token present</dt>
              <dd>{token ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Signed expiry param present</dt>
              <dd>{signedParams.expiresAt ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Signature param present</dt>
              <dd>{signedParams.signature ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="auth-card">
        <h2>Invitation details</h2>

        {invitation ? (
          <>
            <dl className="definition-list compact">
              <div>
                <dt>Email</dt>
                <dd>{invitation.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabel(invitation.role)}</dd>
              </div>
              <div>
                <dt>Assigned branches</dt>
                <dd>
                  {invitation.branchNames.length > 0 ? invitation.branchNames.join(', ') : 'Agency-wide role'}
                </dd>
              </div>
              <div>
                <dt>Expires at</dt>
                <dd>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(invitation.expiresAt))}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="session-note">Invitation details will appear once the token is resolved.</p>
        )}

        <PasswordPolicyPanel
          description="Password requirements come from the backend policy endpoint so the invite-acceptance screen stays aligned with server validation."
          futureReuseNote="The same backend-driven policy component is reused across reset and change password flows."
        />
      </section>
    </div>
  );
}
