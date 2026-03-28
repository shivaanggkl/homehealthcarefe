import { Link } from 'react-router-dom';
import { ApiError } from '../auth/session-api';

export function configurationAuditHref(daysBack = 7): string {
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return `/app/admin/audit?from=${from.toISOString().slice(0, 10)}`;
}

export function ConfigurationAuditNotice({
  subject,
  daysBack = 7,
}: {
  subject: string;
  daysBack?: number;
}) {
  return (
    <div className="callout-card">
      <strong>Audit-sensitive change</strong>
      <p>
        Updates to {subject} are logged by the backend. Review recent setup activity in the audit log when
        you need to confirm who changed what.
      </p>
      <Link className="text-link" to={configurationAuditHref(daysBack)}>
        Open recent audit activity
      </Link>
    </div>
  );
}

export function formatConfigurationError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return `This change could not be completed because the record is still in use or conflicts with an existing configuration. ${error.message}`;
    }
    if (error.status === 404) {
      return `The target record or scope is no longer available. ${error.message}`;
    }
    return error.message;
  }

  return fallbackMessage;
}

export function confirmDestructiveConfigurationAction(subject: string): boolean {
  return window.confirm(
    `Deactivate ${subject}? This change is audited, and in-use dependency checks may still block the operation.`,
  );
}
