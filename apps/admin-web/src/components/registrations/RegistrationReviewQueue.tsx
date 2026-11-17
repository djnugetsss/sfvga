'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Event, Registration } from '@sfvga/shared-types';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission } from '@/lib/permissions';
import { getFirestoreDb } from '@/services/firebase';
import { toDate, formatDateTime } from '@/lib/formatters';
import { isEventPast, registrationAttentionState } from '@/lib/registrationQueue';
import { Card, ErrorBanner, Skeleton } from '@/components/ui/primitives';

export function RegistrationReviewQueue({ events }: { events: Event[] }) {
  const { access } = useAdminAuth();
  const allowed = useMemo(
    () => events.filter((e) => hasEventPermission(access, e.id, 'registrations.view')),
    [events, access],
  );
  const [records, setRecords] = useState<Record<string, Registration[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now);
  const [filter, setFilter] = useState<'payments' | 'messages'>('payments');
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setRecords({});
    setErrors({});
    const unsubscribers = allowed.map((event) =>
      onSnapshot(
        collection(getFirestoreDb(), 'events', event.id, 'registrations'),
        (snap) =>
          setRecords((r) => ({
            ...r,
            [event.id]: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Registration),
          })),
        (e) => setErrors((r) => ({ ...r, [event.id]: e.message })),
      ),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [allowed]);
  const all = allowed
    .filter((event) => !isEventPast(event, now))
    .flatMap((event) =>
      (records[event.id] ?? []).filter((reg) => !reg.accountDeleted).map((reg) => ({ event, reg })),
    );
  const queue = all
    .filter(({ event, reg }) => registrationAttentionState(event, reg, now) !== null)
    .sort(
      (a, b) =>
        Number(Boolean(b.reg.resubmittedAt && b.reg.reviewStatus === 'pending')) -
          Number(Boolean(a.reg.resubmittedAt && a.reg.reviewStatus === 'pending')) ||
        (toDate(a.reg.createdAt)?.getTime() ?? 0) - (toDate(b.reg.createdAt)?.getTime() ?? 0),
    );
  const unread = all.filter(
    ({ event, reg }) =>
      reg.adminUnread && hasEventPermission(access, event.id, 'registrations.manage'),
  );
  const link = ({ event, reg }: (typeof all)[number], destination: 'payments' | 'messages') => (
    <Link
      className="flex min-h-12 items-center justify-between gap-4 rounded-xl px-2 py-4 hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      href={`/events/${event.id}/${destination === 'messages' ? 'messages' : 'registrations'}#registration-${encodeURIComponent(reg.id)}`}
    >
      <span className="min-w-0">
        <span className="block break-words font-semibold">
          {reg.attendees[0]?.name || 'Registration'}
          {reg.attendees.length > 1 ? ` + ${reg.attendees.length - 1}` : ''}
        </span>
        <span className="mt-1 block break-words text-sm text-muted">{event.title}</span>
        <span className="mt-2 block text-sm text-muted">
          {destination === 'messages'
            ? 'Unread message'
            : registrationAttentionState(event, reg, now)}
        </span>
        <span className="mt-1 block text-sm text-muted">
          {toDate(reg.submittedAt ?? reg.createdAt)
            ? formatDateTime(toDate(reg.submittedAt ?? reg.createdAt)!)
            : ''}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold">
        Open <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
  const loading = allowed.some((event) => !records[event.id] && !errors[event.id]);
  const rows = filter === 'payments' ? queue : unread;
  if (!allowed.length) return null;
  return (
    <Card className={queue.length || unread.length ? 'border-l-4 border-l-accent' : ''}>
      <h2 className="text-lg font-semibold text-brand">Registrations needing attention</h2>
      {!loading && (queue.length > 0 || unread.length > 0) ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accentSoft px-4 py-3 text-accentStrong"
          role="status"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accentStrong text-lg font-bold text-white"
            aria-hidden="true"
          >
            !
          </span>
          <p className="self-center text-sm leading-6 sm:text-base">
            <strong>
              {queue.length} registration{queue.length === 1 ? '' : 's'} to check
            </strong>
            {unread.length > 0
              ? ` · ${unread.length} unread message${unread.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
      ) : null}
      <div className="my-4 grid grid-cols-2 gap-3" aria-label="Registration queue filters">
        {(['payments', 'messages'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setShowAll(false);
            }}
            className={`min-h-24 rounded-xl border px-4 py-3 text-left transition-colors ${filter === value ? 'border-brand/35 bg-brandSoft text-brand' : 'border-border bg-surface text-ink hover:border-brand/25 hover:bg-surfaceMuted'}`}
          >
            <span className="block text-base font-semibold">
              {value === 'payments' ? 'Payments' : 'Messages'}
            </span>
            <strong className="mt-1 block text-2xl leading-none">
              {value === 'payments' ? queue.length : unread.length}
            </strong>
            <span className="mt-1 block text-xs text-muted">
              {value === 'payments' ? 'Registrations to check' : 'Unread replies'}
            </span>
          </button>
        ))}
      </div>
      {Object.entries(errors).map(([id, message]) => (
        <ErrorBanner key={id} message={message} />
      ))}
      {loading ? (
        <div role="status" aria-label="Loading registrations" className="space-y-3 py-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !rows.length && !Object.keys(errors).length ? (
        <p className="py-6 text-sm text-muted">
          {filter === 'payments'
            ? 'You’re all caught up. No registrations need review.'
            : 'You’re all caught up. No unread registration messages.'}
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {(showAll ? rows : rows.slice(0, 6)).map((row) => (
          <li key={`${row.event.id}/${row.reg.id}`}>{link(row, filter)}</li>
        ))}
      </ul>
      {rows.length > 6 ? (
        <button
          type="button"
          className="mt-3 min-h-12 w-full text-sm font-semibold underline underline-offset-4"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      ) : null}
    </Card>
  );
}
