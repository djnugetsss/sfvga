import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthContext } from '@/providers/AuthProvider';
import { notificationService } from '@/services/notificationService';
import { paymentTestMode } from '@/services/firebase';

/**
 * Keeps the member's FCM device token in sync when they are signed in and have already
 * granted OS notification permission. Does not prompt on launch (UI/UX §11).
 */
export function usePushNotifications() {
  const { firebaseUser, userProfile } = useAuthContext();
  const uid = firebaseUser?.uid;
  const pushEnabled = userProfile?.notificationPrefs?.pushEnabled !== false;

  useEffect(() => {
    if (paymentTestMode || !uid || Platform.OS === 'web' || !pushEnabled) return;
    void notificationService.syncPushToken(uid).catch(() => undefined);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void notificationService.syncPushToken(uid).catch(() => undefined);
    });
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void notificationService.syncPushToken(uid).catch(() => undefined);
    });

    return () => {
      appStateSubscription.remove();
      tokenSubscription.remove();
    };
  }, [pushEnabled, uid]);

  useEffect(() => {
    if (!uid || Platform.OS === 'web') return;

    const openNotification = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const eventId = typeof data.eventId === 'string' ? data.eventId : undefined;
      const type = typeof data.type === 'string' ? data.type : undefined;
      if (type === 'registration_confirmed' && eventId) {
        void Linking.openURL(`sfvga-combined://tickets?focusEventId=${encodeURIComponent(eventId)}`);
      } else if (type === 'admin_registration_message' || type === 'admin_registration_attention') {
        void Linking.openURL('sfvga-combined://admin');
      } else if (type === 'registration_message' && eventId) {
        void Linking.openURL(`sfvga-combined://messages?eventId=${encodeURIComponent(eventId)}`);
      } else if (type === 'payment' && eventId) {
        void Linking.openURL(`sfvga-combined://events/${encodeURIComponent(eventId)}/register`);
      } else if (eventId) {
        void Linking.openURL(`sfvga-combined://events/${encodeURIComponent(eventId)}`);
      } else {
        void Linking.openURL('sfvga-combined://notifications');
      }
    };

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openNotification(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    return () => responseSubscription.remove();
  }, [uid]);
}
