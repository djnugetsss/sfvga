import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Announcement } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { fetchExistingEventIdSet } from '@/utils/existingEvents';

/**
 * Org-wide announcements (top-level `announcements` collection, tech design §2), newest
 * first. Pass `max` to cap the count — the Home feed shows the 3 most recent (UI spec §3),
 * the Announcements list screen shows them all. Real-time via an onSnapshot listener.
 */
export function useAnnouncements(max?: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const db = getFirestoreDb();
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      announcementsQuery,
      () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
      () => {
        /* keep last cached data on listener error */
      },
    );
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: ['announcements', max ?? 'all'],
    queryFn: async () => {
      const db = getFirestoreDb();
      const base = collection(db, 'announcements');
      const snap = await getDocs(query(base, orderBy('createdAt', 'desc')));
      const eventIds = snap.docs
        .map((entry) => (entry.data() as Announcement).eventId)
        .filter((id): id is string => Boolean(id));
      const existingEventIds = await fetchExistingEventIdSet(eventIds);
      const visible = snap.docs
        .map((d) => ({ ...(d.data() as Announcement), id: d.id }))
        .filter((a) => !a.eventId || existingEventIds.has(a.eventId));
      return max ? visible.slice(0, max) : visible;
    },
  });
}
