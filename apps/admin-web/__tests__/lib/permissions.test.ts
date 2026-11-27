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

it('allows organization role managers but ignores event-scoped role-management permissions', () => {
  const { hasCapability } = require('@/lib/permissions');
  const base = { isSuperAdmin: false, organizationRole: null, eventAccess: [] };
  expect(hasCapability({ ...base, organizationRole: { id: 'vp', name: 'Vice President', permissions: ['roles.manage'] } }, 'roles')).toBe(true);
  expect(hasCapability({ ...base, eventAccess: [{ permissions: ['roles.manage'] }] }, 'roles')).toBe(false);
  expect(hasCapability(base, 'roles')).toBe(false);
});
