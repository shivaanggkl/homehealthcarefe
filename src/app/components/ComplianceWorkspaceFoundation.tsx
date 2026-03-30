import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type ComplianceShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type ComplianceWorkspaceCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

export function ComplianceWorkspaceShell({
  eyebrow,
  title,
  description,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <section className="compliance-shell">
      <header className="compliance-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="compliance-shell-content">{children}</div>
    </section>
  );
}

export function ComplianceWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="compliance-grid">{children}</div>;
}

export function CompliancePanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel compliance-panel">
      <div className="compliance-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function ComplianceSectionNavigation({ links }: { links: ComplianceShellLink[] }) {
  return (
    <nav className="panel compliance-section-nav" aria-label="Compliance sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span
            key={`${link.path}-${link.label}`}
            className="compliance-section-link compliance-section-link-restricted"
          >
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={`${link.path}-${link.label}`}
            className={({ isActive }) =>
              `compliance-section-link compliance-section-link-${link.state}${
                isActive ? ' compliance-section-link-active' : ''
              }`
            }
            to={link.path}
          >
            <span>{link.label}</span>
            <small>{link.state === 'read-only' ? 'Read only' : 'Open'}</small>
          </NavLink>
        ),
      )}
    </nav>
  );
}

export function ComplianceWorkspaceCards({ cards }: { cards: ComplianceWorkspaceCard[] }) {
  return (
    <div className="compliance-workspace-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article
            key={`${card.path}-${card.label}`}
            className="compliance-workspace-card compliance-workspace-card-restricted"
          >
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={`${card.path}-${card.label}`}
            className={`compliance-workspace-card compliance-workspace-card-${card.state}`}
            to={card.path}
          >
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>{card.state === 'read-only' ? 'Read only' : 'Open route'}</span>
          </Link>
        ),
      )}
    </div>
  );
}

export function ComplianceStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`compliance-status-banner compliance-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function ComplianceModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`compliance-module-state compliance-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function ComplianceMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
}) {
  return (
    <div className={`compliance-mutation-notice compliance-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}

export function ComplianceAuditCallout({
  title,
  body,
  links,
}: {
  title: string;
  body: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div className="compliance-audit-callout">
      <strong>{title}</strong>
      <p>{body}</p>
      <div className="compliance-audit-links">
        {links.map((link) => (
          <Link className="compliance-audit-link" key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
