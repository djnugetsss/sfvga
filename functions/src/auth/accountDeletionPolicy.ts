/** Interim SFVGA policy, subject to the president's review. */
export const REGISTRATION_NAME_RETENTION_MONTHS = 6;

/** Keep event registration names for six calendar months after the event ends. */
export function registrationNamesExpireAt(eventEnd: Date, deletedAt: Date): Date {
  const date = new Date(eventEnd.getTime());
  if (!Number.isFinite(date.getTime())) return registrationNamesExpireAt(deletedAt, deletedAt);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + REGISTRATION_NAME_RETENTION_MONTHS);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date;
}

export function scrubRegistrationNames(registration: {
  attendees?: { name?: string; [key: string]: unknown }[];
}): { attendees?: { name?: string; [key: string]: unknown }[] } {
  if (!Array.isArray(registration.attendees)) return {};
  return {
    attendees: registration.attendees.map((attendee) => ({ ...attendee, name: 'Former member' })),
  };
}
