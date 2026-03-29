import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import {
  ScheduleBoardItem,
  ScheduleBoardView,
  SchedulingVisitStatus,
} from '../auth/session-api';

type SchedulingWorkspaceShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

type SchedulingPanelProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

type SchedulingBoardHeaderProps = {
  view: ScheduleBoardView;
  windowStart: string;
  windowEnd: string;
  onPrevious: () => void;
  onNext: () => void;
  onViewChange: (view: ScheduleBoardView) => void;
  openShiftsOnly: boolean;
  onOpenShiftsOnlyChange: (checked: boolean) => void;
};

type SchedulingVisitCardProps = {
  item: ScheduleBoardItem;
  to: string;
};

type SchedulingDrawerProps = PropsWithChildren<{
  title: string;
  description: string;
  onClose: () => void;
}>;

type SchedulingModuleStateProps = {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
};

type SchedulingMutationFrameProps = PropsWithChildren<{
  title: string;
  helper: string;
  mode: 'editable' | 'read-only';
  tone?: 'success' | 'conflict' | 'warning';
  toneMessage?: string;
}>;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatWindow(start: string, end: string): string {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function statusClass(status: SchedulingVisitStatus): string {
  return status.toLowerCase().replace('_', '-');
}

export function SchedulingWorkspaceShell({
  eyebrow,
  title,
  description,
  children,
}: SchedulingWorkspaceShellProps) {
  return (
    <section className="scheduling-shell">
      <header className="scheduling-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="scheduling-shell-content">{children}</div>
    </section>
  );
}

export function SchedulingWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="scheduling-workspace-grid">{children}</div>;
}

export function SchedulingPanel({
  title,
  description,
  children,
}: SchedulingPanelProps) {
  return (
    <article className="panel scheduling-panel">
      <div className="scheduling-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function SchedulingBoardHeader({
  view,
  windowStart,
  windowEnd,
  onPrevious,
  onNext,
  onViewChange,
  openShiftsOnly,
  onOpenShiftsOnlyChange,
}: SchedulingBoardHeaderProps) {
  return (
    <div className="scheduling-board-toolbar">
      <div className="scheduling-view-switcher" role="tablist" aria-label="Schedule board view">
        {(['DAY', 'WEEK', 'MONTH'] as ScheduleBoardView[]).map((candidate) => (
          <button
            key={candidate}
            className={`button ${
              candidate === view ? '' : 'button-secondary'
            } scheduling-view-button`}
            onClick={() => onViewChange(candidate)}
            role="tab"
            type="button"
          >
            {candidate}
          </button>
        ))}
      </div>
      <div className="scheduling-window-controls">
        <button className="button button-secondary" onClick={onPrevious} type="button">
          Previous
        </button>
        <div className="scheduling-window-summary">
          <span className="eyebrow">Current range</span>
          <strong>{formatWindow(windowStart, windowEnd)}</strong>
        </div>
        <button className="button button-secondary" onClick={onNext} type="button">
          Next
        </button>
      </div>
      <label className="scheduling-checkbox">
        <input
          checked={openShiftsOnly}
          onChange={(event) => onOpenShiftsOnlyChange(event.target.checked)}
          type="checkbox"
        />
        <span>Only show open shifts</span>
      </label>
    </div>
  );
}

export function SchedulingVisitCard({ item, to }: SchedulingVisitCardProps) {
  return (
    <Link className="scheduling-visit-card" to={to}>
      <div className="scheduling-visit-card-header">
        <strong>{item.patientDisplayName}</strong>
        <span className={`status-pill status-${statusClass(item.status)}`}>{item.status}</span>
      </div>
      <p className="scheduling-visit-card-time">
        {formatDateTime(item.plannedStartAt)} to {formatDateTime(item.plannedEndAt)}
      </p>
      <dl className="scheduling-visit-card-meta">
        <div>
          <dt>Open shift</dt>
          <dd>{item.openShift ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{item.priority ?? 'Standard'}</dd>
        </div>
        <div>
          <dt>Assigned caregiver</dt>
          <dd>{item.activeCaregiverProfileId ? 'Assigned' : 'Unassigned'}</dd>
        </div>
      </dl>
      <span className="scheduling-visit-card-cta">Open details</span>
    </Link>
  );
}

export function SchedulingDetailDrawer({
  title,
  description,
  onClose,
  children,
}: SchedulingDrawerProps) {
  return (
    <aside className="panel scheduling-detail-drawer" aria-label="Schedule detail drawer">
      <div className="scheduling-detail-header">
        <div>
          <span className="eyebrow">Schedule detail</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button className="button button-secondary" onClick={onClose} type="button">
          Close
        </button>
      </div>
      {children}
    </aside>
  );
}

export function SchedulingModuleState({
  title,
  description,
  variant = 'info',
}: SchedulingModuleStateProps) {
  return (
    <div className={`scheduling-module-state scheduling-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function SchedulingMutationFrame({
  title,
  helper,
  mode,
  tone,
  toneMessage,
  children,
}: SchedulingMutationFrameProps) {
  return (
    <article className="panel scheduling-mutation-frame">
      <div className="scheduling-panel-header">
        <h3>{title}</h3>
        <p>{helper}</p>
      </div>
      <div className="scheduling-form-mode">
        <span className={`scheduling-mode-badge scheduling-mode-badge-${mode}`}>
          {mode === 'editable' ? 'Editable scheduling action' : 'Read-only scheduling action'}
        </span>
        <p>
          Epic 5 uses one shared mutation layout for visit creation, edits, and later assignment or
          reschedule flows so validation, conflict messaging, and refresh behavior stay consistent.
        </p>
      </div>
      {tone && toneMessage ? (
        <div className={`scheduling-action-banner scheduling-action-banner-${tone}`}>
          <strong>{tone === 'conflict' ? 'Action blocked' : tone === 'warning' ? 'Check before saving' : 'Saved'}</strong>
          <p>{toneMessage}</p>
        </div>
      ) : null}
      {children}
    </article>
  );
}
