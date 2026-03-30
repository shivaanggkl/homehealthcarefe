import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { MessagingEscalationStatus, MessagingThreadSummary } from '../auth/session-api';

export type MessagingThreadMeta = {
  participantSummary?: string;
  unread?: boolean;
  contextLabel?: string;
  readSummary?: string;
};

export type MessagingShellLink = {
  path: string;
  label: string;
  state: 'available' | 'read-only' | 'restricted';
};

export function MessagingWorkspaceShell({
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
    <section className="messaging-shell">
      <header className="messaging-shell-hero hero-card">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="messaging-shell-content">{children}</div>
    </section>
  );
}

export function MessagingWorkspaceGrid({ children }: PropsWithChildren) {
  return <div className="messaging-grid">{children}</div>;
}

export function MessagingPanel({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <article className="panel messaging-panel">
      <div className="messaging-panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </article>
  );
}

export function MessagingSectionNavigation({ links }: { links: MessagingShellLink[] }) {
  return (
    <nav className="panel messaging-section-nav" aria-label="Messaging sections">
      {links.map((link) =>
        link.state === 'restricted' ? (
          <span key={link.path} className="messaging-section-link messaging-section-link-restricted">
            <span>{link.label}</span>
            <small>Restricted</small>
          </span>
        ) : (
          <NavLink
            key={link.path}
            className={({ isActive }) =>
              `messaging-section-link messaging-section-link-${link.state}${
                isActive ? ' messaging-section-link-active' : ''
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

export function MessagingModuleState({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description: string;
  variant?: 'info' | 'empty' | 'readonly' | 'error';
}) {
  return (
    <div className={`messaging-module-state messaging-module-state-${variant}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function MessagingStatusBanner({
  status,
  summary,
  tone = 'info',
}: {
  status: string;
  summary: string;
  tone?: 'info' | 'success' | 'warning' | 'readonly';
}) {
  return (
    <div className={`messaging-status-banner messaging-status-banner-${tone}`}>
      <strong>{status}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function MessagingMutationNotice({
  state,
  message,
}: {
  state: 'idle' | 'saving' | 'saved' | 'retry';
  message: string;
}) {
  return (
    <div className={`messaging-mutation-notice messaging-mutation-notice-${state}`}>
      <strong>{state === 'saved' ? 'Saved' : state === 'retry' ? 'Retry needed' : 'Mutation status'}</strong>
      <p>{message}</p>
    </div>
  );
}

export function MessagingThreadList({
  threads,
  selectedThreadId,
  emptyLabel,
  threadMeta,
}: {
  threads: MessagingThreadSummary[];
  selectedThreadId?: string;
  emptyLabel: string;
  threadMeta?: Record<string, MessagingThreadMeta>;
}) {
  if (threads.length === 0) {
    return <MessagingModuleState title="No conversations yet" description={emptyLabel} variant="empty" />;
  }

  return (
    <div className="messaging-thread-list">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          className={`messaging-thread-card${selectedThreadId === thread.id ? ' messaging-thread-card-active' : ''}`}
          to={`/app/messaging/threads/${thread.id}`}
        >
          <div className="messaging-thread-card-header">
            <strong>{thread.subject || defaultThreadLabel(thread)}</strong>
            <MessagingEscalationBadge escalationStatus={thread.escalationStatus} />
          </div>
          <p className="messaging-thread-card-context">
            {threadMeta?.[thread.id]?.contextLabel ?? thread.threadType.replace('_', ' ')}
          </p>
          {threadMeta?.[thread.id]?.participantSummary ? (
            <p className="messaging-thread-card-participants">{threadMeta[thread.id]?.participantSummary}</p>
          ) : null}
          <div className="messaging-thread-card-meta">
            <span>{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : 'No messages yet'}</span>
            <MessagingUnreadBadge unread={threadMeta?.[thread.id]?.unread ?? thread.escalationStatus !== 'NORMAL'} />
          </div>
          {threadMeta?.[thread.id]?.readSummary ? (
            <p className="messaging-thread-card-read-summary">{threadMeta[thread.id]?.readSummary}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function MessagingThreadDetailFrame({
  title,
  helper,
  children,
}: PropsWithChildren<{ title: string; helper: string }>) {
  return (
    <section className="messaging-thread-detail-frame">
      <header className="messaging-thread-detail-header">
        <div>
          <h4>{title}</h4>
          <p>{helper}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function MessagingContextBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'patient' | 'visit' | 'task' | 'broadcast';
}) {
  return <span className={`messaging-context-badge messaging-context-badge-${tone}`}>{label}</span>;
}

export function MessagingUnreadBadge({ unread }: { unread: boolean }) {
  return <span className={`messaging-unread-badge${unread ? ' messaging-unread-badge-active' : ''}`}>{unread ? 'Needs attention' : 'Read'}</span>;
}

export function MessagingEscalationBadge({
  escalationStatus,
}: {
  escalationStatus: MessagingEscalationStatus;
}) {
  return (
    <span className={`messaging-escalation-badge messaging-escalation-badge-${escalationStatus.toLowerCase()}`}>
      {escalationStatus === 'NORMAL' ? 'Normal' : escalationStatus}
    </span>
  );
}

function defaultThreadLabel(thread: MessagingThreadSummary) {
  if (thread.patientId) {
    return 'Patient coordination';
  }
  if (thread.visitOccurrenceId) {
    return 'Visit discussion';
  }
  return 'Secure conversation';
}
