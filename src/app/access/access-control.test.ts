import { mapBackendPermissionsToFrontend } from './access-control';

describe('mapBackendPermissionsToFrontend', () => {
  it('maps owner agency settings permission to the consolidated security route capability', () => {
    const resolved = mapBackendPermissionsToFrontend(
      ['MANAGE_AGENCY_SETTINGS'],
      ['manage_agency_settings', 'manage_security_settings'],
    );

    expect(resolved).toContain('manage_agency_settings');
    expect(resolved).toContain('manage_security_settings');
  });
});
