import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

export type WorkforceModuleCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

type WorkforceHeaderRecord = {
  id: string;
  status: string;
  displayName: string;
  caregiverCode: string | null;
  membershipRole: string | null;
  primaryBranchName: string | null;
  employmentType: string | null;
  startDate: string | null;
  userEmail: string | null;
  userPhone: string | null;
};

type WorkforceWorkspaceShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

type WorkforceRecordHeaderProps = {
  caregiver: WorkforceHeaderRecord;
};

type WorkforceSectionNavigationProps = {
  links: Array<{
    path: string;
    label: string;
    state: 'available' | 'read-only' | 'restricted';
  }>;
  currentPath: string;
};

type WorkforceModuleStateProps = {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
};

type WorkforceFormFrameworkProps = {
  title: string;
  helper: string;
  mode: 'editable' | 'read-only';
  fields: Array<{
    label: string;
    value: string;
  }>;
  statusMessage?: {
    tone: 'success' | 'conflict' | 'warning';
    text: string;
  };
  destructiveActionLabel?: string;
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function WorkforceWorkspaceShell({
  eyebrow,
  title,
  description,
  children,
}: WorkforceWorkspaceShellProps) {
  return (
    <section className="workforce-shell">
      <header className="workforce-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="workforce-shell-content">{children}</div>
    </section>
  );
}

export function WorkforceWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="workforce-workspace-grid">{children}</div>;
}

export function WorkforcePanel({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
}>) {
  return (
    <article className="panel workforce-panel">
      <div className="workforce-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function WorkforceRecordHeader({ caregiver }: WorkforceRecordHeaderProps) {
  return (
    <article className="panel workforce-record-header">
      <div>
        <span className="eyebrow">Caregiver record</span>
        <h3>{caregiver.displayName}</h3>
        <p className="workforce-record-subtitle">
          {caregiver.caregiverCode
            ? `Caregiver code: ${caregiver.caregiverCode}`
            : 'No caregiver code on file'}
        </p>
      </div>
      <dl className="workforce-record-meta">
        <div>
          <dt>Status</dt>
          <dd>{caregiver.status}</dd>
        </div>
        <div>
          <dt>Membership role</dt>
          <dd>{caregiver.membershipRole ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Primary branch</dt>
          <dd>{caregiver.primaryBranchName ?? 'Not assigned'}</dd>
        </div>
        <div>
          <dt>Employment type</dt>
          <dd>{caregiver.employmentType ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Start date</dt>
          <dd>{formatDate(caregiver.startDate)}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>{caregiver.userEmail ?? caregiver.userPhone ?? 'Not set'}</dd>
        </div>
      </dl>
      <p className="workforce-record-id">
        Record ID
        <code>{caregiver.id}</code>
      </p>
    </article>
  );
}

export function WorkforceSectionNavigation({
  links,
  currentPath,
}: WorkforceSectionNavigationProps) {
  return (
    <nav className="panel workforce-section-nav" aria-label="Caregiver sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span
            key={link.path}
            className={`workforce-section-link workforce-section-link-${link.state}`}
            title="This section remains unavailable until the matching backend permission is present."
          >
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <Link
            key={link.path}
            className={`workforce-section-link ${
              currentPath === link.path ? 'workforce-section-link-active' : ''
            } workforce-section-link-${link.state}`}
            to={link.path}
          >
            <span>{link.label}</span>
            <small>{link.state === 'read-only' ? 'Read only' : 'Available'}</small>
          </Link>
        ),
      )}
    </nav>
  );
}

export function WorkforceModuleCards({ cards }: { cards: WorkforceModuleCard[] }) {
  return (
    <div className="workforce-module-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article
            key={card.path}
            className={`workforce-module-card workforce-module-card-${card.state}`}
          >
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={card.path}
            className={`workforce-module-card workforce-module-card-${card.state}`}
            to={card.path}
          >
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>{card.state === 'read-only' ? 'Read only' : 'Open section'}</span>
          </Link>
        ),
      )}
    </div>
  );
}

export function WorkforceModuleState({
  title,
  description,
  variant = 'info',
}: WorkforceModuleStateProps) {
  return (
    <div className={`workforce-module-state workforce-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function WorkforceFormFramework({
  title,
  helper,
  mode,
  fields,
  statusMessage,
  destructiveActionLabel,
}: WorkforceFormFrameworkProps) {
  return (
    <article className="panel workforce-form-framework">
      <div className="workforce-panel-header">
        <h3>{title}</h3>
        <p>{helper}</p>
      </div>
      <div className="workforce-form-mode">
        <span className={`workforce-mode-badge workforce-mode-badge-${mode}`}>
          {mode === 'editable' ? 'Editable module shell' : 'Read-only module shell'}
        </span>
        <p>
          Shared Epic 4 form patterns standardize inline validation placement, success feedback,
          conflict handling, destructive confirmations, date-range layout, and boolean preference
          controls before the full module CRUD stories land.
        </p>
      </div>
      {statusMessage ? (
        <div className={`workforce-inline-state workforce-inline-state-${statusMessage.tone}`}>
          {statusMessage.text}
        </div>
      ) : null}
      <div className="workforce-form-grid">
        {fields.map((field) => (
          <label key={field.label} className="field field-light">
            <span>{field.label}</span>
            <input className="input input-light" readOnly value={field.value} />
          </label>
        ))}
      </div>
      <div className="workforce-form-patterns">
        <span>Inline validation</span>
        <span>Form-level API error</span>
        <span>Date range pattern</span>
        <span>Flags and preferences</span>
        <span>Logged success state</span>
        {destructiveActionLabel ? <span>{destructiveActionLabel}</span> : null}
      </div>
    </article>
  );
}
