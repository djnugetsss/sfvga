import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { useAuthContext } from '@/providers/AuthProvider';
import { getFirebaseApp, paymentTestMode } from '@/services/firebase';
import { notificationService } from '@/services/notificationService';

interface WebNotificationInstance {
  onclick: (() => void) | null;
  close: () => void;
}

type WebNotificationConstructor = new (
  title: string,
  options?: { body?: string; icon?: string },
) => WebNotificationInstance;

function notificationTarget(data: Record<string, string> | undefined): string {
  if (data?.type === 'admin_registration_message' || data?.type === 'admin_registration_attention')
    return '/admin';
  if (data?.eventId && data.type === 'registration_message')
    return `/messages?eventId=${encodeURIComponent(data.eventId)}`;
  if (data?.eventId && data.type === 'payment')
    return `/events/${encodeURIComponent(data.eventId)}/register`;
  if (data?.type === 'registration_confirmed' && data.eventId) {
    return `/tickets?focusEventId=${encodeURIComponent(data.eventId)}`;
  }
  if (data?.eventId) return `/events/${encodeURIComponent(data.eventId)}`;
  return '/notifications';
}

/** Web Push bootstrap for the installed SFVGA home-screen app. */
export function usePushNotifications() {
  const { firebaseUser, userProfile } = useAuthContext();
  const uid = firebaseUser?.uid;
  const pushEnabled = userProfile?.notificationPrefs?.pushEnabled !== false;

  useEffect(() => {
    if (paymentTestMode || !uid || !pushEnabled) return;
    void notificationService.syncPushToken(uid).catch(() => undefined);
  }, [pushEnabled, uid]);

  useEffect(() => {
    if (paymentTestMode) return;
    const NotificationApi = (
      globalThis as unknown as {
        Notification?: WebNotificationConstructor & { permission: string };
      }
    ).Notification;
    if (!NotificationApi || NotificationApi.permission !== 'granted') return;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onMessage(getMessaging(getFirebaseApp()), (payload) => {
        const title = payload.notification?.title ?? 'SFVGA';
        const notification = new NotificationApi(title, {
          body: payload.notification?.body,
          icon: '/icon.svg',
        });
        notification.onclick = () => {
          notification.close();
          const location = (
            globalThis as unknown as { location?: { assign: (url: string) => void } }
          ).location;
          location?.assign(notificationTarget(payload.data));
        };
      });
    } catch {
      return;
    }
    return () => unsubscribe?.();
  }, []);
}
