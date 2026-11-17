import {
  adminRoleCreateSchema,
  adminRoleUpdateSchema,
  eventAdminRoleAssignSchema,
  eventAdminRoleCreateSchema,
} from '@sfvga/shared-validation';
import type { AdminAccessSummary } from '@sfvga/shared-types';
import { assertCanRevokeSuperAdmin, withoutSuperAdminClaims } from '../../src/auth/adminRoles';
import { hasOrganizationPermission, hasPermission } from '../../src/shared/adminAccess';

const eventGrant = {
  eventId: 'event-1',
  eventName: 'Navratri',
  roleId: 'role-1',
  roleName: 'Event manager',
  permissions: ['events.view', 'staff.assign'] as const,
  activatesAt: { seconds: 1, nanoseconds: 0 },
  expiresAt: { seconds: 2, nanoseconds: 0 },
};

describe('editable admin roles', () => {
  it('accepts an edited permission list while Super Admin access still resolves to full access', () => {
    const updatedList = ['members.view'] as const;
    const superAccess: AdminAccessSummary = {
      isSuperAdmin: true,
      organizationRole: {
        id: 'super-admin',
        name: 'Community Lead',
        permissions: [...updatedList],
      },
      eventAccess: [],
    };
    expect(hasPermission(superAccess, 'payments.refund')).toBe(true);
    expect(hasOrganizationPermission(superAccess, 'events.delete')).toBe(true);
    expect(
      adminRoleUpdateSchema.parse({ roleId: 'super-admin', permissions: [] }).permissions,
    ).toEqual([]);
  });
  it('removes current and legacy Super Admin markers without dropping unrelated claims', () => {
    expect(
      withoutSuperAdminClaims({
        superAdmin: true,
        role: 'admin',
        adminLevel: 'super',
        member: true,
      }),
    ).toEqual({ member: true });
  });

  it('lets a Super Admin revoke another person but not themselves', () => {
    expect(() => assertCanRevokeSuperAdmin('admin-1', 'admin-2')).not.toThrow();
    expect(() => assertCanRevokeSuperAdmin('admin-1', 'admin-1')).toThrow(
      'You cannot revoke your own Super Admin access.',
    );
  });

  it('accepts action-level organization permissions', () => {
    expect(
      adminRoleCreateSchema.parse({
        name: 'Content helper',
        permissions: ['announcements.view', 'announcements.create'],
      }).permissions,
    ).toEqual(['announcements.view', 'announcements.create']);
  });

  it('rejects global-only permissions in event roles', () => {
    expect(() =>
      eventAdminRoleCreateSchema.parse({
        eventId: 'event-1',
        name: 'Temporary admin',
        permissions: ['payments.refund'],
      }),
    ).toThrow();
  });

  it('requires a valid event access window', () => {
    expect(
      eventAdminRoleAssignSchema.safeParse({
        eventId: 'event-1',
        targetUid: 'user-1',
        roleId: 'role-1',
        activatesAt: '2026-08-30T20:00:00.000Z',
        expiresAt: 'invalid',
      }).success,
    ).toBe(false);
  });
});

describe('permission resolution', () => {
  const eventOnlyAccess: AdminAccessSummary = {
    isSuperAdmin: false,
    organizationRole: null,
    eventAccess: [{ ...eventGrant, permissions: [...eventGrant.permissions] }],
  };

  it('scopes temporary permissions to the assigned event', () => {
    expect(hasPermission(eventOnlyAccess, 'staff.assign', 'event-1')).toBe(true);
    expect(hasPermission(eventOnlyAccess, 'staff.assign', 'event-2')).toBe(false);
    expect(hasOrganizationPermission(eventOnlyAccess, 'staff.assign')).toBe(false);
  });

  it('gives protected Super Admin every permission', () => {
    const superAccess: AdminAccessSummary = { ...eventOnlyAccess, isSuperAdmin: true };
    expect(hasOrganizationPermission(superAccess, 'payments.refund')).toBe(true);
    expect(hasPermission(superAccess, 'events.delete', 'event-2')).toBe(true);
  });
});
