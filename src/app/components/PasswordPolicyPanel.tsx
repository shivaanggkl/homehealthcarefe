import { useEffect, useState } from 'react';
import { fetchPasswordPolicy, PasswordPolicyResponse } from '../auth/session-api';

type PasswordPolicyPanelProps = {
  title?: string;
  description?: string;
  loadingLabel?: string;
  errorLabel?: string;
  futureReuseNote?: string | null;
};

export function PasswordPolicyPanel({
  title = 'Password requirements',
  description,
  loadingLabel = 'Loading password rules...',
  errorLabel = 'Unable to load password policy.',
  futureReuseNote = 'This same backend-driven component can be reused in invite acceptance and future credential setup flows.',
}: PasswordPolicyPanelProps) {
  const [policy, setPolicy] = useState<PasswordPolicyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextPolicy = await fetchPasswordPolicy();
        if (!active) {
          return;
        }
        setPolicy(nextPolicy);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : errorLabel);
      }
    })();

    return () => {
      active = false;
    };
  }, [errorLabel]);

  if (error) {
    return (
      <div className="note-card">
        <strong>{errorLabel}</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="note-card">
        <strong>{loadingLabel}</strong>
      </div>
    );
  }

  return (
    <div className="note-card">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      <ul className="check-list compact-list">
        <li>Minimum length: {policy.minimumLength} characters</li>
        {policy.requireUppercase ? <li>At least one uppercase letter</li> : null}
        {policy.requireLowercase ? <li>At least one lowercase letter</li> : null}
        {policy.requireDigit ? <li>At least one number</li> : null}
        {policy.requireSymbol ? <li>At least one symbol</li> : null}
        {policy.commonPasswordCheckEnabled ? <li>Common passwords are blocked</li> : null}
        {policy.preventReuseCount > 0 ? (
          <li>Cannot reuse the last {policy.preventReuseCount} passwords</li>
        ) : null}
      </ul>
      <p>{policy.summary}</p>
      {futureReuseNote ? <p>{futureReuseNote}</p> : null}
    </div>
  );
}
