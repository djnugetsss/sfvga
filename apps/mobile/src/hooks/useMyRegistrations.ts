import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Registration } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { fetchExistingEventIdSet, filterByExistingEvents } from '@/utils/existingEvents';

/** A registration plus the id of the event it belongs to (its parent). */
export interface MyRegistration extends Registration {
  eventId: string;
}

function isMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  return (
    code === 'failed-precondition' ||
    /requires an index|COLLECTION_GROUP|collection group/i.test(message)
  );
}

/** Prefer path segments so collection-group hits always resolve events/{eventId}/registrations/{id}. */
function eventIdFromRegistrationPath(path: string): string {
  const segments = path.split('/');
  if (
    segments.length >= 4 &&
    segments[0] === 'events' &&
    segments[2] === 'registrations' &&
    segments[1]
  ) {
    return segments[1];
  }
  return '';
}

/**
 * Preferred path: collection-group query (needs registrations.userId COLLECTION_GROUP index).
 * Fallback: scan events and query each registrations subcollection (works without that index).
 */
async function fetchMyRegistrations(uid: string, eventId?: string): Promise<MyRegistration[]> {
  const db = getFirestoreDb();
  const constraints: QueryConstraint[] = [where('userId', '==', uid)];

  try {
    const snap = await getDocs(query(collectionGroup(db, 'registrations'), ...constraints));
    const registrations = snap.docs
      .map((d) => ({
        ...(d.data() as Registration),
        id: d.id,
        eventId: eventIdFromRegistrationPath(d.ref.path) || d.ref.parent.parent?.id || '',
      }))
      .filter((r) => Boolean(r.eventId));
    const existingEventIds = await fetchExistingEventIdSet(registrations.map((r) => r.eventId));
    const visible = filterByExistingEvents(registrations, existingEventIds);
    return eventId ? visible.filter((r) => r.eventId === eventId) : visible;
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;

    // Index still building / not deployed — fall back to per-event queries.
    if (eventId) {
      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) return [];
      const snap = await getDocs(
        query(collection(db, 'events', eventId, 'registrations'), where('userId', '==', uid)),
      );
      return snap.docs.map((d) => ({
        ...(d.data() as Registration),
        id: d.id,
        eventId,
      }));
    }

    const eventsSnap = await getDocs(collection(db, 'events'));
    const nested = await Promise.all(
      eventsSnap.docs.map(async (eventDoc) => {
        const snap = await getDocs(
          query(collection(db, 'events', eventDoc.id, 'registrations'), where('userId', '==', uid)),
        );
        return snap.docs.map((d) => ({
          ...(d.data() as Registration),
          id: d.id,
          eventId: eventDoc.id,
        }));
      }),
    );
    return nested.flat();
  }
}

/**
 * The current member's registrations across all events (collection-group query on
 * registrations where userId == uid, per tech design §3). Optionally filtered to a single
 * event. Real-time via an onSnapshot listener that invalidates the cache.
 */
export function useMyRegistrations(eventId?: string) {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const db = getFirestoreDb();
    const registrationsQuery = query(
      collectionGroup(db, 'registrations'),
      where('userId', '==', uid),
    );
    const unsub = onSnapshot(
      registrationsQuery,
      () => queryClient.invalidateQueries({ queryKey: ['myRegistrations', uid] }),
      (error) => {
        // If the collection-group listener fails (missing index), still allow poll/refetch
        // via the queryFn fallback — don't leave the cache permanently stale.
        if (isMissingIndexError(error)) {
          queryClient.invalidateQueries({ queryKey: ['myRegistrations', uid] });
        }
      },
    );
    return unsub;
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ['myRegistrations', uid, eventId ?? 'all'],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      return fetchMyRegistrations(uid, eventId);
    },
  });
}
