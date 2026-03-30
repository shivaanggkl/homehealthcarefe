import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type RevenueShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type RevenueWorkspaceCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

export function RevenueWorkspaceShell({
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
    <section className="revenue-shell">
      <header className="revenue-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="revenue-shell-content">{children}</div>
    </section>
  );
}

export function RevenueWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="revenue-grid">{children}</div>;
}

export function RevenuePanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel revenue-panel">
      <div className="revenue-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function RevenueSectionNavigation({ links }: { links: RevenueShellLink[] }) {
  return (
    <nav className="panel revenue-section-nav" aria-label="Revenue-readiness sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span
            key={`${link.path}-${link.label}`}
            className="revenue-section-link revenue-section-link-restricted"
          >
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={`${link.path}-${link.label}`}
            className={({ isActive }) =>
              `revenue-section-link revenue-section-link-${link.state}${
                isActive ? ' revenue-section-link-active' : ''
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

export function RevenueWorkspaceCards({ cards }: { cards: RevenueWorkspaceCard[] }) {
  return (
    <div className="revenue-workspace-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article
            key={`${card.path}-${card.label}`}
            className="revenue-workspace-card revenue-workspace-card-restricted"
          >
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={`${card.path}-${card.label}`}
            className={`revenue-workspace-card revenue-workspace-card-${card.state}`}
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

export function RevenueStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`revenue-status-banner revenue-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function RevenueModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`revenue-module-state revenue-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function RevenueMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
}) {
  return (
    <div className={`revenue-mutation-notice revenue-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}

export function RevenueAuditCallout({
  title,
  body,
  links,
}: {
  title: string;
  body: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div className="revenue-audit-callout">
      <strong>{title}</strong>
      <p>{body}</p>
      <div className="revenue-audit-links">
        {links.map((link) => (
          <Link className="revenue-audit-link" key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
