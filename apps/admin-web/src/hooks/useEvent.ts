import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Event } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';

/** A single event by id, kept live via an onSnapshot listener. */
export function useEvent(eventId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;
    const db = getFirestoreDb();
    return onSnapshot(
      doc(db, 'events', eventId),
      (snapshot) =>
        queryClient.setQueryData<Event | null>(['admin', 'event', eventId], () =>
          snapshot.exists() ? { ...(snapshot.data() as Event), id: snapshot.id } : null,
        ),
      () => {
        /* keep last cached data on listener error */
      },
    );
  }, [eventId, queryClient]);

  return useQuery({
    queryKey: ['admin', 'event', eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Event | null> => {
      const snap = await getDoc(doc(getFirestoreDb(), 'events', eventId));
      return snap.exists() ? { ...(snap.data() as Event), id: snap.id } : null;
    },
  });
}
