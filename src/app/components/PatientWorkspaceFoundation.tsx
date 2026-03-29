import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

export type PatientModuleCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

type PatientHeaderRecord = {
  id: string;
  status: string;
  displayName: string;
  preferredName: string | null;
  externalReference: string | null;
  dateOfBirth: string;
  primaryPhone: string | null;
  email: string | null;
  language: string | null;
};

type PatientWorkspaceShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

type PatientRecordHeaderProps = {
  patient: PatientHeaderRecord;
};

type PatientSectionNavigationProps = {
  links: Array<{
    path: string;
    label: string;
    state: 'available' | 'read-only' | 'restricted';
  }>;
  currentPath: string;
};

type PatientModuleStateProps = {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly';
};

type PatientFormFrameworkProps = {
  title: string;
  helper: string;
  mode: 'editable' | 'read-only';
  fields: Array<{
    label: string;
    value: string;
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function PatientWorkspaceShell({
  eyebrow,
  title,
  description,
  children,
}: PatientWorkspaceShellProps) {
  return (
    <section className="patient-shell">
      <header className="patient-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="patient-shell-content">{children}</div>
    </section>
  );
}

export function PatientWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="patient-workspace-grid">{children}</div>;
}

export function PatientPanel({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
}>) {
  return (
    <article className="panel patient-panel">
      <div className="patient-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function PatientRecordHeader({ patient }: PatientRecordHeaderProps) {
  return (
    <article className="panel patient-record-header">
      <div>
        <span className="eyebrow">Patient record</span>
        <h3>{patient.displayName}</h3>
        <p className="patient-record-subtitle">
          {patient.preferredName ? `Preferred name: ${patient.preferredName}` : 'No preferred name on file'}
        </p>
      </div>
      <dl className="patient-record-meta">
        <div>
          <dt>Status</dt>
          <dd>{patient.status}</dd>
        </div>
        <div>
          <dt>External reference</dt>
          <dd>{patient.externalReference ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{formatDate(patient.dateOfBirth)}</dd>
        </div>
        <div>
          <dt>Primary phone</dt>
          <dd>{patient.primaryPhone ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{patient.email ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{patient.language ?? 'Not set'}</dd>
        </div>
      </dl>
      <p className="patient-record-id">
        Record ID
        <code>{patient.id}</code>
      </p>
    </article>
  );
}

export function PatientSectionNavigation({
  links,
  currentPath,
}: PatientSectionNavigationProps) {
  return (
    <nav className="panel patient-section-nav" aria-label="Patient sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span
            key={link.path}
            className={`patient-section-link patient-section-link-${link.state}`}
            title="This section remains unavailable until the matching backend permission is present."
          >
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <Link
            key={link.path}
            className={`patient-section-link ${
              currentPath === link.path ? 'patient-section-link-active' : ''
            } patient-section-link-${link.state}`}
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

export function PatientModuleCards({ cards }: { cards: PatientModuleCard[] }) {
  return (
    <div className="patient-module-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article key={card.path} className={`patient-module-card patient-module-card-${card.state}`}>
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={card.path}
            className={`patient-module-card patient-module-card-${card.state}`}
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

export function PatientModuleState({
  title,
  description,
  variant = 'info',
}: PatientModuleStateProps) {
  return (
    <div className={`patient-module-state patient-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function PatientFormFramework({
  title,
  helper,
  mode,
  fields,
}: PatientFormFrameworkProps) {
  return (
    <article className="panel patient-form-framework">
      <div className="patient-panel-header">
        <h3>{title}</h3>
        <p>{helper}</p>
      </div>
      <div className="patient-form-mode">
        <span className={`patient-mode-badge patient-mode-badge-${mode}`}>
          {mode === 'editable' ? 'Editable module shell' : 'Read-only module shell'}
        </span>
        <p>
          Shared Epic 3 form patterns now standardize inline validation placement, conflict messaging,
          destructive confirmations, and date-range layout before the full module CRUD stories land.
        </p>
      </div>
      <div className="patient-form-grid">
        {fields.map((field) => (
          <label key={field.label} className="field field-light">
            <span>{field.label}</span>
            <input className="input input-light" readOnly value={field.value} />
          </label>
        ))}
      </div>
    </article>
  );
}
