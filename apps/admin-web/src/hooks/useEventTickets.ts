import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import type { Ticket } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';

export interface AdminTicket extends Ticket {
  id: string;
  registrationId: string;
}

/**
 * All tickets for one event, keyed by registration id. Used on the admin registrations
 * page so staff can view current status and historical QR generations.
 */
export function useEventTickets(eventId: string, registrationIds: string[]) {
  const queryClient = useQueryClient();
  const regKey = useMemo(() => registrationIds.slice().sort().join('\n'), [registrationIds]);
  const ids = useMemo(() => (regKey ? regKey.split('\n') : []), [regKey]);

  useEffect(() => {
    if (!eventId || ids.length === 0) return;
    const db = getFirestoreDb();
    const unsubscribers = ids.map((registrationId) =>
      onSnapshot(
        collection(db, 'events', eventId, 'registrations', registrationId, 'tickets'),
        () =>
          queryClient.invalidateQueries({ queryKey: ['admin', 'eventTickets', eventId, regKey] }),
        () => {
          /* keep last cached data on listener error */
        },
      ),
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [eventId, regKey, ids, queryClient]);

  return useQuery({
    queryKey: ['admin', 'eventTickets', eventId, regKey],
    enabled: !!eventId && ids.length > 0,
    queryFn: async (): Promise<Record<string, AdminTicket[]>> => {
      const db = getFirestoreDb();
      const byRegistration: Record<string, AdminTicket[]> = {};

      await Promise.all(
        ids.map(async (registrationId) => {
          const snap = await getDocs(
            collection(db, 'events', eventId, 'registrations', registrationId, 'tickets'),
          );
          byRegistration[registrationId] = snap.docs.map((d) => ({
            ...(d.data() as Ticket),
            id: d.id,
            registrationId,
          }));
        }),
      );

      return byRegistration;
    },
  });
}
