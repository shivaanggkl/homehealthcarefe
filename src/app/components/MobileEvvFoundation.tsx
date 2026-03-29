import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  EvvComplianceOutcome,
  EvvVerificationStatus,
  GeofenceEvaluationOutcome,
  MobileEvvSummaryResponse,
} from '../auth/session-api';
import { MobileModuleState, MobileMutationFrame, MobileSyncVisualState } from './MobileWorkspaceFoundation';

type MobileEvvRouteKey = 'execution' | 'evv' | 'missed-visit' | 'exception';

export function MobileEvvRouteTabs({
  visitId,
}: {
  visitId: string;
}) {
  const tabs: { key: MobileEvvRouteKey; label: string; to: string }[] = [
    { key: 'execution', label: 'Execution', to: `/mobile/visits/${visitId}` },
    { key: 'evv', label: 'EVV', to: `/mobile/visits/${visitId}/evv` },
    { key: 'missed-visit', label: 'Missed Visit', to: `/mobile/visits/${visitId}/evv/missed-visit` },
    { key: 'exception', label: 'Exception', to: `/mobile/visits/${visitId}/evv/exception` },
  ];

  return (
    <nav aria-label="Visit workflow sections" className="mobile-evv-tabs">
      {tabs.map((tab) => (
        <NavLink
          className={({ isActive }) => `mobile-evv-tab${isActive ? ' mobile-evv-tab-active' : ''}`}
          key={tab.key}
          to={tab.to}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

function statusTone(
  complianceOutcome: EvvComplianceOutcome,
): 'ok' | 'warning' | 'blocked' {
  switch (complianceOutcome) {
    case 'READY':
      return 'ok';
    case 'READY_WITH_WARNING':
      return 'warning';
    case 'BLOCKED':
    case 'MISSED_VISIT':
      return 'blocked';
  }
}

function statusLabel(
  verificationStatus: EvvVerificationStatus,
  complianceOutcome: EvvComplianceOutcome,
) {
  if (complianceOutcome === 'MISSED_VISIT') {
    return 'Missed visit reported';
  }
  switch (verificationStatus) {
    case 'VERIFIED':
      return 'Verified';
    case 'VERIFIED_WITH_WARNING':
      return 'Verified with warning';
    case 'EXCEPTION_OPEN':
      return 'Exception open';
    case 'EXCEPTION_ACKNOWLEDGED':
      return 'Exception acknowledged';
    case 'ESCALATED':
      return 'Escalated';
    case 'RESOLVED':
      return 'Resolved';
    case 'MISSED_VISIT_REPORTED':
      return 'Missed visit reported';
    case 'PENDING_VERIFICATION':
      return 'Pending verification';
  }
}

function geofenceLabel(outcome: GeofenceEvaluationOutcome) {
  switch (outcome) {
    case 'WITHIN_TOLERANCE':
      return 'Within tolerance';
    case 'OUTSIDE_TOLERANCE_WARNING':
      return 'Warning';
    case 'OUTSIDE_TOLERANCE_BLOCKED':
      return 'Blocked';
    case 'NOT_EVALUABLE':
      return 'Not evaluable';
  }
}

export function MobileEvvSummaryCard({
  summary,
  compact = false,
}: {
  summary: MobileEvvSummaryResponse;
  compact?: boolean;
}) {
  const tone = statusTone(summary.complianceOutcome);
  return (
    <section className={`mobile-evv-summary mobile-evv-summary-${tone}`}>
      <div className="mobile-evv-summary-header">
        <div>
          <span className="eyebrow">Epic 7 EVV</span>
          <h3>{statusLabel(summary.verificationStatus, summary.complianceOutcome)}</h3>
          <p>
            Proof-of-visit status stays mobile-readable and avoids raw policy internals.
          </p>
        </div>
        <span className={`mobile-status-pill mobile-status-pill-${tone}`}>
          {summary.complianceOutcome.split('_').join(' ')}
        </span>
      </div>
      <dl className="mobile-summary-list">
        <div>
          <dt>Clock-in</dt>
          <dd>{summary.startEventPresent ? 'Captured' : 'Pending'}</dd>
        </div>
        <div>
          <dt>Clock-out</dt>
          <dd>{summary.endEventPresent ? 'Captured' : 'Pending'}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{geofenceLabel(summary.geofenceOutcome)}</dd>
        </div>
        <div>
          <dt>Signature</dt>
          <dd>{summary.signatureComplete ? 'Complete' : 'Pending'}</dd>
        </div>
        <div>
          <dt>Open exceptions</dt>
          <dd>{summary.openExceptionCount}</dd>
        </div>
        <div>
          <dt>Missed visit</dt>
          <dd>{summary.missedVisitReported ? 'Reported' : 'No'}</dd>
        </div>
      </dl>
      {!compact && summary.warnings.length ? (
        <div className="mobile-inline-note">
          <strong>Warnings</strong>
          <p>{summary.warnings.join(' · ')}</p>
        </div>
      ) : null}
      {!compact && summary.blockers.length ? (
        <div className="mobile-module-state mobile-module-state-error">
          <strong>Blocking items</strong>
          <p>{summary.blockers.join(' · ')}</p>
        </div>
      ) : null}
    </section>
  );
}

export function MobileEvvActionFramework({
  title,
  helper,
  syncState,
  syncMessage,
  mode,
  children,
}: {
  title: string;
  helper: string;
  syncState: MobileSyncVisualState;
  syncMessage: string;
  mode: 'editable' | 'read-only';
  children: ReactNode;
}) {
  return (
    <MobileMutationFrame
      helper={helper}
      mode={mode}
      syncMessage={syncMessage}
      syncState={syncState}
      title={title}
    >
      <div className="mobile-evv-action-stack">{children}</div>
    </MobileMutationFrame>
  );
}

export function MobileEvvDeferredState({
  title,
  description,
  ctaLabel,
  ctaTo,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="mobile-evv-deferred">
      <MobileModuleState description={description} title={title} variant="info" />
      {ctaLabel && ctaTo ? (
        <Link className="button button-secondary" to={ctaTo}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
