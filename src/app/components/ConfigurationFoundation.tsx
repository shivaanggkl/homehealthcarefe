import { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppRouteDefinition } from '../access/access-control';

export function ConfigurationPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <section className="config-shell">
      <div className="config-hero">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actions ? <div className="config-hero-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ConfigurationWorkspace({
  children,
}: PropsWithChildren) {
  return <div className="config-workspace">{children}</div>;
}

export function ConfigurationPanel({
  title,
  description,
  aside,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
  aside?: ReactNode;
}>) {
  return (
    <section className="panel config-panel">
      <header className="config-panel-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {aside ? <div className="config-panel-aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function ConfigurationTableScaffold({
  searchPlaceholder,
  rows,
  columns,
  emptyTitle,
  emptyMessage,
}: {
  searchPlaceholder: string;
  rows: Array<{
    id: string;
    cells: string[];
    status: string;
    actionLabel: string;
  }>;
  columns: string[];
  emptyTitle: string;
  emptyMessage: string;
}) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) minmax(170px, auto)`,
  } satisfies CSSProperties;

  return (
    <div className="config-table-scaffold">
      <div className="toolbar-grid">
        <label className="field field-light">
          <span>Search</span>
          <input className="input input-light" placeholder={searchPlaceholder} readOnly value="" />
        </label>
        <label className="field field-light">
          <span>Status</span>
          <select className="input input-light" defaultValue="ACTIVE">
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All</option>
          </select>
        </label>
      </div>
      <div className="config-table">
        <div className="config-table-row config-table-row-header" style={gridStyle}>
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
          <span>Actions</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state-card">
            <strong>{emptyTitle}</strong>
            <p>{emptyMessage}</p>
          </div>
        ) : (
          rows.map((row) => (
            <div className="config-table-row" key={row.id} style={gridStyle}>
              {row.cells.map((cell, index) => (
                <span key={`${row.id}-${index}`}>{cell}</span>
              ))}
              <div className="config-row-actions">
                <span className={`status-pill status-${row.status.toLowerCase()}`}>{row.status}</span>
                <button className="button button-secondary button-small" type="button">
                  {row.actionLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ConfigurationFormScaffold({
  title,
  helper,
  fields,
}: {
  title: string;
  helper: string;
  fields: Array<{
    label: string;
    placeholder: string;
    type?: 'text' | 'textarea' | 'select';
    options?: string[];
  }>;
}) {
  return (
    <div className="config-form-scaffold">
      <div className="callout-card">
        <strong>{title}</strong>
        <p>{helper}</p>
      </div>
      <form className="stack-form stack-form-light">
        {fields.map((field) => (
          <label className="field field-light" key={field.label}>
            <span>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea className="input input-light config-textarea" placeholder={field.placeholder} />
            ) : field.type === 'select' ? (
              <select className="input input-light" defaultValue="">
                <option value="" disabled>
                  {field.placeholder}
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input input-light" placeholder={field.placeholder} />
            )}
          </label>
        ))}
        <div className="button-row">
          <button className="button" type="button">
            Save Draft Pattern
          </button>
          <button className="button button-secondary" type="button">
            Secondary Action
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConfigurationModuleCards({
  routes,
}: {
  routes: AppRouteDefinition[];
}) {
  return (
    <div className="config-module-grid">
      {routes.map((route) => (
        <article className="config-module-card" key={route.path}>
          <div className="config-module-card-header">
            <strong>{route.navLabel}</strong>
            {route.audience ? (
              <span className={`config-audience-tag config-audience-${route.audience}`}>
                {route.audience === 'owner-only' ? 'Owner only' : 'Admin'}
              </span>
            ) : null}
          </div>
          <p>{route.description}</p>
          <Link className="text-link config-module-link" to={route.path}>
            Open module
          </Link>
        </article>
      ))}
    </div>
  );
}
