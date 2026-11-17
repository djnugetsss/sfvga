import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Event } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';

/**
 * A single event by id. Real-time via an onSnapshot listener that updates the
 * cache, with React Query handling the initial fetch (tech design §7).
 */
export function useEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;
    const db = getFirestoreDb();
    const unsub = onSnapshot(
      doc(db, 'events', eventId),
      (snapshot) =>
        queryClient.setQueryData<Event | null>(['event', eventId], () =>
          snapshot.exists() ? { ...(snapshot.data() as Event), id: snapshot.id } : null,
        ),
      () => {
        /* keep last cached data on listener error */
      },
    );
    return unsub;
  }, [eventId, queryClient]);

  return useQuery<Event | null>({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!eventId) return null;
      const db = getFirestoreDb();
      const snap = await getDoc(doc(db, 'events', eventId));
      return snap.exists() ? { ...(snap.data() as Event), id: snap.id } : null;
    },
  });
}
