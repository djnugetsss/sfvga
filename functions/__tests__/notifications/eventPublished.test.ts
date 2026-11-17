import { publishedEventNotice } from '../../src/notifications/eventPublished';

const future = { toMillis: () => Date.now() + 60_000 };
const past = { toMillis: () => Date.now() - 60_000 };
const published = {
  status: 'published',
  title: 'Diwali Celebration',
  endAt: future,
  registrationDeadline: future,
};

describe('new event notices', () => {
  it('alerts members when an open event is first published', () => {
    expect(publishedEventNotice({ ...published, status: 'draft' }, published)).toEqual({
      title: 'New event: Diwali Celebration',
      body: 'Registration is open. View the event details and sign up in SFVGA.',
    });
    expect(publishedEventNotice(undefined, published)).not.toBeNull();
  });

  it('does not alert for drafts, ordinary edits, or closed events', () => {
    expect(publishedEventNotice(undefined, { ...published, status: 'draft' })).toBeNull();
    expect(publishedEventNotice(published, published)).toBeNull();
    expect(publishedEventNotice(undefined, { ...published, endAt: past })).toBeNull();
    expect(
      publishedEventNotice(undefined, { ...published, registrationDeadline: past }),
    ).toBeNull();
  });
});
