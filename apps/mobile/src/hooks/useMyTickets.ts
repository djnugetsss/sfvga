import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import type { Event, Ticket } from '@sfvga/shared-types';
import { ticketsEligible } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useMyRegistrations } from '@/hooks/useMyRegistrations';
import { useClock } from '@/hooks/useClock';
import { toDate } from '@/utils/dateFormat';

/** A ticket plus the event/registration it lives under (tickets are a subcollection). */
export interface TicketWithMeta extends Ticket {
  eventId: string;
  registrationId: string;
  /** Denormalized at mint time so wallets still show a name if the event doc is gone. */
  eventTitle?: string;
  eventStartAt?: Event['startAt'];
}

export interface EventTicketGroup {
  eventId: string;
  event: Event | null;
  /** Display title when the event doc is missing but tickets carried a denormalized name. */
  fallbackTitle?: string;
  tickets: TicketWithMeta[];
}

export interface MyTicketsSections {
  upcoming: EventTicketGroup[];
  past: EventTicketGroup[];
}

function eventStartMs(group: EventTicketGroup): number | null {
  const fromEvent = group.event ? toDate(group.event.startAt) : null;
  if (fromEvent) return fromEvent.getTime();
  const fromTicket = group.tickets.map((t) => toDate(t.eventStartAt)).find(Boolean);
  return fromTicket ? fromTicket.getTime() : null;
}

/** An ended event is past even when its tickets are still valid. */
export function splitTicketSections(
  groups: EventTicketGroup[],
  now = Date.now(),
): MyTicketsSections {
  const upcoming: EventTicketGroup[] = [];
  const past: EventTicketGroup[] = [];

  for (const group of groups) {
    // Revoked passes cannot be used or opened. Keep their records for server-side
    // check-in and audit, but don't clutter the member's ticket wallet with them.
    const visible = group.tickets.filter((ticket) => ticket.status !== 'revoked');
    if (visible.length === 0) continue;
    const end = group.event ? toDate(group.event.endAt) : null;
    if ((end && end.getTime() <= now) || group.event?.status === 'ended') {
      past.push({ ...group, tickets: visible });
      continue;
    }
    const unused = visible.filter((ticket) => ticket.status === 'valid');
    const used = visible.filter((ticket) => ticket.status === 'redeemed');
    if (unused.length > 0) {
      upcoming.push({ ...group, tickets: unused });
    }
    if (used.length > 0) {
      past.push({ ...group, tickets: used });
    }
  }

  // Closest first for upcoming; most recent first for past. Unknown dates go last.
  upcoming.sort((a, b) => {
    const aMs = eventStartMs(a) ?? Number.POSITIVE_INFINITY;
    const bMs = eventStartMs(b) ?? Number.POSITIVE_INFINITY;
    return aMs - bMs;
  });
  past.sort((a, b) => {
    const aMs = eventStartMs(a) ?? Number.NEGATIVE_INFINITY;
    const bMs = eventStartMs(b) ?? Number.NEGATIVE_INFINITY;
    return bMs - aMs;
  });

  return { upcoming, past };
}

function asEvent(data: Record<string, unknown>, id: string): Event | null {
  const title =
    (typeof data.title === 'string' && data.title.trim()) ||
    (typeof data.name === 'string' && data.name.trim()) ||
    '';
  if (!title && !data.startAt) return null;
  return { ...(data as unknown as Event), id, title: title || 'Untitled event' };
}

/**
 * The current member's tickets, split into upcoming (unused) and past (checked in / ended),
 * grouped by event and ordered by event start time — not purchase order.
 */
export function useMyTickets() {
  const now = useClock();
  const registrationsQuery = useMyRegistrations();
  const registrations = registrationsQuery.data ?? [];
  const queryClient = useQueryClient();

  const regKey = registrations
    .map(
      (r) => `${r.eventId}/${r.id}/${r.reviewRevision}/${r.ticketGeneration}/${ticketsEligible(r)}`,
    )
    .sort()
    .join(',');

  useEffect(() => {
    if (!registrations.length) return;
    const db = getFirestoreDb();
    const unsubscribers = registrations
      .filter((r) => r.eventId)
      .map((r) =>
        onSnapshot(
          collection(db, 'events', r.eventId, 'registrations', r.id, 'tickets'),
          () => queryClient.invalidateQueries({ queryKey: ['myTickets'] }),
          () => {
            /* keep last cached data on listener error */
          },
        ),
      );
    return () => unsubscribers.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regKey, queryClient]);

  const query = useQuery({
    queryKey: ['myTickets', regKey],
    enabled: registrationsQuery.isSuccess,
    queryFn: async (): Promise<EventTicketGroup[]> => {
      const db = getFirestoreDb();
      const eligible = registrations.filter((r) => Boolean(r.eventId) && ticketsEligible(r));
      if (eligible.length === 0) return [];

      // Fetch only registered events, not every image-heavy event document.
      const eventIds = [...new Set(eligible.map((registration) => registration.eventId))];
      const eventSnaps = await Promise.all(eventIds.map((id) => getDoc(doc(db, 'events', id))));
      const eventsById = new Map<string, Event>();
      for (const d of eventSnaps) {
        if (!d.exists()) continue;
        const mapped = asEvent(d.data() as Record<string, unknown>, d.id);
        if (mapped) eventsById.set(d.id, mapped);
      }

      const groups = new Map<string, EventTicketGroup>();

      await Promise.all(
        eligible.map(async (r) => {
          try {
            const ticketsSnap = await getDocs(
              collection(db, 'events', r.eventId, 'registrations', r.id, 'tickets'),
            );
            if (ticketsSnap.empty) return;

            const tickets: TicketWithMeta[] = ticketsSnap.docs
              .filter((d) => (d.get('generation') ?? 0) === (r.ticketGeneration ?? 0))
              .map((d) => {
                const data = d.data() as Ticket & {
                  eventTitle?: string;
                  eventStartAt?: Event['startAt'];
                };
                return {
                  ...data,
                  id: d.id,
                  eventId: data.eventId || r.eventId,
                  registrationId: r.id,
                  // Missing status (older/demo docs) still belongs in Upcoming.
                  status: data.status ?? 'valid',
                };
              });
            if (tickets.length === 0) return;

            const eventId = r.eventId;
            const event = eventsById.get(eventId) ?? null;
            const fallbackTitle =
              tickets.map((t) => t.eventTitle?.trim()).find(Boolean) || undefined;

            const existing = groups.get(eventId);
            if (existing) {
              existing.tickets.push(...tickets);
              if (!existing.event && event) existing.event = event;
              if (!existing.fallbackTitle && fallbackTitle) {
                existing.fallbackTitle = fallbackTitle;
              }
            } else {
              groups.set(eventId, {
                eventId,
                event,
                fallbackTitle,
                tickets,
              });
            }
          } catch {
            /* skip broken registration paths; still show other events' tickets */
          }
        }),
      );

      return Array.from(groups.values());
    },
  });

  return {
    ...query,
    data: query.data ? splitTicketSections(query.data, now) : undefined,
    isLoading: registrationsQuery.isLoading || query.isLoading,
    isError: registrationsQuery.isError || query.isError,
  };
}
