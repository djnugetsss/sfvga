import type { Announcement, Event } from '@sfvga/shared-types';
import { buildNotificationFeed, countUnread, formatUnreadBadge } from '@/utils/notifications';

const ts = (ms: number) => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 });

const announcement = (id: string, createdMs: number, eventId?: string): Announcement => ({
  id,
  title: `Announcement ${id}`,
  body: 'Body text',
  eventId,
  createdBy: 'admin',
  createdAt: ts(createdMs),
});

describe('formatUnreadBadge', () => {
  it('hides zero, shows exact single-digit counts, and caps larger counts', () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(1)).toBe('1');
    expect(formatUnreadBadge(9)).toBe('9');
    expect(formatUnreadBadge(10)).toBe('9+');
    expect(formatUnreadBadge(42)).toBe('9+');
  });
});

const eventSource = (eventId: string, startMs: number) => ({
  eventId,
  event: {
    id: eventId,
    title: `Event ${eventId}`,
    startAt: ts(startMs),
  } as unknown as Event,
});

describe('buildNotificationFeed', () => {
  const NOW = 1_000_000_000_000;

  it('places upcoming reminders (soonest first) before newest-first announcements', () => {
    const items = buildNotificationFeed(
      [announcement('a1', NOW - 5000), announcement('a2', NOW - 1000)],
      [eventSource('e-late', NOW + 20_000), eventSource('e-soon', NOW + 5_000)],
      new Set(),
      NOW,
    );

    expect(items.map((i) => i.id)).toEqual([
      'reminder:e-soon',
      'reminder:e-late',
      'announcement:a2',
      'announcement:a1',
    ]);
  });

  it('omits reminders for events that already started', () => {
    const items = buildNotificationFeed([], [eventSource('past', NOW - 5_000)], new Set(), NOW);
    expect(items).toHaveLength(0);
  });

  it('marks items read from the provided read-id set and counts unread', () => {
    const items = buildNotificationFeed(
      [announcement('a1', NOW - 1000)],
      [eventSource('e1', NOW + 5_000)],
      new Set(['announcement:a1']),
      NOW,
    );

    const announcementItem = items.find((i) => i.id === 'announcement:a1');
    const reminderItem = items.find((i) => i.id === 'reminder:e1');
    expect(announcementItem?.read).toBe(true);
    expect(reminderItem?.read).toBe(false);
    expect(countUnread(items)).toBe(1);
  });

  it('carries eventId on reminders and event-scoped announcements for navigation', () => {
    const items = buildNotificationFeed(
      [announcement('a1', NOW - 1000, 'evt-42')],
      [eventSource('evt-99', NOW + 5_000)],
      new Set(),
      NOW,
    );
    expect(items.find((i) => i.id === 'announcement:a1')?.eventId).toBe('evt-42');
    expect(items.find((i) => i.id === 'reminder:evt-99')?.eventId).toBe('evt-99');
  });
});
