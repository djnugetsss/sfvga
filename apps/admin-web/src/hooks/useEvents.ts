import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { AdminAccessSummary, Event } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

/** All events (any status), newest first. Admin-only; rules gate reads/writes by claim. */
function visibleEvents(events: Event[], access: AdminAccessSummary | null): Event[] {
  if (access?.isSuperAdmin || access?.organizationRole) return events;
  const allowed = new Set(access?.eventAccess.map((event) => event.eventId) ?? []);
  return events.filter((event) => allowed.has(event.id));
}

export function useEvents() {
  const { access } = useAdminAuth();
  const queryClient = useQueryClient();
  const scope = access?.isSuperAdmin
    ? 'all'
    : (access?.organizationRole?.id ??
      access?.eventAccess
        .map((event) => event.eventId)
        .sort()
        .join(',') ??
      'none');
  const queryKey = ['admin', 'events', scope] as const;

  useEffect(() => {
    if (!access) return;
    const db = getFirestoreDb();
    const eventsQuery = query(collection(db, 'events'), orderBy('startAt', 'desc'));
    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const events = snapshot.docs.map((entry) => ({ ...(entry.data() as Event), id: entry.id }));
        queryClient.setQueryData(['admin', 'events', scope], visibleEvents(events, access));
      },
      () => {
        /* keep last cached data on listener error */
      },
    );
  }, [queryClient, access, scope]);

  return useQuery({
    queryKey,
    enabled: !!access,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const db = getFirestoreDb();
      const snap = await getDocs(query(collection(db, 'events'), orderBy('startAt', 'desc')));
      const events = snap.docs.map((d) => ({ ...(d.data() as Event), id: d.id }));
      return visibleEvents(events, access);
    },
  });
}
