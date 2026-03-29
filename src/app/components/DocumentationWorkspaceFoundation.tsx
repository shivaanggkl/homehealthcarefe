import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type DocumentationShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type DocumentationModuleCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

export function DocumentationWorkspaceShell({
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
    <section className="documentation-shell">
      <header className="documentation-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="documentation-shell-content">{children}</div>
    </section>
  );
}

export function DocumentationWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="documentation-grid">{children}</div>;
}

export function DocumentationPanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel documentation-panel">
      <div className="documentation-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function DocumentationSectionNavigation({
  links,
}: {
  links: DocumentationShellLink[];
}) {
  return (
    <nav className="panel documentation-section-nav" aria-label="Documentation sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span key={link.path} className="documentation-section-link documentation-section-link-restricted">
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={link.path}
            className={({ isActive }) =>
              `documentation-section-link documentation-section-link-${link.state}${
                isActive ? ' documentation-section-link-active' : ''
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

export function DocumentationModuleCards({ cards }: { cards: DocumentationModuleCard[] }) {
  return (
    <div className="documentation-module-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article key={card.path} className="documentation-module-card documentation-module-card-restricted">
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={card.path}
            className={`documentation-module-card documentation-module-card-${card.state}`}
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

export function DocumentationStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`documentation-status-banner documentation-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function DocumentationModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`documentation-module-state documentation-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function DocumentationEditorFrame({
  title,
  helper,
  mode,
  children,
}: PropsWithChildren<{
  title: string;
  helper: string;
  mode: 'caregiver-edit' | 'admin-edit' | 'read-only';
}>) {
  return (
    <section className={`documentation-editor-frame documentation-editor-frame-${mode}`}>
      <header className="documentation-editor-frame-header">
        <div>
          <h4>{title}</h4>
          <p>{helper}</p>
        </div>
        <span className="documentation-editor-mode">{mode.replace('-', ' ')}</span>
      </header>
      {children}
    </section>
  );
}

export function DocumentationMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry' | 'submitting';
  message: string;
}) {
  return (
    <div className={`documentation-mutation-notice documentation-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}
