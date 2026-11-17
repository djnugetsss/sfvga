import { registrationMessageNotice } from '../../src/notifications/registrationMessage';

describe('registration message admin notices', () => {
  it('notifies managers for each member message, including admin members', () => {
    expect(registrationMessageNotice('member', 'member-admin')).toMatchObject({
      title: 'New registration message',
    });
    expect(registrationMessageNotice('member', 'member-admin')).not.toHaveProperty('actorId');
  });

  it('notifies other managers for organizer replies, not the sender', () => {
    expect(registrationMessageNotice('organizer', 'organizer-1')).toMatchObject({
      title: 'Organizer message',
      actorId: 'organizer-1',
    });
  });

  it('does not duplicate system payment notices', () => {
    expect(registrationMessageNotice('system', 'system')).toBeNull();
  });
});
