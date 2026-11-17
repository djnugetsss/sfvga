import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { notifyRegistrationManagers } from '../shared/adminRegistrationNotices';

export function registrationMessageNotice(senderRole: unknown, senderId: unknown) {
  if (senderRole === 'member')
    return {
      title: 'New registration message',
      body: 'A member sent a private message. Open the conversation to read and reply.',
    };
  if (senderRole === 'organizer')
    return {
      title: 'Organizer message',
      body: 'An organizer replied in a registration conversation. Open it to read the update.',
      actorId: typeof senderId === 'string' ? senderId : undefined,
    };
  return null;
}

export const notifications_registrationMessage = onDocumentCreated(
  { document: 'events/{eventId}/registrations/{registrationId}/messages/{messageId}', retry: true },
  async (event) => {
    const notice = registrationMessageNotice(
      event.data?.get('senderRole'),
      event.data?.get('senderId'),
    );
    if (!notice) return;
    await notifyRegistrationManagers({
      ...notice,
      id: `message-${event.params.eventId}-${event.params.registrationId}-${event.params.messageId}`,
      eventId: event.params.eventId,
      registrationId: event.params.registrationId,
      // Member managers still receive notices in their separate admin inbox;
      // an organizer does not receive a notice for their own reply.
      type: 'admin_registration_message',
    });
  },
);
