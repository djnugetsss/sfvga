import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

/** The serializable Firestore timestamp shape shared across the monorepo. */
interface TimestampShape {
  seconds: number;
  nanoseconds: number;
}

/**
 * Normalize the several timestamp shapes we encounter into a Date:
 * - a real firebase/firestore Timestamp (has toDate())
 * - the serializable { seconds, nanoseconds } shape from shared-types
 * - an already-converted Date
 * Returns null when there's nothing usable to convert.
 */
export function toDate(
  value: Date | TimestampShape | { toDate(): Date } | null | undefined,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if ('toDate' in value && typeof value.toDate === 'function') return value.toDate();
  if ('seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return null;
}

/** Format a Firestore-like timestamp or Date for display. */
export function formatEventDate(date: Date): string {
  return format(date, 'EEE, MMM d, yyyy');
}

export function formatEventTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function formatEventDateTime(date: Date): string {
  return format(date, 'EEE, MMM d · h:mm a');
}

export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatNotificationDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatCountdown(date: Date): string {
  if (isPast(date)) return 'Event ended';
  if (isFuture(date)) {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Happening today';
    if (days === 1) return 'in 1 day';
    return `in ${days} days`;
  }
  return 'Happening now';
}

/**
 * One-line countdown label for the "What's Next" card (UI spec §3):
 * "in 5 days" before the event, "Happening now" during it, "Event ended" after.
 */
export function eventCountdownLabel(start: Date, end: Date): string {
  const now = Date.now();
  if (now >= start.getTime() && now <= end.getTime()) return 'Happening now';
  if (now < start.getTime()) return formatCountdown(start);
  return 'Event ended';
}

/** Countdown copy for the Event Detail screen (UI/UX §5). Returns empty after the event ends. */
export function eventDetailCountdownLabel(start: Date, end: Date): string {
  const now = Date.now();
  if (now >= start.getTime() && now <= end.getTime()) return 'Happening now';
  if (now > end.getTime()) return '';
  const days = Math.ceil((start.getTime() - now) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Happening today';
  if (days === 1) return '1 day until this event';
  return `${days} days until this event`;
}

export function countdownAccessibilityLabel(start: Date, end: Date): string {
  const label = eventDetailCountdownLabel(start, end);
  if (!label) return 'This event has ended';
  if (label === 'Happening now') return 'This event is happening now';
  if (label === 'Happening today') return 'This event is happening today';
  return label;
}
