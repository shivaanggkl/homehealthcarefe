import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function MileagePaySetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Mileage and pay settings are modeled as a structured settings module instead of a generic flat list, but they still inherit the same Epic 2 setup shell and responsive action layout."
      eyebrow="Compensation Setup"
      formFields={[
        { label: 'Reimbursement Strategy', placeholder: 'Choose a strategy', type: 'select', options: ['Standard Rate', 'Custom Rate'] },
        { label: 'Mileage Rate', placeholder: '0.6700' },
        { label: 'Travel Pay', placeholder: 'Choose travel pay behavior', type: 'select', options: ['Enabled', 'Disabled'] },
        { label: 'Visit Type Adjustments', placeholder: 'Optional structured JSON adjustments', type: 'textarea' },
      ]}
      formHelper="This scaffold keeps agency-default and branch-override editing readable on tablet and small laptop widths."
      formTitle="Mileage and pay form shell"
      path="/app/setup/compensation/mileage-pay"
      searchPlaceholder="Search reimbursement settings"
      tableColumns={['Scope', 'Strategy', 'Mileage Rate', 'Status']}
      tableRows={[
        { id: 'agency-default', cells: ['Agency Default', 'Standard Rate', '0.6700', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
        { id: 'chi-override', cells: ['Chicago Override', 'Custom Rate', '0.7200', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Mileage and pay settings"
    />
  );
}
