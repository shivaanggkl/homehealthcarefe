import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function VisitTypeSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Visit types depend on the service line catalog, so this route sits in the same grouped setup area and uses the same CRUD scaffolding with one extra association field."
      eyebrow="Catalog Setup"
      formFields={[
        { label: 'Service Line', placeholder: 'Choose a service line', type: 'select', options: ['Private Duty', 'Skilled Nursing'] },
        { label: 'Name', placeholder: 'Private Duty Standard' },
        { label: 'Default Duration', placeholder: '60 minutes' },
        { label: 'Billable', placeholder: 'Choose billing behavior', type: 'select', options: ['Billable', 'Non-billable'] },
      ]}
      formHelper="This layout is ready for inline validation, dependent-field loading, and dependency-conflict handling from the backend."
      formTitle="Visit type form shell"
      path="/app/setup/catalog/visit-types"
      searchPlaceholder="Search visit types"
      tableColumns={['Name', 'Service Line', 'Default Duration', 'Status']}
      tableRows={[
        { id: 'std', cells: ['Private Duty Standard', 'Private Duty', '60 minutes', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Visit type catalog"
    />
  );
}
