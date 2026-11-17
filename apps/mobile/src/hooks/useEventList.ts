import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Event } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { toDate } from '@/utils/dateFormat';

export type EventFilter = 'upcoming' | 'past';

function mapEvents(docs: QueryDocumentSnapshot[]): Event[] {
  return docs.map((d) => ({ ...(d.data() as Event), id: d.id }));
}

/**
 * Split the published event list into upcoming/past by end date. At ~10–15 events a
 * year (tech design §5) it's simplest to read the small collection and filter in memory
 * rather than maintain composite indexes. Drafts are never shown to members.
 */
function filterEvents(events: Event[], filter: EventFilter): Event[] {
  const now = Date.now();
  const visible = events.filter((e) => e.status !== 'draft');

  if (filter === 'upcoming') {
    return visible
      .filter((e) => {
        const end = toDate(e.endAt);
        return end ? end.getTime() >= now : true;
      })
      .sort((a, b) => (toDate(a.startAt)?.getTime() ?? 0) - (toDate(b.startAt)?.getTime() ?? 0));
  }

  return visible
    .filter((e) => {
      const end = toDate(e.endAt);
      return end ? end.getTime() < now : false;
    })
    .sort((a, b) => (toDate(b.startAt)?.getTime() ?? 0) - (toDate(a.startAt)?.getTime() ?? 0));
}

const listeners = new WeakMap<QueryClient, { subscribers: number; unsubscribe: () => void }>();

function subscribeToEvents(queryClient: QueryClient) {
  let listener = listeners.get(queryClient);
  if (!listener) {
    const eventsQuery = query(collection(getFirestoreDb(), 'events'), orderBy('startAt', 'asc'));
    let initialized = false;
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const events = mapEvents(snapshot.docs);
        const previousIds = new Set(
          (['upcoming', 'past'] as const).flatMap((period) =>
            (queryClient.getQueryData<Event[]>(['events', period]) ?? []).map((event) => event.id),
          ),
        );
        const nextIds = new Set(events.map((event) => event.id));
        const removedFromCache = [...previousIds].some((id) => !nextIds.has(id));
        queryClient.setQueryData(['events', 'upcoming'], filterEvents(events, 'upcoming'));
        queryClient.setQueryData(['events', 'past'], filterEvents(events, 'past'));
        if (initialized) {
          queryClient.invalidateQueries({ queryKey: ['myTickets'] });
          queryClient.invalidateQueries({ queryKey: ['activeStaffRoles'] });
        }
        if (
          removedFromCache ||
          (initialized && snapshot.docChanges().some((change) => change.type === 'removed'))
        ) {
          queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
        initialized = true;
      },
      () => {
        /* keep last cached data on listener error (offline-friendly, UI spec §3) */
      },
    );
    listener = { subscribers: 0, unsubscribe };
    listeners.set(queryClient, listener);
  }
  listener.subscribers++;
  return () => {
    listener!.subscribers--;
    if (listener!.subscribers === 0) {
      listener!.unsubscribe();
      listeners.delete(queryClient);
    }
  };
}

/**
 * Real-time list of events for the member app. React Query owns loading/error/retry
 * state; an onSnapshot listener updates the cache so the list stays live (architecture
 * §9 — Firestore listeners bridged into React Query).
 */
export function useEventList(filter: EventFilter = 'upcoming') {
  const queryClient = useQueryClient();

  useEffect(() => subscribeToEvents(queryClient), [queryClient]);

  return useQuery({
    queryKey: ['events', filter],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const db = getFirestoreDb();
      const snap = await getDocs(query(collection(db, 'events'), orderBy('startAt', 'asc')));
      return filterEvents(mapEvents(snap.docs), filter);
    },
  });
}
