import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type ReviewShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type ReviewWorkspaceCard = {
  path: string;
  label: string;
  description: string;
  state: 'available' | 'read-only' | 'restricted';
};

export type ReviewQueueListItem = {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  meta: string[];
  status: string;
  statusTone?: 'default' | 'warning' | 'success';
  counts?: string[];
};

export function ReviewWorkspaceShell({
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
    <section className="review-shell">
      <header className="review-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="review-shell-content">{children}</div>
    </section>
  );
}

export function ReviewWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="review-grid">{children}</div>;
}

export function ReviewPanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel review-panel">
      <div className="review-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function ReviewSectionNavigation({ links }: { links: ReviewShellLink[] }) {
  return (
    <nav className="panel review-section-nav" aria-label="Review sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span key={`${link.path}-${link.label}`} className="review-section-link review-section-link-restricted">
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={`${link.path}-${link.label}`}
            className={({ isActive }) =>
              `review-section-link review-section-link-${link.state}${
                isActive ? ' review-section-link-active' : ''
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

export function ReviewWorkspaceCards({ cards }: { cards: ReviewWorkspaceCard[] }) {
  return (
    <div className="review-workspace-cards">
      {cards.map((card) =>
        card.state === 'restricted' ? (
          <article key={`${card.path}-${card.label}`} className="review-workspace-card review-workspace-card-restricted">
            <strong>{card.label}</strong>
            <p>{card.description}</p>
            <span>Restricted</span>
          </article>
        ) : (
          <Link
            key={`${card.path}-${card.label}`}
            className={`review-workspace-card review-workspace-card-${card.state}`}
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

export function ReviewStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`review-status-banner review-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function ReviewModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`review-module-state review-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function ReviewMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
}) {
  return (
    <div className={`review-mutation-notice review-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}

export function ReviewQueueList({ items }: { items: ReviewQueueListItem[] }) {
  return (
    <div className="review-queue-list">
      {items.map((item) => (
        <Link key={item.id} className="review-queue-card" to={item.path}>
          <div className="review-queue-card-header">
            <div>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
            </div>
            <span className={`review-status-pill review-status-pill-${item.statusTone ?? 'default'}`}>
              {item.status}
            </span>
          </div>
          <div className="review-inline-list">
            {item.meta.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
          {item.counts && item.counts.length > 0 ? (
            <div className="review-inline-list review-inline-list-strong">
              {item.counts.map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function ReviewSourceContextSummary({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="review-definition-list">
      {rows.map((row) => (
        <div className="review-definition-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewFindingList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: string; headline: string; detail: string; severity: string }>;
}) {
  return (
    <section className="review-finding-group">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <ReviewModuleState
          title="No entries"
          description={emptyLabel}
          variant="empty"
        />
      ) : (
        <div className="review-finding-list">
          {items.map((item) => (
            <article className="review-finding-row" key={item.id}>
              <div>
                <strong>{item.headline}</strong>
                <p>{item.detail}</p>
              </div>
              <span className="review-severity-pill">{item.severity}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
