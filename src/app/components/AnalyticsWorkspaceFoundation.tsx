import { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Tone = 'info' | 'success' | 'warning' | 'readonly';

export function AnalyticsWorkspaceShell({
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
    <section className="analytics-shell">
      <header className="analytics-hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export function AnalyticsWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="analytics-grid">{children}</div>;
}

export function AnalyticsPanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <section className="analytics-panel">
      <header className="analytics-panel-header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function AnalyticsStatusBanner({
  status,
  summary,
  tone,
}: {
  status: string;
  summary: string;
  tone: Tone;
}) {
  return (
    <article className={`analytics-status-banner analytics-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </article>
  );
}

export function AnalyticsModuleState({
  title,
  description,
  variant,
}: {
  title: string;
  description: string;
  variant: 'empty' | 'error' | 'readonly';
}) {
  return (
    <div className={`analytics-module-state analytics-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function AnalyticsMutationNotice({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: 'idle' | 'saving' | 'saved' | 'retry';
}) {
  return (
    <div className={`analytics-mutation-notice analytics-mutation-notice-${state}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function AnalyticsSectionNavigation({
  items,
}: {
  items: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <nav aria-label="Analytics sections" className="analytics-section-nav">
      {items.map((item) => (
        <Link
          className={`analytics-section-link${item.active ? ' analytics-section-link-active' : ''}`}
          key={item.href}
          to={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AnalyticsFilterBar({ children }: PropsWithChildren) {
  return <div className="analytics-filter-grid">{children}</div>;
}

export function AnalyticsActionRow({ children }: PropsWithChildren) {
  return <div className="analytics-action-row">{children}</div>;
}

export function AnalyticsAuditCallout({
  title,
  body,
  links,
}: {
  title: string;
  body: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div className="analytics-audit-callout">
      <strong>{title}</strong>
      <p>{body}</p>
      <div className="analytics-audit-links">
        {links.map((link) => (
          <Link className="analytics-audit-link" key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return (
      <AnalyticsModuleState
        title="No records match the current filters."
        description={emptyMessage}
        variant="empty"
      />
    );
  }

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`row-${index + 1}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${index + 1}-${cellIndex + 1}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
