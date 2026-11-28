import { EVENT_ADMIN_PERMISSIONS } from '@sfvga/shared-types';
import leadershipRoles from '../auth/leadershipRoles.json';
import type { Timestamp } from 'firebase-admin/firestore';

export function ticketScannerRoleData(eventId: string, uid: string, now: Timestamp) {
  return {
    eventId,
    name: 'Ticket Scanner',
    description: 'Can scan and validate tickets for this event.',
    permissions: ['tickets.scan'],
    active: true,
    system: false,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };
}

export function standardEventRoleData(eventId: string, uid: string, now: Timestamp) {
  return leadershipRoles.filter(role => role.id.startsWith('committee-')).map(role => ({
    ...role, eventId,
    permissions: role.permissions.filter(permission => (EVENT_ADMIN_PERMISSIONS as readonly string[]).includes(permission)),
    active: true, system: false, createdBy: uid, createdAt: now, updatedAt: now,
  }));
}
