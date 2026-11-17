import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/services/firebase';

function isMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  return (
    code === 'failed-precondition' ||
    code === 'permission-denied' ||
    /requires an index|COLLECTION_GROUP|collection group/i.test(message)
  );
}

/**
 * Preferred: collection-group count on tickets where eventId + status=redeemed.
 * Fallback: walk registrations under the event (works without the composite index).
 */
export async function countRedeemedTicketsForEvent(eventId: string): Promise<number> {
  const db = getFirestoreDb();
  try {
    const snap = await getCountFromServer(
      query(
        collectionGroup(db, 'tickets'),
        where('eventId', '==', eventId),
        where('status', '==', 'redeemed'),
      ),
    );
    return snap.data().count;
  } catch (error) {
    if (!isMissingIndexError(error)) {
      // Still try the fallback for transient/unknown failures.
      console.warn('check-in collection-group count failed, using fallback', error);
    }

    const regsSnap = await getDocs(collection(db, 'events', eventId, 'registrations'));
    const counts = await Promise.all(
      regsSnap.docs.map(async (regDoc) => {
        const ticketsSnap = await getDocs(
          query(
            collection(db, 'events', eventId, 'registrations', regDoc.id, 'tickets'),
            where('status', '==', 'redeemed'),
          ),
        );
        return ticketsSnap.size;
      }),
    );
    return counts.reduce((sum, n) => sum + n, 0);
  }
}

/** Live count of redeemed tickets for one event (scanner top-bar counter, UI/UX §8). */
export function useEventCheckInCount(eventId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;
    const db = getFirestoreDb();
    const ticketsQuery = query(
      collectionGroup(db, 'tickets'),
      where('eventId', '==', eventId),
      where('status', '==', 'redeemed'),
    );

    let pollId: ReturnType<typeof setInterval> | undefined;
    const unsub = onSnapshot(
      ticketsQuery,
      () => {
        void queryClient.invalidateQueries({ queryKey: ['checkInCount', eventId] });
      },
      () => {
        // Collection-group listener unavailable — poll via the queryFn fallback.
        pollId = setInterval(() => {
          void queryClient.invalidateQueries({ queryKey: ['checkInCount', eventId] });
        }, 4000);
      },
    );

    return () => {
      unsub();
      if (pollId) clearInterval(pollId);
    };
  }, [eventId, queryClient]);

  return useQuery({
    queryKey: ['checkInCount', eventId],
    enabled: !!eventId,
    queryFn: () => countRedeemedTicketsForEvent(eventId),
  });
}
