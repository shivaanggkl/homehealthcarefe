import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ModuleStateProps = {
  title: string;
  description: string;
  variant?: 'loading' | 'empty' | 'error' | 'readonly' | 'unauthorized';
};

type MutationNoticeProps = {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
};

type EscalationBadgeProps = {
  label: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
};

type SectionLink = {
  to: string;
  label: string;
  active?: boolean;
};

export function PatientEventWorkspaceShell(props: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="patient-event-shell">
      <header className="patient-event-hero">
        <span className="eyebrow">{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </header>
      {props.children}
    </div>
  );
}

export function PatientEventWorkspaceGrid(props: { children: ReactNode }) {
  return <div className="patient-event-grid">{props.children}</div>;
}

export function PatientEventPanel(props: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="patient-event-panel">
      <header className="patient-event-panel-header">
        <div>
          <h2>{props.title}</h2>
          {props.description ? <p>{props.description}</p> : null}
        </div>
        {props.actions ? <div className="patient-event-panel-actions">{props.actions}</div> : null}
      </header>
      {props.children}
    </section>
  );
}

export function PatientEventSectionNavigation(props: { items: SectionLink[] }) {
  return (
    <nav className="patient-event-nav" aria-label="Patient event sections">
      {props.items.map((item) => (
        <Link
          className={item.active ? 'patient-event-nav-link is-active' : 'patient-event-nav-link'}
          key={`${item.to}-${item.label}`}
          to={item.to}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function PatientEventStatusBanner(props: {
  tone?: 'info' | 'success' | 'warning' | 'readonly';
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`patient-event-banner tone-${props.tone ?? 'info'}`}>
      <strong>{props.title}</strong>
      <div>{props.children}</div>
    </div>
  );
}

export function PatientEventModuleState(props: ModuleStateProps) {
  return (
    <div className={`patient-event-module-state variant-${props.variant ?? 'loading'}`}>
      <strong>{props.title}</strong>
      <p>{props.description}</p>
    </div>
  );
}

export function PatientEventMutationNotice(props: MutationNoticeProps) {
  return (
    <div className={`patient-event-mutation-notice state-${props.state}`}>
      <strong>
        {props.state === 'saving'
          ? 'Saving controlled change'
          : props.state === 'saved'
            ? 'Workspace refreshed'
            : props.state === 'retry'
              ? 'Action needs attention'
              : 'Controlled operation'}
      </strong>
      <p>{props.message}</p>
    </div>
  );
}

export function PatientEventEscalationBadge(props: EscalationBadgeProps) {
  return (
    <span className={`patient-event-escalation-badge tone-${props.tone ?? 'default'}`}>
      {props.label}
    </span>
  );
}

export function PatientEventAuditCallout(props: {
  title: string;
  body: string;
  href?: string;
}) {
  return (
    <div className="patient-event-audit-callout">
      <strong>{props.title}</strong>
      <p>{props.body}</p>
      {props.href ? (
        <Link className="patient-event-inline-link" to={props.href}>
          Open audit activity
        </Link>
      ) : null}
    </div>
  );
}

export function PatientEventContextLinks(props: {
  patientHref?: string;
  visitHref?: string;
  documentationHref?: string;
  messagingHref?: string;
}) {
  const items = [
    props.patientHref ? { href: props.patientHref, label: 'Patient workspace' } : null,
    props.visitHref ? { href: props.visitHref, label: 'Schedule detail' } : null,
    props.documentationHref
      ? { href: props.documentationHref, label: 'Documentation context' }
      : null,
    props.messagingHref ? { href: props.messagingHref, label: 'Care-team discussion' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="patient-event-context-links">
      {items.map((item) => (
        <Link className="patient-event-inline-link" key={item.href} to={item.href}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
