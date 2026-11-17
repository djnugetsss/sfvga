import { getMessaging } from 'firebase-admin/messaging';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const FCM_BATCH_SIZE = 500;
const EXPO_BATCH_SIZE = 100;

export function isExpoPushToken(token: string): boolean {
  return /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function webNotificationLink(data: Record<string, string> | undefined): string {
  const origin = 'https://sfvga-cabe6.web.app';
  if (data?.type === 'admin_registration_message' || data?.type === 'admin_registration_attention')
    return `${origin}/admin`;
  if (data?.type === 'registration_confirmed' && data.eventId) {
    return `${origin}/tickets?focusEventId=${encodeURIComponent(data.eventId)}`;
  }
  if (data?.eventId && ['payment', 'registration_message'].includes(data.type))
    return `${origin}/events/${encodeURIComponent(data.eventId)}/register`;
  if (data?.eventId) return `${origin}/events/${encodeURIComponent(data.eventId)}`;
  return `${origin}/notifications`;
}

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<number> {
  let sent = 0;
  for (const batch of chunk(tokens, EXPO_BATCH_SIZE)) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            sound: 'default',
            priority: 'high',
            title: message.title,
            body: message.body,
            data: message.data,
          })),
        ),
      });
      if (!response.ok) {
        console.error(`Expo push request failed with status ${response.status}`);
        continue;
      }
      const result = (await response.json()) as {
        data?: Array<{ status?: string; message?: string }>;
      };
      sent += result.data?.filter((receipt) => receipt.status === 'ok').length ?? 0;
      for (const receipt of result.data ?? []) {
        if (receipt.status !== 'ok') console.warn('Expo push rejected a token', receipt.message);
      }
    } catch (error) {
      console.error('Expo push delivery failed', error);
    }
  }
  return sent;
}

async function sendFcmPush(tokens: string[], message: PushMessage): Promise<number> {
  if (tokens.length === 0) return 0;
  const messaging = getMessaging();
  let sent = 0;
  for (const batch of chunk(tokens, FCM_BATCH_SIZE)) {
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: 'https://sfvga-cabe6.web.app/icon.svg',
          },
          fcmOptions: { link: webNotificationLink(message.data) },
        },
      });
      sent += response.successCount;
    } catch (error) {
      console.error('FCM push delivery failed', error);
    }
  }
  return sent;
}

/**
 * Send through Expo (FCM/APNs), retaining support for legacy native FCM tokens.
 * stale-token cleanup is deferred (nonprofit scale).
 */
export async function sendPushToTokens(tokens: string[], message: PushMessage): Promise<number> {
  // Local feature testing must never notify real devices.
  if (process.env.FUNCTIONS_EMULATOR === 'true') return 0;
  if (tokens.length === 0) return 0;

  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  const expoTokens = uniqueTokens.filter(isExpoPushToken);
  const fcmTokens = uniqueTokens.filter((token) => !isExpoPushToken(token));
  const [expoSent, fcmSent] = await Promise.all([
    sendExpoPush(expoTokens, message),
    sendFcmPush(fcmTokens, message),
  ]);
  return expoSent + fcmSent;
}
