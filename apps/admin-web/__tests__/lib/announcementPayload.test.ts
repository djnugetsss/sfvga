import { buildAnnouncementRequest } from '@/lib/announcementPayload';

describe('buildAnnouncementRequest', () => {
  it('omits eventId for an organization-wide announcement', () => {
    expect(
      buildAnnouncementRequest({ title: 'Community update', body: 'Hello everyone.' }),
    ).toEqual({ title: 'Community update', body: 'Hello everyone.' });
  });

  it('includes eventId for an event announcement', () => {
    expect(
      buildAnnouncementRequest({
        title: 'Parking update',
        body: 'Use the east entrance.',
        eventId: 'event-123',
      }),
    ).toEqual({
      title: 'Parking update',
      body: 'Use the east entrance.',
      eventId: 'event-123',
    });
  });
});
