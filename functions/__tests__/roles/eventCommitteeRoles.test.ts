import { Timestamp } from 'firebase-admin/firestore';
import { EVENT_ADMIN_PERMISSIONS } from '@sfvga/shared-types';
import { standardEventRoleData } from '../../src/roles/ticketScannerRole';

it('creates the four committee roles with only event-scoped permissions', () => {
  const roles = standardEventRoleData('event-one', 'organizer', Timestamp.now());
  expect(roles.map(role => role.name)).toEqual(['Chair', 'Co-Chair', 'Committee Member', 'Event Treasurer']);
  for (const role of roles) {
    expect(role.eventId).toBe('event-one');
    expect(role.permissions.length).toBeGreaterThan(0);
    expect(role.permissions.every(permission => (EVENT_ADMIN_PERMISSIONS as readonly string[]).includes(permission))).toBe(true);
    expect(role.permissions).not.toContain('roles.manage');
    expect(role.permissions).not.toContain('members.view');
  }
});
