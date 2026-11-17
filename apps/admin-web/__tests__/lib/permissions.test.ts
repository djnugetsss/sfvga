import { adminAccessLabel, hasCapability } from '@/lib/permissions';

it('shows an edited Super Admin name without changing full access', () => {
  const access = {
    isSuperAdmin: true,
    superAdminRoleName: 'Community Lead',
    organizationRole: null,
    eventAccess: [],
  };
  expect(adminAccessLabel(access)).toBe('Community Lead');
  expect(hasCapability(access, 'roles')).toBe(true);
  expect(hasCapability(access, 'grantAdmin')).toBe(true);
});
