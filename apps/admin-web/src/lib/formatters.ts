/** Serializable Firestore timestamp shape shared across the monorepo. */
interface TimestampShape {
  seconds: number;
  nanoseconds: number;
}
interface AdminTimestampShape {
  _seconds: number;
  _nanoseconds: number;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/**
 * Normalize the timestamp shapes we encounter (a real firebase Timestamp with toDate(), the
 * serializable { seconds, nanoseconds } shape, or an already-converted Date) into a Date.
 */
export function toDate(
  value: Date | TimestampShape | AdminTimestampShape | { toDate(): Date } | null | undefined,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if ('toDate' in value && typeof value.toDate === 'function') return value.toDate();
  if ('seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if ('_seconds' in value && typeof value._seconds === 'number') {
    return new Date(value._seconds * 1000);
  }
  return null;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(date);
}

export function formatNotificationDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Value for an <input type="datetime-local"> (local time, no timezone suffix). */
export function toDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

/** LA wall time, independent of the organizer's browser timezone; reject DST gaps. */
export function pacificInputToIso(local: string): string | undefined {
  if (!local) return undefined;
  const wall = Date.parse(`${local}Z`);
  if (!Number.isFinite(wall)) return undefined;
  for (const offset of [7, 8]) {
    const candidate = new Date(wall + offset * 60 * 60 * 1000);
    if (toDateTimeLocalValue(candidate) === local) return candidate.toISOString();
  }
  return undefined;
}
