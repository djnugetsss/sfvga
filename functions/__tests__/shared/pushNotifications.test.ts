import { isExpoPushToken, webNotificationLink } from '../../src/shared/pushNotifications';

describe('isExpoPushToken', () => {
  it('recognizes current and legacy Expo token formats', () => {
    expect(isExpoPushToken('ExpoPushToken[abc123]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[abc123]')).toBe(true);
  });

  it('does not treat native Firebase tokens as Expo tokens', () => {
    expect(isExpoPushToken('native-fcm-token')).toBe(false);
    expect(isExpoPushToken('ExpoPushToken[]')).toBe(false);
  });
});

describe('webNotificationLink', () => {
  it('opens registration confirmations at the matching tickets', () => {
    expect(webNotificationLink({ type: 'registration_confirmed', eventId: 'event 1' })).toBe(
      'https://sfvga-cabe6.web.app/tickets?focusEventId=event%201',
    );
  });

  it('opens event notifications at event details and organization notices at notifications', () => {
    expect(webNotificationLink({ type: 'event_reminder', eventId: 'abc' })).toBe(
      'https://sfvga-cabe6.web.app/events/abc',
    );
    expect(webNotificationLink({ type: 'announcement' })).toBe(
      'https://sfvga-cabe6.web.app/notifications',
    );
  });
});
