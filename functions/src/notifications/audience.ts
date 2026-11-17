export type NotificationPrefKey = 'announcements' | 'eventReminders';

/** Returns true unless the user has explicitly disabled this notification type. */
export function shouldReceiveNotification(
  prefs: { announcements?: boolean; eventReminders?: boolean } | undefined,
  key: NotificationPrefKey,
): boolean {
  if (!prefs) return true;
  return prefs[key] !== false;
}

/** Collect unique device tokens from a list of user documents, filtered by preference. */
export function collectTokensForUsers(
  users: Array<{
    uid: string;
    expoPushTokens?: string[];
    fcmTokens?: string[];
    notificationPrefs?: { announcements?: boolean; eventReminders?: boolean };
  }>,
  prefKey: NotificationPrefKey,
): string[] {
  const tokens = new Set<string>();
  for (const user of users) {
    if (!shouldReceiveNotification(user.notificationPrefs, prefKey)) continue;
    for (const token of user.expoPushTokens ?? []) {
      if (token) tokens.add(token);
    }
    for (const token of user.fcmTokens ?? []) {
      if (token) tokens.add(token);
    }
  }
  return Array.from(tokens);
}

/** Whether a Firestore Timestamp (or Date) falls on the next UTC calendar day from `now`. */
export function isUtcTomorrow(date: Date, now = new Date()): boolean {
  const tomorrowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const dayAfterStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2);
  const ms = date.getTime();
  return ms >= tomorrowStart && ms < dayAfterStart;
}

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whether `date` falls on tomorrow's calendar day in the given IANA timezone. */
export function isTomorrowInTimeZone(date: Date, timeZone: string, now = new Date()): boolean {
  const todayKey = dateKeyInTimeZone(now, timeZone);
  const [y, m, d] = todayKey.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const tomorrowKey = dateKeyInTimeZone(nextDay, timeZone);
  return dateKeyInTimeZone(date, timeZone) === tomorrowKey;
}

export function truncateBody(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
