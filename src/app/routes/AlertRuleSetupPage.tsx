import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function AlertRuleSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Alert rules combine scope, thresholds, and delivery behavior. This scaffold sets the layout for those denser controls while keeping the route usable on smaller viewports."
      eyebrow="Policy Setup"
      formFields={[
        { label: 'Scope', placeholder: 'Choose rule scope', type: 'select', options: ['Agency-wide', 'Branch-specific'] },
        { label: 'Name', placeholder: 'Late Arrival Alert' },
        { label: 'Rule Type', placeholder: 'Choose rule type', type: 'select', options: ['Late Arrival', 'Missed Visit'] },
        { label: 'Configuration Payload', placeholder: 'Structured JSON payload', type: 'textarea' },
      ]}
      formHelper="The final screen can add delivery toggles and threshold controls without changing the base form and confirmation pattern."
      formTitle="Alert rule form shell"
      path="/app/setup/policies/alerts"
      searchPlaceholder="Search alert rules"
      tableColumns={['Name', 'Scope', 'Rule Type', 'Status']}
      tableRows={[
        { id: 'late-arrival', cells: ['Late Arrival Alert', 'Chicago', 'Late Arrival', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Alert rules"
    />
  );
}
