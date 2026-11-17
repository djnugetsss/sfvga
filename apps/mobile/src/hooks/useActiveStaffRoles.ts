import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type {
  Event,
  EventAdminRoleGrant,
  EventAdminRoleDefinition,
  EventRoleGrant,
  RoleDefinition,
  FirestoreTimestamp,
} from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { toDate } from '@/utils/dateFormat';

/** A resolved staff assignment for the Home "You're on staff" card (UI spec §3). */
export interface ActiveStaffRole {
  grantId: string;
  eventId: string;
  eventName: string;
  roleName: string;
  /** Whether this assignment includes ticket scanning, independent of its active window. */
  hasScanPermission: boolean;
  /** True only when the role can scan and its grant window is currently active. */
  canScan: boolean;
  eventStartAt: FirestoreTimestamp | null;
}

/**
 * The current member's active or upcoming volunteer/committee assignments (tech design §10).
 * Reads the user's role grants (collection-group query), then joins each grant's event and
 * role definition to resolve the display name and whether scanning is currently permitted.
 * Grants that have already expired are excluded.
 */
export function useActiveStaffRoles() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const db = getFirestoreDb();
    const rolesQuery = query(collectionGroup(db, 'roles'), where('userId', '==', uid));
    const unsub = onSnapshot(
      rolesQuery,
      () => queryClient.invalidateQueries({ queryKey: ['activeStaffRoles', uid] }),
      () => {
        /* keep last cached data on listener error */
      },
    );
    return unsub;
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ['activeStaffRoles', uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const db = getFirestoreDb();
      const snap = await getDocs(query(collectionGroup(db, 'roles'), where('userId', '==', uid)));
      const now = Date.now();
      const results: ActiveStaffRole[] = [];

      for (const grantDoc of snap.docs) {
        const grant = grantDoc.data() as EventRoleGrant & Partial<EventAdminRoleGrant>;
        if (grant.revokedAt) continue;
        const expiresAt = toDate(grant.expiresAt);
        // Show active or upcoming assignments; hide ones that have already ended.
        if (expiresAt && expiresAt.getTime() < now) continue;

        const eventRef = grantDoc.ref.parent.parent;
        if (!eventRef) continue;

        const [eventSnap, eventRoleSnap, legacyRoleSnap] = await Promise.all([
          getDoc(eventRef),
          getDoc(doc(eventRef, 'roleDefinitions', grant.roleDefinitionId)),
          getDoc(doc(db, 'roleDefinitions', grant.roleDefinitionId)),
        ]);
        if (!eventSnap.exists()) continue;

        const event = eventSnap.data() as Event | undefined;
        const eventRole = eventRoleSnap.data() as EventAdminRoleDefinition | undefined;
        const legacyRole = legacyRoleSnap.data() as RoleDefinition | undefined;

        const activatesAt = toDate(grant.activatesAt);
        const withinWindow =
          grant.active !== false &&
          (!activatesAt || activatesAt.getTime() <= now) &&
          (!expiresAt || expiresAt.getTime() >= now);
        const hasScanPermission = Boolean(
          eventRole?.permissions?.includes('tickets.scan') || legacyRole?.canScanTickets,
        );

        results.push({
          grantId: grantDoc.id,
          eventId: eventRef.id,
          eventName: event?.title ?? 'Event',
          roleName: eventRole?.name ?? legacyRole?.name ?? 'Staff',
          hasScanPermission,
          canScan: hasScanPermission && withinWindow,
          eventStartAt: event?.startAt ?? null,
        });
      }

      return results.sort(
        (a, b) =>
          (toDate(a.eventStartAt)?.getTime() ?? 0) - (toDate(b.eventStartAt)?.getTime() ?? 0),
      );
    },
  });
}
