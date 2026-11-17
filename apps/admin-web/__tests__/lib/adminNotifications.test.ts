import type { AdminAccessSummary } from '@sfvga/shared-types';
import { canReceiveAdminNotifications } from '@/lib/adminNotifications';
const base: AdminAccessSummary = { isSuperAdmin: false, organizationRole: null, eventAccess: [] };
describe('admin notification visibility', () => {
  it('allows super admins and registration managers, not view-only or unrelated roles', () => {
    expect(canReceiveAdminNotifications(null)).toBe(false);
    expect(canReceiveAdminNotifications({ ...base, isSuperAdmin: true })).toBe(true);
    for (const permissions of [
      ['registrations.view'],
      ['tickets.scan'],
      ['announcements.view'],
      ['payments.view'],
    ]) {
      expect(
        canReceiveAdminNotifications({
          ...base,
          organizationRole: { id: 'role', name: 'Role', permissions },
        } as AdminAccessSummary),
      ).toBe(false);
    }
    expect(
      canReceiveAdminNotifications({
        ...base,
        organizationRole: {
          id: 'role',
          name: 'Role',
          permissions: ['registrations.view', 'registrations.manage'],
        },
      }),
    ).toBe(true);
  });
  it('requires both permissions on the same event', () => {
    const access = {
      ...base,
      eventAccess: [
        { eventId: 'a', permissions: ['registrations.view'] },
        { eventId: 'b', permissions: ['registrations.manage'] },
      ],
    } as AdminAccessSummary;
    expect(canReceiveAdminNotifications(access)).toBe(false);
    access.eventAccess[0].permissions.push('registrations.manage');
    expect(canReceiveAdminNotifications(access)).toBe(true);
  });
  it('allows event editors to receive photo reminders without registration access', () => {
    expect(
      canReceiveAdminNotifications({
        ...base,
        eventAccess: [{ eventId: 'event', permissions: ['events.view', 'events.edit'] }],
      } as AdminAccessSummary),
    ).toBe(true);
  });
});
