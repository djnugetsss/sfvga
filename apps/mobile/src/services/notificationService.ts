import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/services/firebase';

/**
 * Default foreground notification behavior — show alert and play sound (Architecture §3).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Push-notification layer (Expo Push Service, backed by FCM/APNs).
 *
 * Expo tokens are stored in `users/{uid}.expoPushTokens` so server-side functions
 * (`notifications_onAnnouncementCreated`, `notifications_eventReminder`, registration
 * confirmation in `tickets_onRegistrationConfirmed`) can fan out pushes. Per UI/UX §11,
 * OS permission is requested when the member opts in — not on every app launch.
 */
export const notificationService = {
  isSupported: Platform.OS === 'ios' || Platform.OS === 'android',

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
    if (!this.isSupported) return 'unsupported';
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  },

  /** Ask the OS for notification permission (UI/UX onboarding + Profile toggles). */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SFVGA',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  /** Resolve this installation's cross-platform Expo token. */
  async getExpoPushToken(): Promise<string | null> {
    if (!this.isSupported) return null;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId || typeof projectId !== 'string') return null;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data ?? null;
    } catch {
      // Simulators and development clients without push credentials cannot get a token.
      return null;
    }
  },

  async saveExpoPushToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(getFirestoreDb(), 'users', uid), {
      expoPushTokens: arrayUnion(token),
      'notificationPrefs.pushEnabled': true,
    });
  },

  /** If permission is already granted, refresh the stored token without prompting. */
  async syncPushToken(uid: string): Promise<void> {
    const status = await this.getPermissionStatus();
    if (status !== 'granted') return;
    const token = await this.getExpoPushToken();
    if (token) await this.saveExpoPushToken(uid, token);
  },

  /** Prompt for permission, acquire the token, and store it against the user. */
  async registerForPushNotifications(uid: string): Promise<'enabled' | 'denied' | 'unavailable'> {
    if (!this.isSupported) return 'unavailable';
    const granted = await this.requestPermission();
    if (!granted) return 'denied';
    const token = await this.getExpoPushToken();
    if (!token) return 'unavailable';
    await this.saveExpoPushToken(uid, token);
    return 'enabled';
  },

  async unregister(uid: string): Promise<void> {
    const token = await this.getExpoPushToken();
    await updateDoc(doc(getFirestoreDb(), 'users', uid), {
      ...(token ? { expoPushTokens: arrayRemove(token) } : {}),
      'notificationPrefs.pushEnabled': false,
    });
  },
};
