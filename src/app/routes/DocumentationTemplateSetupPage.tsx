import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function DocumentationTemplateSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Documentation templates need a more complex editor later, but the route, shell, and responsive behavior are already established here so that complexity stays contained."
      eyebrow="Template Setup"
      formFields={[
        { label: 'Name', placeholder: 'Visit Note' },
        { label: 'Code', placeholder: 'VN-1' },
        { label: 'Template Type', placeholder: 'Choose a template type', type: 'select', options: ['Visit Note', 'Assessment'] },
        { label: 'Structured Definition', placeholder: 'JSON or future editor surface', type: 'textarea' },
      ]}
      formHelper="This shell is designed to degrade cleanly on smaller screens even when the real editor becomes denser in later stories."
      formTitle="Documentation template form shell"
      path="/app/setup/templates/documentation"
      searchPlaceholder="Search documentation templates"
      tableColumns={['Name', 'Type', 'Version', 'Status']}
      tableRows={[
        { id: 'vn-1', cells: ['Visit Note', 'Visit Note', '2', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Open' },
      ]}
      title="Documentation templates"
    />
  );
}
