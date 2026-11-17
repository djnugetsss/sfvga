import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { resolveAdminAccess, hasPermission } from './adminAccess';

/**
 * Permission-resolution helper (tech design doc §4).
 *
 * Answers "can this user scan tickets for event X" by looking up their active
 * EventRoleGrant(s) for that event, then checking whether any referenced
 * roleDefinition has canScanTickets == true. This is the single source of truth
 * for check-in permission and is called from inside tickets_validate before any
 * redemption is allowed.
 *
 * Never trusts a client-supplied flag — always resolved server-side per request.
 */
export async function canScanTickets(uid: string, eventId: string): Promise<boolean> {
  const db = getFirestore();

  const authUser = await getAuth().getUser(uid);
  const access = await resolveAdminAccess(uid, authUser.customClaims);
  if (hasPermission(access, 'tickets.scan', eventId)) return true;

  // Legacy volunteer grants remain readable during migration.
  const grants = await db
    .collection(`events/${eventId}/roles`)
    .where('userId', '==', uid)
    .where('active', '==', true)
    .get();

  if (grants.empty) {
    return false;
  }

  for (const grantDoc of grants.docs) {
    const data = grantDoc.data();
    const now = Timestamp.now().toMillis();
    if (
      data.revokedAt ||
      data.activatesAt?.toMillis?.() > now ||
      data.expiresAt?.toMillis?.() < now
    )
      continue;
    const roleDefId = grantDoc.data().roleDefinitionId as string;
    const [eventRole, legacyRole] = await Promise.all([
      db.doc(`events/${eventId}/roleDefinitions/${roleDefId}`).get(),
      db.doc(`roleDefinitions/${roleDefId}`).get(),
    ]);
    if (
      (eventRole.exists &&
        eventRole.data()?.active === true &&
        eventRole.data()?.permissions?.includes('tickets.scan')) ||
      (legacyRole.exists && legacyRole.data()?.canScanTickets === true)
    ) {
      return true;
    }
  }

  return false;
}
