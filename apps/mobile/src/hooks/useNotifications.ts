import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/AuthProvider';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useMyTickets } from '@/hooks/useMyTickets';
import { buildNotificationFeed, countUnread, type NotificationItem } from '@/utils/notifications';
import { useMemberNotices } from './useMemberNotices';
import { toDate, formatNotificationDateTime } from '@/utils/dateFormat';

/** Per-user AsyncStorage key holding the set of read notification ids. */
const readStorageKey = (uid: string) => `sfvga:notif:read:${uid}`;
const dismissedStorageKey = (uid: string) => `sfvga:notif:dismissed:${uid}`;

async function storedIds(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed.filter((value): value is string => typeof value === 'string')
    : [];
}

/**
 * The in-app Notifications Center feed (UI/UX §3 announcements feed + event reminders).
 *
 * Merges durable private notices with org announcements and registered-event reminders.
 * Read/unread is tracked on-device; notice existence never depends on push availability.
 * Firestore listeners invalidate the React Query cache for all three sources.
 */
export function useNotifications() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const noticesQuery = useMemberNotices(uid);

  const announcementsQuery = useAnnouncements();
  const ticketsQuery = useMyTickets();

  const queryClient = useQueryClient();
  const readQueryKey = useMemo(() => ['notificationReadIds', uid ?? 'signed-out'] as const, [uid]);
  const readQuery = useQuery<string[]>({
    queryKey: readQueryKey,
    enabled: Boolean(uid),
    queryFn: () => (uid ? storedIds(readStorageKey(uid)) : Promise.resolve([])),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const readIds = useMemo(() => new Set(readQuery.data ?? []), [readQuery.data]);
  const dismissedQueryKey = useMemo(
    () => ['notificationDismissedIds', uid ?? 'signed-out'] as const,
    [uid],
  );
  const dismissedQuery = useQuery<string[]>({
    queryKey: dismissedQueryKey,
    enabled: Boolean(uid),
    queryFn: () => (uid ? storedIds(dismissedStorageKey(uid)) : Promise.resolve([])),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const dismissedIds = useMemo(() => new Set(dismissedQuery.data ?? []), [dismissedQuery.data]);

  const persist = useCallback(
    (next: Set<string>) => {
      const serialized = [...next];
      queryClient.setQueryData<string[]>(readQueryKey, serialized);
      if (uid) {
        AsyncStorage.setItem(readStorageKey(uid), JSON.stringify(serialized)).catch(() => {
          /* best-effort local persistence; ignore write failures */
        });
      }
    },
    [queryClient, readQueryKey, uid],
  );

  const reminderEvents = useMemo(() => {
    const sections = ticketsQuery.data ?? { upcoming: [], past: [] };
    const byEvent = new Map<
      string,
      { eventId: string; event: (typeof sections.upcoming)[0]['event'] }
    >();
    for (const group of [...sections.upcoming, ...sections.past]) {
      if (!byEvent.has(group.eventId)) {
        byEvent.set(group.eventId, { eventId: group.eventId, event: group.event });
      }
    }
    return Array.from(byEvent.values());
  }, [ticketsQuery.data]);

  const items: NotificationItem[] = useMemo(
    () =>
      [
        ...(noticesQuery.data ?? [])
          .filter((notice) => notice.type !== 'admin_registration_message')
          .map((notice): NotificationItem => {
            const date = toDate(notice.createdAt);
            const id = `notice:${notice.id}`;
            return {
              ...notice,
              body:
                notice.type === 'payment'
                  ? 'There’s an issue with your payment. Tap to resolve.'
                  : notice.type === 'registration_message'
                    ? 'You have a private message. Tap to read it.'
                    : notice.body,
              id,
              timestamp: date?.getTime() ?? null,
              timeLabel: date ? formatNotificationDateTime(date) : undefined,
              read: readIds.has(id),
            };
          })
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
        ...buildNotificationFeed(announcementsQuery.data ?? [], reminderEvents, readIds),
      ].filter((item) => !dismissedIds.has(item.id)),
    [announcementsQuery.data, reminderEvents, readIds, dismissedIds, noticesQuery.data],
  );

  const dismiss = useCallback(
    (id: string) => {
      if (!uid || !items.some((item) => item.id === id)) return;
      const next = new Set(queryClient.getQueryData<string[]>(dismissedQueryKey) ?? []);
      next.add(id);
      const serialized = [...next];
      queryClient.setQueryData<string[]>(dismissedQueryKey, serialized);
      AsyncStorage.setItem(dismissedStorageKey(uid), JSON.stringify(serialized)).catch(() => {
        // Keep the local dismissal for this session if device storage is unavailable.
      });
    },
    [dismissedQueryKey, items, queryClient, uid],
  );

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(queryClient.getQueryData<string[]>(readQueryKey) ?? []);
      if (next.has(id)) return;
      next.add(id);
      persist(next);
    },
    [persist, queryClient, readQueryKey],
  );

  const markAllRead = useCallback(() => {
    if (!items.some((item) => !item.read)) return;
    const next = new Set(queryClient.getQueryData<string[]>(readQueryKey) ?? []);
    items.forEach((item) => next.add(item.id));
    persist(next);
  }, [items, persist, queryClient, readQueryKey]);

  const refetch = useCallback(() => {
    announcementsQuery.refetch();
    ticketsQuery.refetch();
    noticesQuery.refetch();
  }, [announcementsQuery, ticketsQuery, noticesQuery]);

  return {
    items,
    unreadCount: countUnread(items),
    isLoading:
      (Boolean(uid) && (readQuery.isLoading || dismissedQuery.isLoading)) ||
      announcementsQuery.isLoading ||
      ticketsQuery.isLoading ||
      noticesQuery.isLoading,
    isError: announcementsQuery.isError || ticketsQuery.isError || noticesQuery.isError,
    isRefetching:
      announcementsQuery.isRefetching || ticketsQuery.isRefetching || noticesQuery.isRefetching,
    refetch,
    markRead,
    markAllRead,
    dismiss,
  };
}
