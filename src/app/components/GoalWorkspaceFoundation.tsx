import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type GoalShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type GoalWorkspaceCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

export function GoalWorkspaceShell({
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
    <section className="goal-shell">
      <header className="goal-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="goal-shell-content">{children}</div>
    </section>
  );
}

export function GoalWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="goal-grid">{children}</div>;
}

export function GoalPanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel goal-panel">
      <div className="goal-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function GoalSectionNavigation({ links }: { links: GoalShellLink[] }) {
  return (
    <nav className="panel goal-section-nav" aria-label="Care progression sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span key={`${link.path}-${link.label}`} className="goal-section-link goal-section-link-restricted">
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={`${link.path}-${link.label}`}
            className={({ isActive }) =>
              `goal-section-link goal-section-link-${link.state}${isActive ? ' goal-section-link-active' : ''}`
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

export function GoalWorkspaceCards({ cards }: { cards: GoalWorkspaceCard[] }) {
  return (
    <div className="goal-workspace-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article key={`${card.path}-${card.label}`} className="goal-workspace-card goal-workspace-card-restricted">
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link key={`${card.path}-${card.label}`} className={`goal-workspace-card goal-workspace-card-${card.state}`} to={card.path}>
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>{card.state === 'read-only' ? 'Read only' : 'Open route'}</span>
          </Link>
        ),
      )}
    </div>
  );
}

export function GoalStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`goal-status-banner goal-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function GoalModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`goal-module-state goal-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function GoalMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
}) {
  return (
    <div className={`goal-mutation-notice goal-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}

export function GoalAuditCallout({
  title,
  summary,
  links,
}: {
  title: string;
  summary: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <aside className="goal-audit-callout" aria-label={title}>
      <strong>{title}</strong>
      <p>{summary}</p>
      <div className="goal-link-row">
        {links.map((link) => (
          <Link key={`${link.href}-${link.label}`} className="goal-inline-link" to={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
