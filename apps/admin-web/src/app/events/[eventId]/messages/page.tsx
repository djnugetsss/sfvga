'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useRegistrations } from '@/hooks/useRegistrations';
import { RequireEventPermission } from '@/components/RequireEventPermission';
import { EventNavigation } from '@/components/events/EventNavigation';
import { RegistrationConversation } from '@/components/registrations/RegistrationConversation';
import { PageHeader, Input, Skeleton, ErrorBanner } from '@/components/ui/primitives';

function Conversations({ eventId }: { eventId: string }) {
  const { data: event } = useEvent(eventId);
  const { data: registrations = [], isLoading, isError, refetch } = useRegistrations(eventId);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const selectLinked = () => {
      try {
        if (window.location.hash.startsWith('#registration-'))
          setSelected(decodeURIComponent(window.location.hash.slice(14)));
      } catch {
        /* Ignore malformed links. */
      }
    };
    selectLinked();
    window.addEventListener('hashchange', selectLinked);
    return () => window.removeEventListener('hashchange', selectLinked);
  }, []);
  const active = registrations.find((r) => r.id === selected);
  const term = search.trim().toLowerCase();
  const filtered = registrations
    .filter(
      (r) =>
        !term ||
        [r.accountPhone, r.payerName, ...r.attendees.map((a) => a.name)].some((value) =>
          value?.toLowerCase().includes(term),
        ),
    )
    .sort((a, b) => Number(Boolean(b.adminUnread)) - Number(Boolean(a.adminUnread)));
  return (
    <>
      <PageHeader
        title="Messages"
        description={
          event
            ? `${event.title} — private registration conversations`
            : 'Private registration conversations'
        }
      />
      <EventNavigation eventId={eventId} />
      {isError ? (
        <ErrorBanner message="Couldn't load conversations." onRetry={() => refetch()} />
      ) : null}
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading conversations"
          className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
        >
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-2 border-b border-border p-4 last:border-0">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-6 w-1/2" />
            <div className="mt-6 space-y-4">
              <Skeleton className="h-14 w-3/4 rounded-xl" />
              <Skeleton className="ml-auto h-14 w-2/3 rounded-xl" />
            </div>
            <Skeleton className="mt-8 h-12 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3" aria-label="Registration conversations">
            <Input
              aria-label="Search conversations"
              placeholder="Search name, phone, or payer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border lg:max-h-[65vh]">
              {filtered.length ? (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={r.id === selected}
                    className={`block min-h-16 w-full border-b border-border p-4 text-left last:border-0 ${r.id === selected ? 'bg-surfaceMuted' : 'bg-surface'}`}
                    onClick={() => {
                      const next = selected === r.id ? '' : r.id;
                      setSelected(next);
                      window.history.replaceState(
                        null,
                        '',
                        next
                          ? `#registration-${encodeURIComponent(next)}`
                          : window.location.pathname,
                      );
                    }}
                  >
                    <span className="block font-semibold text-ink">
                      {r.attendees[0]?.name || 'Registration'}
                      {r.attendees.length > 1 ? ` +${r.attendees.length - 1}` : ''}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {r.adminUnread
                        ? 'Unread message'
                        : r.lastMessageAt
                          ? 'View conversation'
                          : 'Start a conversation'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-sm text-muted">No registrations match.</p>
              )}
            </div>
          </aside>
          {active ? (
            <div className="min-w-0">
              <h2 className="mb-3 text-lg font-semibold">
                {active.attendees.map((a) => a.name).join(', ')}
              </h2>
              <RegistrationConversation
                key={active.id}
                eventId={eventId}
                event={event ?? undefined}
                registration={active}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-border p-6 text-muted">
              Select a registration to read or send a private message.
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default function EventMessagesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <RequireEventPermission eventId={eventId} permission="registrations.view">
      <RequireEventPermission eventId={eventId} permission="registrations.manage">
        <Conversations eventId={eventId} />
      </RequireEventPermission>
    </RequireEventPermission>
  );
}
