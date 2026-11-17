import type { Event } from '@sfvga/shared-types';
import { splitTicketSections, type EventTicketGroup } from '@/hooks/useMyTickets';

jest.mock('firebase/firestore', () => ({}));
jest.mock('@/services/firebase', () => ({}));
jest.mock('@/hooks/useMyRegistrations', () => ({}));

const now = Date.parse('2026-09-28T12:00:00Z');
const stamp = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0 });

function group(
  endMs: number,
  status: 'valid' | 'redeemed' | 'revoked' = 'valid',
): EventTicketGroup {
  return {
    eventId: String(endMs),
    event: {
      id: String(endMs),
      title: 'Event',
      status: 'published',
      startAt: stamp(endMs - 3600000),
      endAt: stamp(endMs),
    } as Event,
    tickets: [
      {
        id: 'ticket',
        eventId: String(endMs),
        registrationId: 'reg',
        status,
      } as EventTicketGroup['tickets'][number],
    ],
  };
}

describe('ticket wallet event sections', () => {
  it('moves still-valid and reissued tickets to Past at the event end time', () => {
    const ended = group(now);
    const upcoming = group(now + 3600000);
    const result = splitTicketSections([ended, upcoming], now);
    expect(result.past).toEqual([ended]);
    expect(result.upcoming).toEqual([upcoming]);
  });

  it('keeps redeemed tickets in Past before the event ends', () => {
    expect(splitTicketSections([group(now + 3600000, 'redeemed')], now).past).toHaveLength(1);
  });

  it('hides revoked tickets from both tabs while keeping valid replacements', () => {
    const replaced = group(now + 3600000);
    replaced.tickets.push({ ...replaced.tickets[0], id: 'old', status: 'revoked' });
    const result = splitTicketSections([replaced, group(now, 'revoked')], now);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].tickets.map((ticket) => ticket.id)).toEqual(['ticket']);
    expect(result.past).toHaveLength(0);
  });
});
