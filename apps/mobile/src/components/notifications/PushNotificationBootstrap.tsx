import { usePushNotifications } from '@/hooks/usePushNotifications';

/** Mounts push-notification side effects for authenticated sessions. */
export function PushNotificationBootstrap() {
  usePushNotifications();
  return null;
}
