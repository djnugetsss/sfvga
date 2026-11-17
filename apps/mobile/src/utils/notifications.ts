import type { Announcement, Event } from '@sfvga/shared-types';
import { toDate, formatNotificationDateTime, formatCountdown } from './dateFormat';

export type NotificationType =
  | 'announcement'
  | 'reminder'
  | 'payment'
  | 'registration_message'
  | 'registration_confirmed'
  | 'admin_registration_message'
  | 'event_published';

/**
 * A row in the Notifications Center: durable private notices, announcements, or event
 * reminders. Read/unread is tracked locally on-device.
 */
export interface NotificationItem {
  /** Stable id used for local read tracking: `announcement:{id}` or `reminder:{eventId}`. */
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Epoch ms used for ordering (announcement createdAt / event startAt); null if unknown. */
  timestamp: number | null;
  /** Human label: relative time for announcements, countdown for reminders. */
  timeLabel?: string;
  /** Present for reminders and event-scoped announcements so a tap can open the event. */
  eventId?: string;
  eventTitle?: string;
  read: boolean;
}

/** An event the current member is registered for, used to build reminder items. */
export interface ReminderSource {
  eventId: string;
  event: Event | null;
}

/**
 * Build the ordered notification feed. Event reminders for upcoming registered events come
 * first (soonest first, since they are the most time-sensitive), followed by announcements
 * newest-first. Past events produce no reminder.
 */
export function buildNotificationFeed(
  announcements: Announcement[],
  reminderEvents: ReminderSource[],
  readIds: Set<string>,
  now: number = Date.now(),
): NotificationItem[] {
  const reminders = reminderEvents
    .flatMap((src) => {
      if (!src.event) return [];
      const start = toDate(src.event.startAt);
      if (!start) return [];
      const startMs = start.getTime();
      if (startMs < now) return [];
      const id = `reminder:${src.eventId}`;
      const item: NotificationItem = {
        id,
        type: 'reminder',
        title: src.event.title,
        body: "You're registered for this event.",
        timestamp: startMs,
        timeLabel: formatCountdown(start),
        eventId: src.eventId,
        read: readIds.has(id),
      };
      return [{ startMs, item }];
    })
    .sort((a, b) => a.startMs - b.startMs)
    .map((r) => r.item);

  const announcementItems = announcements
    .map((a) => {
      const created = toDate(a.createdAt);
      const createdMs = created ? created.getTime() : 0;
      const id = `announcement:${a.id}`;
      const item: NotificationItem = {
        id,
        type: 'announcement',
        title: a.title,
        body: a.body,
        timestamp: created ? createdMs : null,
        timeLabel: created ? formatNotificationDateTime(created) : undefined,
        eventId: a.eventId,
        read: readIds.has(id),
      };
      return { createdMs, item };
    })
    .sort((a, b) => b.createdMs - a.createdMs)
    .map((a) => a.item);

  return [...reminders, ...announcementItems];
}

/** Count of unread items in a built feed. */
export function countUnread(items: NotificationItem[]): number {
  return items.reduce((n, item) => (item.read ? n : n + 1), 0);
}

/** Keep the compact Home badge legible while preserving the exact count for screen readers. */
export function formatUnreadBadge(count: number, limit: number = 9): string | null {
  if (count <= 0) return null;
  return count > limit ? `${limit}+` : String(count);
}
