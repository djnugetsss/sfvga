import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import type { Registration } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';

export interface AdminRegistration extends Registration {
  id: string;
}

/** All registrations for one event (read-only for admins; writes are callable-only). */
export function useRegistrations(eventId: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId || !enabled) return;
    const db = getFirestoreDb();
    return onSnapshot(
      collection(db, 'events', eventId, 'registrations'),
      () => queryClient.invalidateQueries({ queryKey: ['admin', 'registrations', eventId] }),
      () => {
        /* keep last cached data on listener error */
      },
    );
  }, [enabled, eventId, queryClient]);

  return useQuery({
    queryKey: ['admin', 'registrations', eventId],
    enabled: !!eventId && enabled,
    queryFn: async (): Promise<AdminRegistration[]> => {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, 'events', eventId, 'registrations'));
      return snap.docs.map((d) => ({ ...(d.data() as Registration), id: d.id }));
    },
  });
}
