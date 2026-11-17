import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import type { Announcement } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { functionsClient } from '@/services/functionsClient';
import { buildAnnouncementRequest } from '@/lib/announcementPayload';

/** Org-wide announcements (top-level collection), newest first. */
export function useAnnouncements() {
  const { access } = useAdminAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const db = getFirestoreDb();
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      announcementsQuery,
      () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
      () => {
        /* keep last cached data on listener error */
      },
    );
  }, [queryClient]);

  return useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => {
      const db = getFirestoreDb();
      const snap = await getDocs(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
      );
      const announcements = snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id }));
      if (access?.isSuperAdmin || access?.organizationRole) return announcements;
      const eventIds = new Set(access?.eventAccess.map((event) => event.eventId) ?? []);
      return announcements.filter(
        (announcement) => announcement.eventId && eventIds.has(announcement.eventId),
      );
    },
  });
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  /**
   * When set, members see this in the feed and Event Detail; push (if Functions are
   * deployed) goes to people registered for that event only.
   */
  eventId?: string;
}

/** Create an announcement via a direct admin write (rules gate writes by the admin claim). */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, body, eventId }: CreateAnnouncementInput) => {
      const result = await functionsClient.announcements.send(
        buildAnnouncementRequest({ title, body, eventId }),
      );
      return result.announcementId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });
}

/** Delete an org-wide announcement. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, 'announcements', announcementId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });
}
