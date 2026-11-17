'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminRegistrationNotification } from '@sfvga/shared-types';
import { useAdminAuth } from './useAdminAuth';
import { useEvents } from './useEvents';
import { hasEventPermission } from '@/lib/permissions';
import { getFirestoreDb } from '@/services/firebase';
import { toDate } from '@/lib/formatters';
import { isEventPast } from '@/lib/registrationQueue';

export function useAdminNotifications() {
  const { firebaseUser, access } = useAdminAuth();
  const events = useEvents();
  const client = useQueryClient();
  const uid = firebaseUser?.uid;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const scope = JSON.stringify(
    (events.data ?? []).flatMap((event) => {
      const types: AdminRegistrationNotification['type'][] = [];
      if (
        hasEventPermission(access, event.id, 'registrations.view') &&
        hasEventPermission(access, event.id, 'registrations.manage')
      )
        types.push('admin_registration_message', 'admin_registration_attention');
      if (
        hasEventPermission(access, event.id, 'events.view') &&
        hasEventPermission(access, event.id, 'events.edit')
      )
        types.push('admin_photo_album_reminder');
      return types.map((type) => ({ eventId: event.id, type }));
    }),
  );
  const scopes = useMemo(
    () => JSON.parse(scope) as { eventId: string; type: AdminRegistrationNotification['type'] }[],
    [scope],
  );
  const key = useMemo(() => ['adminNotifications', uid, scope] as const, [uid, scope]);
  const enabled = Boolean(uid && scopes.length);
  useEffect(() => {
    if (!uid || !scopes.length) return;
    const subscriptions = scopes.map(({ eventId, type }) =>
      onSnapshot(
        query(
          collection(getFirestoreDb(), 'users', uid, 'adminNotifications'),
          where('eventId', '==', eventId),
          where('type', '==', type),
        ),
        () => void client.invalidateQueries({ queryKey: key }),
        () => void client.invalidateQueries({ queryKey: key }),
      ),
    );
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [uid, scopes, key, client]);
  const result = useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const snapshots = await Promise.all(
        scopes.map(({ eventId, type }) =>
          getDocs(
            query(
              collection(getFirestoreDb(), 'users', uid!, 'adminNotifications'),
              where('eventId', '==', eventId),
              where('type', '==', type),
            ),
          ),
        ),
      );
      return snapshots
        .flatMap((snapshot) =>
          snapshot.docs.map(
            (entry) => ({ ...entry.data(), id: entry.id }) as AdminRegistrationNotification,
          ),
        )
        .sort(
          (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
        );
    },
  });
  // Never render a stale cached inbox after permissions change or a rules rejection.
  const eventById = new Map((events.data ?? []).map((event) => [event.id, event]));
  const items =
    enabled && !result.isError
      ? (result.data ?? []).filter((item) => {
          if (item.dismissedAt) return false;
          // Older started-signup notices remain stored, but no longer belong in the inbox.
          if (item.type === 'admin_registration_attention' && item.id.endsWith('-started'))
            return false;
          if (item.type === 'admin_photo_album_reminder') return true;
          const event = eventById.get(item.eventId);
          return event !== undefined && !isEventPast(event, now);
        })
      : [];
  async function markRead(ids: string[]) {
    if (!uid) return;
    const allowed = new Set(items.map((item) => item.id));
    const safeIds = ids.filter((id) => allowed.has(id));
    // Small batches stay within rules lookup limits for managers spanning several events.
    for (let index = 0; index < safeIds.length; index += 5) {
      const batch = writeBatch(getFirestoreDb());
      safeIds.slice(index, index + 5).forEach((id) =>
        batch.update(doc(getFirestoreDb(), 'users', uid, 'adminNotifications', id), {
          readAt: serverTimestamp(),
        }),
      );
      await batch.commit();
    }
    await client.invalidateQueries({ queryKey: key });
  }
  async function dismiss(id: string) {
    if (!uid || !items.some((item) => item.id === id)) return;
    await updateDoc(doc(getFirestoreDb(), 'users', uid, 'adminNotifications', id), {
      dismissedAt: serverTimestamp(),
    });
    await client.invalidateQueries({ queryKey: key });
  }
  return {
    items,
    enabled,
    unreadCount: items.filter((item) => !item.readAt).length,
    isLoading: events.isLoading || (enabled && result.isLoading),
    isError: events.isError || result.isError,
    refetch: () => {
      void events.refetch();
      void result.refetch();
    },
    markRead,
    dismiss,
  };
}
