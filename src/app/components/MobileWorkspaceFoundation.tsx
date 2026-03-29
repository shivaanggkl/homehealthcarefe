import { PropsWithChildren, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MobileCareInstructionSummary,
  MobileHomeTodayWorkItem,
  MobilePatientSummary,
} from '../auth/session-api';

export type MobileSyncVisualState = 'idle' | 'queued' | 'syncing' | 'synced' | 'failed';

type MobileShellNavItem = {
  to: string;
  label: string;
};

type MobileAppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  syncState: MobileSyncVisualState;
  syncMessage: string;
  headerAction?: ReactNode;
  navItems: MobileShellNavItem[];
}>;

type MobilePanelProps = PropsWithChildren<{
  title: string;
  description: string;
  tone?: 'default' | 'accent';
}>;

type MobileModuleStateProps = {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
};

type MobileActionFooterProps = {
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  primaryTone?: 'default' | 'success';
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  secondaryDisabled?: boolean;
};

type MobileMutationFrameProps = PropsWithChildren<{
  title: string;
  helper: string;
  mode: 'editable' | 'read-only';
  syncState: MobileSyncVisualState;
  syncMessage: string;
}>;

export function MobileAppShell({
  eyebrow,
  title,
  description,
  syncState,
  syncMessage,
  headerAction,
  navItems,
  children,
}: MobileAppShellProps) {
  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {headerAction ? <div className="mobile-topbar-action">{headerAction}</div> : null}
      </header>

      <div className={`mobile-sync-banner mobile-sync-banner-${syncState}`}>
        <strong>Sync state</strong>
        <span>{syncMessage}</span>
      </div>

      <main className="mobile-content">{children}</main>

      <nav aria-label="Mobile navigation" className="mobile-tabbar">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `mobile-tablink${isActive ? ' mobile-tablink-active' : ''}`
            }
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function MobilePanel({
  title,
  description,
  tone = 'default',
  children,
}: MobilePanelProps) {
  return (
    <section className={`mobile-panel mobile-panel-${tone}`}>
      <div className="mobile-panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export function MobileModuleState({
  title,
  description,
  variant = 'info',
}: MobileModuleStateProps) {
  return (
    <div className={`mobile-module-state mobile-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function MobileVisitCard({
  item,
  to,
  emphasis,
}: {
  item: MobileHomeTodayWorkItem;
  to: string;
  emphasis?: 'current' | 'upcoming' | 'completed';
}) {
  return (
    <NavLink className={`mobile-visit-card${emphasis ? ` mobile-visit-card-${emphasis}` : ''}`} to={to}>
      <div className="mobile-visit-card-header">
        <strong>{item.patientDisplaySummary}</strong>
        <span className="mobile-status-pill">{item.scheduleStatus}</span>
      </div>
      <p className="mobile-visit-card-time">
        {formatDateTime(item.plannedStartAt)} to {formatDateTime(item.plannedEndAt)}
      </p>
      <dl className="mobile-visit-card-meta">
        <div>
          <dt>Branch</dt>
          <dd>{item.branchName ?? 'Assigned branch'}</dd>
        </div>
        <div>
          <dt>Route order</dt>
          <dd>{item.routeOrder ?? 'Timing based'}</dd>
        </div>
        <div>
          <dt>Execution</dt>
          <dd>{item.executionStatus ?? 'Not started'}</dd>
        </div>
      </dl>
      <span className="mobile-visit-card-cta">Open visit</span>
    </NavLink>
  );
}

export function MobileVisitDetailLayout({
  patientSummary,
  careInstructions,
  children,
}: PropsWithChildren<{
  patientSummary: MobilePatientSummary;
  careInstructions: MobileCareInstructionSummary;
}>) {
  return (
    <div className="mobile-visit-detail">
      <MobilePanel
        description="Mobile-safe patient summary for the assigned caregiver only."
        title={patientSummary.patientDisplaySummary}
        tone="accent"
      >
        <dl className="mobile-summary-list">
          <div>
            <dt>Date of birth</dt>
            <dd>{patientSummary.dateOfBirth}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{patientSummary.addressSummary ?? 'No mobile-safe address on file'}</dd>
          </div>
          <div>
            <dt>Service line</dt>
            <dd>{patientSummary.serviceLineSummary ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Visit type</dt>
            <dd>{patientSummary.visitTypeSummary ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Payer</dt>
            <dd>{patientSummary.payerSnippet ?? 'Not shown'}</dd>
          </div>
        </dl>
        {patientSummary.contactSummary ? (
          <div className="mobile-inline-note">
            <strong>Primary contact</strong>
            <p>
              {patientSummary.contactSummary.fullName}
              {patientSummary.contactSummary.relationshipType
                ? ` · ${patientSummary.contactSummary.relationshipType}`
                : ''}
              {patientSummary.contactSummary.phone
                ? ` · ${patientSummary.contactSummary.phone}`
                : ''}
            </p>
          </div>
        ) : null}
      </MobilePanel>

      <MobilePanel
        description="Instruction blocks are split so the caregiver only sees the field-usable context."
        title="Care instructions"
      >
        <div className="mobile-instruction-stack">
          <div>
            <span className="eyebrow">Visit type</span>
            <p>{careInstructions.visitTypeInstructions ?? 'No visit-type instructions.'}</p>
          </div>
          <div>
            <span className="eyebrow">Service line</span>
            <p>{careInstructions.serviceLineInstructions ?? 'No service-line instructions.'}</p>
          </div>
          <div>
            <span className="eyebrow">Branch</span>
            <p>{careInstructions.branchInstructions ?? 'No branch instructions.'}</p>
          </div>
          <div>
            <span className="eyebrow">Patient notes</span>
            <p>{careInstructions.patientSpecificCareNotes ?? 'No patient-specific care notes.'}</p>
          </div>
        </div>
      </MobilePanel>

      {children}
    </div>
  );
}

export function MobileActionFooter({
  primaryLabel,
  onPrimaryClick,
  primaryDisabled,
  primaryTone = 'default',
  secondaryLabel,
  onSecondaryClick,
  secondaryDisabled,
}: MobileActionFooterProps) {
  return (
    <div className="mobile-action-footer">
      <button
        className={`button${primaryTone === 'success' ? ' mobile-button-success' : ''}`}
        disabled={primaryDisabled}
        onClick={onPrimaryClick}
        type="button"
      >
        {primaryLabel}
      </button>
      {secondaryLabel ? (
        <button
          className="button button-secondary"
          disabled={secondaryDisabled}
          onClick={onSecondaryClick}
          type="button"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function MobileMutationFrame({
  title,
  helper,
  mode,
  syncState,
  syncMessage,
  children,
}: MobileMutationFrameProps) {
  return (
    <MobilePanel
      description={helper}
      title={title}
    >
      <div className="mobile-mutation-header">
        <span className={`mobile-mode-badge mobile-mode-badge-${mode}`}>
          {mode === 'editable' ? 'Editable field action' : 'Read-only field action'}
        </span>
        <span className={`mobile-sync-chip mobile-sync-chip-${syncState}`}>{syncMessage}</span>
      </div>
      {children}
    </MobilePanel>
  );
}
