import { notificationPushData } from '../../src/notifications/deliverMemberNotice';

describe('notification push data', () => {
  it('omits absent registration IDs from new-event notifications', () => {
    expect(
      notificationPushData({
        type: 'event_published',
        eventId: 'event-1',
        registrationId: undefined,
      }),
    ).toEqual({ type: 'event_published', eventId: 'event-1' });
  });

  it('keeps registration destinations and ignores invalid optional values', () => {
    expect(
      notificationPushData({
        type: 'payment',
        eventId: 'event-1',
        registrationId: 'registration-1',
        unused: 42,
      }),
    ).toEqual({
      type: 'payment',
      eventId: 'event-1',
      registrationId: 'registration-1',
    });
  });
});
