import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function TaskTemplateSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Task templates share the Epic 2 template-management pattern. This foundation gives later screens a consistent place for category, service-line, and visit-type relationships."
      eyebrow="Template Setup"
      formFields={[
        { label: 'Name', placeholder: 'Medication Reminder' },
        { label: 'Code', placeholder: 'MED-REM' },
        { label: 'Category', placeholder: 'Select a category', type: 'select', options: ['Clinical', 'Operational'] },
        { label: 'Description', placeholder: 'Reusable task guidance', type: 'textarea' },
      ]}
      formHelper="Later template editing can grow into more complex definitions without breaking the shared list and form shell."
      formTitle="Task template form shell"
      path="/app/setup/templates/tasks"
      searchPlaceholder="Search task templates"
      tableColumns={['Name', 'Category', 'Linked Scope', 'Status']}
      tableRows={[
        { id: 'med-rem', cells: ['Medication Reminder', 'Clinical', 'Private Duty / Standard Visit', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Task templates"
    />
  );
}
