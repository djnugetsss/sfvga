import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseApp, getFirestoreDb } from '@/services/firebase';

type PermissionState = 'granted' | 'denied' | 'default';
// Firebase's VAPID public key identifies this web app; unlike the private key, it is safe
// and necessary to ship to every browser.
const FIREBASE_WEB_PUSH_PUBLIC_KEY =
  'BG7HDCkosVzGm2W4fCGVnxWxs9e98O_PeQS7KrRtAsyr96O0Q6i_WmIDIAAwniU7ATpNnAPh0a3bFfXlURfQGZk';

function getNotificationApi():
  | {
      permission: PermissionState;
      requestPermission: () => Promise<PermissionState>;
    }
  | undefined {
  return (
    globalThis as unknown as {
      Notification?: {
        permission: PermissionState;
        requestPermission: () => Promise<PermissionState>;
      };
    }
  ).Notification;
}

function hasBrowserPushApis(): boolean {
  const browser = globalThis as unknown as {
    isSecureContext?: boolean;
    navigator?: { serviceWorker?: unknown };
  };
  return Boolean(
    browser.isSecureContext &&
      browser.navigator?.serviceWorker &&
      getNotificationApi(),
  );
}

async function supportsWebPush(): Promise<boolean> {
  return hasBrowserPushApis() && (await isSupported());
}

async function getWebToken(): Promise<string | null> {
  if (!(await supportsWebPush())) return null;
  const vapidKey =
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY?.trim() || FIREBASE_WEB_PUSH_PUBLIC_KEY;
  try {
    return await getToken(getMessaging(getFirebaseApp()), { vapidKey });
  } catch {
    return null;
  }
}

export const notificationService = {
  isSupported: true,

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
    if (!(await supportsWebPush())) return 'unsupported';
    const permission = getNotificationApi()?.permission;
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'denied';
    return 'undetermined';
  },

  async requestPermission(): Promise<boolean> {
    // Keep the browser prompt directly in the member's tap handler. iOS Home Screen
    // web apps reject delayed permission requests after the user gesture has expired.
    if (!hasBrowserPushApis()) return false;
    const api = getNotificationApi();
    if (!api) return false;
    if (api.permission === 'granted') return true;
    return (await api.requestPermission()) === 'granted';
  },

  async getExpoPushToken(): Promise<string | null> {
    return getWebToken();
  },

  async saveExpoPushToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(getFirestoreDb(), 'users', uid), {
      fcmTokens: arrayUnion(token),
      'notificationPrefs.pushEnabled': true,
    });
  },

  async syncPushToken(uid: string): Promise<void> {
    if ((await this.getPermissionStatus()) !== 'granted') return;
    const token = await getWebToken();
    if (token) await this.saveExpoPushToken(uid, token);
  },

  async registerForPushNotifications(uid: string): Promise<'enabled' | 'denied' | 'unavailable'> {
    const api = getNotificationApi();
    if (!api || !(await this.requestPermission())) {
      return api?.permission === 'denied' ? 'denied' : 'unavailable';
    }
    const token = await getWebToken();
    if (!token) return 'unavailable';
    await this.saveExpoPushToken(uid, token);
    return 'enabled';
  },

  async unregister(uid: string): Promise<void> {
    const messaging = getMessaging(getFirebaseApp());
    const token = await getWebToken();
    if (token) await deleteToken(messaging);
    await updateDoc(doc(getFirestoreDb(), 'users', uid), {
      ...(token ? { fcmTokens: arrayRemove(token) } : {}),
      'notificationPrefs.pushEnabled': false,
    });
  },
};
