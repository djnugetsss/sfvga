import { ticketRevokeSchema } from '@sfvga/shared-validation';

describe('ticketRevokeSchema', () => {
  it('accepts a valid revoke payload', () => {
    const parsed = ticketRevokeSchema.parse({
      eventId: 'event-1',
      registrationId: 'reg-1',
      ticketId: 'ticket-1',
    });
    expect(parsed).toEqual({
      eventId: 'event-1',
      registrationId: 'reg-1',
      ticketId: 'ticket-1',
    });
  });

  it('rejects missing fields', () => {
    expect(() => ticketRevokeSchema.parse({ eventId: 'event-1' })).toThrow();
  });
});
