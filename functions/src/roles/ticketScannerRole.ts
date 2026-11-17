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
