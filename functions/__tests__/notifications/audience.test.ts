import {
  shouldReceiveNotification,
  collectTokensForUsers,
  truncateBody,
  isUtcTomorrow,
} from '../../src/notifications/audience';

describe('shouldReceiveNotification', () => {
  it('defaults to true when prefs are missing', () => {
    expect(shouldReceiveNotification(undefined, 'announcements')).toBe(true);
  });

  it('respects explicit opt-out', () => {
    expect(
      shouldReceiveNotification({ announcements: false, eventReminders: true }, 'announcements'),
    ).toBe(false);
    expect(
      shouldReceiveNotification({ announcements: true, eventReminders: false }, 'eventReminders'),
    ).toBe(false);
  });
});

describe('collectTokensForUsers', () => {
  it('deduplicates tokens and skips opted-out users', () => {
    const tokens = collectTokensForUsers(
      [
        {
          uid: 'a',
          expoPushTokens: ['ExpoPushToken[e1]'],
          fcmTokens: ['t1', 't2'],
          notificationPrefs: { announcements: true },
        },
        { uid: 'b', fcmTokens: ['t2'], notificationPrefs: { announcements: false } },
      ],
      'announcements',
    );
    expect(tokens.sort()).toEqual(['ExpoPushToken[e1]', 't1', 't2']);
  });
});

describe('truncateBody', () => {
  it('truncates long announcement bodies', () => {
    const long = 'a'.repeat(150);
    expect(truncateBody(long).length).toBeLessThanOrEqual(120);
    expect(truncateBody('short')).toBe('short');
  });
});

describe('isUtcTomorrow', () => {
  it('detects UTC tomorrow boundaries', () => {
    const now = new Date('2026-07-14T15:00:00Z');
    const tomorrow = new Date('2026-07-15T10:00:00Z');
    const today = new Date('2026-07-14T10:00:00Z');
    expect(isUtcTomorrow(tomorrow, now)).toBe(true);
    expect(isUtcTomorrow(today, now)).toBe(false);
  });
});
