import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyRole,
  ApiError,
  BranchSummary,
  fetchBranches,
  InvitationResponse,
  inviteUser,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { AGENCY_ROLE_OPTIONS, isRoleBranchScoped, roleLabel } from '../user/admin-support';

type InviteFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

const INITIAL_FORM: InviteFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'CAREGIVER',
  branchIds: [],
};

export function InviteUserPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [form, setForm] = useState<InviteFormState>(INITIAL_FORM);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<InvitationResponse | null>(null);
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

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    setLoadingBranches(true);
    setBranchesError(null);
    setUnauthorized(false);

    void fetchBranches(authContext)
      .then((response) => {
        setBranches(response.filter((branch) => branch.status === 'ACTIVE'));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
          setUnauthorized(true);
        } else {
          setBranchesError(
            error instanceof Error ? error.message : 'Unable to load branch assignments.',
          );
        }
      })
      .finally(() => {
        setLoadingBranches(false);
      });
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  const actorCanAssignOwner = profile.role === 'AGENCY_OWNER';
  const roleRequiresBranches = isRoleBranchScoped(form.role);

  function toggleBranch(branchId: string) {
    setForm((current) => ({
      ...current,
      branchIds: current.branchIds.includes(branchId)
        ? current.branchIds.filter((value) => value !== branchId)
        : [...current.branchIds, branchId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccess(null);

    if (form.role === 'AGENCY_OWNER' && !actorCanAssignOwner) {
      setErrorMessage('Only an Agency Owner can send an invitation for another Agency Owner.');
      return;
    }

    if (roleRequiresBranches && form.branchIds.length === 0) {
      setErrorMessage('Choose at least one branch for branch-scoped roles.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await inviteUser({
        ...authContext,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        branchIds: roleRequiresBranches ? form.branchIds : [],
      });
      setSuccess(response);
      setForm(INITIAL_FORM);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to send the invitation right now.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-16</span>
          <h2>User invitation is restricted.</h2>
          <p>
            The backend returned a controlled <code>403</code> response, so this route is rendering a clean
            unauthorized state instead of an unusable form.
          </p>
        </section>
        <AccessDeniedPanel message="Only permitted admins can invite staff into the current agency." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Frontend Story FE-16</span>
        <h2>Invite a staff member into the agency.</h2>
        <p>
          This form uses <code>POST /api/users/invitations</code> and captures role plus optional branch
          assignments. Duplicate pending invites are handled by the backend by cancelling the old invite and
          issuing a fresh one.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Invite details</h3>
          <p>Role changes, branch assignments, and the invite send action are audit-sensitive.</p>
        </div>

        {success ? (
          <div className="success-card">
            <h4>Invitation sent</h4>
            <p>
              {success.email} was invited as <strong>{roleLabel(success.role)}</strong>. The invite expires on{' '}
              <strong>{new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(success.expiresAt))}</strong>.
            </p>
            <p>
              Branch assignments: {success.branchNames.length > 0 ? success.branchNames.join(', ') : 'None'}
            </p>
          </div>
        ) : null}

        {branchesError ? (
          <p className="alert">
            <strong>Branches unavailable.</strong> {branchesError}
          </p>
        ) : null}

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
              <span>Email</span>
              <input
                autoComplete="email"
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="field field-light">
              <span>Phone</span>
              <input
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Optional"
                type="tel"
                value={form.phone}
              />
            </label>
          </div>

          <label className="field field-light">
            <span>Agency role</span>
            <select
              className="input input-light"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as AgencyRole,
                  branchIds: isRoleBranchScoped(event.target.value as AgencyRole)
                    ? current.branchIds
                    : [],
                }))
              }
              value={form.role}
            >
              {AGENCY_ROLE_OPTIONS.map((option) => (
                <option
                  disabled={option.value === 'AGENCY_OWNER' && !actorCanAssignOwner}
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="info-block info-block-light">
            <h4>{roleLabel(form.role)}</h4>
            <p>
              {AGENCY_ROLE_OPTIONS.find((option) => option.value === form.role)?.description}
              {form.role === 'AGENCY_OWNER' && !actorCanAssignOwner
                ? ' Only an existing Agency Owner can assign this role.'
                : ''}
            </p>
          </div>

          <div className="panel inset-panel">
            <div className="panel-header">
              <h4>Branch assignments</h4>
              <p>
                {roleRequiresBranches
                  ? 'This role is branch-scoped. Choose one or more branches.'
                  : 'This role has agency-wide visibility, so branch assignment is optional and will not be sent.'}
              </p>
            </div>

            {loadingBranches ? <p className="session-note">Loading available branches...</p> : null}

            <div className="selection-grid">
              {branches.map((branch) => (
                <label className="checkbox-card" key={branch.id}>
                  <input
                    checked={form.branchIds.includes(branch.id)}
                    disabled={!roleRequiresBranches}
                    onChange={() => toggleBranch(branch.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{branch.name}</strong>
                    <small>{branch.code}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="callout-card">
            <strong>Duplicate invite behavior</strong>
            <p>
              If this email already has a pending invite in the same agency, the backend replaces it with a new
              one and resets the expiration window.
            </p>
          </div>

          <div className="button-row">
            <button className="button" disabled={submitting || loadingBranches} type="submit">
              {submitting ? 'Sending invite...' : 'Send invite'}
            </button>
            <Link className="button button-secondary" to="/app/admin/users">
              Back to directory
            </Link>
          </div>

          {errorMessage ? (
            <p className="alert">
              <strong>Invite failed.</strong> {errorMessage}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
