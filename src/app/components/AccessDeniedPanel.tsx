import { Link } from 'react-router-dom';

export function AccessDeniedPanel({
  eyebrow = '403',
  title = 'Access denied',
  message,
  primaryLink = '/app',
  primaryLabel = 'Back to app',
  secondaryLink = '/app/settings/mfa',
  secondaryLabel = 'Go to personal MFA settings',
}: {
  eyebrow?: string;
  title?: string;
  message: string;
  primaryLink?: string;
  primaryLabel?: string;
  secondaryLink?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      <div className="button-row">
        <Link className="button" to={primaryLink}>
          {primaryLabel}
        </Link>
        <Link className="button button-secondary" to={secondaryLink}>
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
