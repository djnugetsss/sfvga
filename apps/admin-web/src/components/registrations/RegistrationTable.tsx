'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import type { PaymentStatus } from '@sfvga/shared-types';
import { ticketsEligible } from '@sfvga/shared-types';
import type { AdminRegistration } from '@/hooks/useRegistrations';
import type { AdminTicket } from '@/hooks/useEventTickets';
import { RegistrationTicketList } from '@/components/registrations/RegistrationTicketList';
import { Input, Select, Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { formatCurrency, toDate, formatDateTime } from '@/lib/formatters';
import { usePaymentDecisions } from '@/hooks/usePaymentDecisions';
import Link from 'next/link';

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'warning' | 'neutral'> = {
  paid: 'success',
  unpaid: 'warning',
  free: 'neutral',
};

interface RegistrationTableProps {
  eventId: string;
  canManage?: boolean;
  registrations: AdminRegistration[];
  eventTitle: string;
  ticketsByRegistration?: Record<string, AdminTicket[]>;
}

export function RegistrationTable({
  eventId,
  canManage = false,
  registrations,
  eventTitle,
  ticketsByRegistration,
}: RegistrationTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());
  const review = usePaymentDecisions(eventId);
  const [confirming, setConfirming] = useState(false);
  const openedHash = useRef('');

  useEffect(() => {
    // Payment links reveal the registration's ticket details.
    const openLinkedRegistration = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#registration-') || hash === openedHash.current) return;
      let id: string;
      try {
        id = decodeURIComponent(hash.slice('#registration-'.length));
      } catch {
        return;
      }
      if (!registrations.some((registration) => registration.id === id)) return;
      openedHash.current = hash;
      setSearch('');
      setStatus('all');
      setExpandedId(id);
      requestAnimationFrame(() =>
        document.getElementById(`registration-${id}`)?.scrollIntoView({ block: 'center' }),
      );
    };
    openLinkedRegistration();
    window.addEventListener('hashchange', openLinkedRegistration);
    return () => window.removeEventListener('hashchange', openLinkedRegistration);
  }, [eventId, registrations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations
      .filter((reg) => (status === 'all' ? true : reg.paymentStatus === status))
      .filter((reg) =>
        term === ''
          ? true
          : [
              reg.accountPhone,
              reg.payerName,
              reg.paymentNote,
              ...reg.attendees.map((a) => a.name),
            ].some((value) => value?.toLowerCase().includes(term)),
      )
      .sort(
        (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
      );
  }, [registrations, search, status]);

  const attendeeCount = filtered.reduce((sum, reg) => sum + reg.attendees.length, 0);

  const ticketSummary = (reg: AdminRegistration) => {
    const tickets = (ticketsByRegistration?.[reg.id] ?? []).filter(
      (ticket) => (ticket.generation ?? 0) === (reg.ticketGeneration ?? 0),
    );
    if (tickets.length === 0) return null;
    const revoked = tickets.filter((t) => t.status === 'revoked').length;
    const redeemed = tickets.filter((t) => t.status === 'redeemed').length;
    const valid = tickets.filter((t) => t.status === 'valid').length;
    const parts: string[] = [];
    if (valid) parts.push(`${valid} valid`);
    if (redeemed) parts.push(`${redeemed} checked in`);
    if (revoked) parts.push(`${revoked} revoked`);
    return parts.join(' · ');
  };

  const exportCsv = () => {
    const rows = filtered.map((reg) => {
      const created = toDate(reg.createdAt);
      const tickets = (ticketsByRegistration?.[reg.id] ?? []).filter(
        (ticket) => (ticket.generation ?? 0) === (reg.ticketGeneration ?? 0),
      );
      return {
        'Registration ID': reg.id,
        Attendees: reg.attendees.map((a) => a.name).join('; '),
        'Attendee count': reg.attendees.length,
        'Payment status': reg.paymentStatus,
        'Account phone': reg.accountPhone ?? '',
        'Payer name': reg.payerName ?? '',
        'Payment note': reg.paymentNote ?? '',
        'Signup status': reg.signupStatus ?? 'historical',
        'Review status': reg.reviewStatus ?? 'historical',
        'Started at': created ? formatDateTime(created) : '',
        'Total amount': reg.totalAmount,
        'Registered at': toDate(reg.submittedAt)
          ? formatDateTime(toDate(reg.submittedAt)!)
          : reg.workflowVersion === 1
            ? ''
            : created
              ? formatDateTime(created)
              : '',
        'Tickets valid': tickets.filter((t) => t.status === 'valid').length,
        'Tickets checked in': tickets.filter((t) => t.status === 'redeemed').length,
        'Tickets revoked': tickets.filter((t) => t.status === 'revoked').length,
      };
    });
    const csv = Papa.unparse(rows, { escapeFormulae: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventTitle.replace(/\s+/g, '-').toLowerCase()}-registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const showTickets = Boolean(ticketsByRegistration) || canManage;

  return (
    <div>
      {canManage && review.count > 0 ? (
        <div className="mb-5 space-y-4 rounded-xl border p-5" aria-live="polite">
          <p>
            {review.count} unsaved payment decision{review.count === 1 ? '' : 's'}. Changes are not
            sent until confirmed.
          </p>
          {confirming ? (
            <>
              <p className="text-sm font-semibold text-ink">Review your decisions</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-surfaceMuted px-4 py-3">
                  <span className="block text-muted">Mark paid</span>
                  <strong className="mt-1 block text-2xl text-ink">
                    {Object.values(review.drafts).filter((draft) => draft.approved).length}
                  </strong>
                </div>
                <div className="rounded-xl border border-border bg-surfaceMuted px-4 py-3">
                  <span className="block text-muted">Mark unpaid</span>
                  <strong className="mt-1 block text-2xl text-ink">
                    {Object.values(review.drafts).filter((draft) => !draft.approved).length}
                  </strong>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted">
                Approved members will receive tickets; members marked unpaid will be notified.
                Review the selected rows in the table before confirming.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  loading={review.busy}
                  onClick={() => void review.confirm().then(() => setConfirming(false))}
                >
                  Confirm and send updates
                </Button>
                <Button
                  variant="secondary"
                  disabled={review.busy}
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={() => setConfirming(true)}>Confirm payment decisions</Button>
          )}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-64">
            <Input
              aria-label="Search registrations by name, phone, or payer"
              placeholder="Search name, phone, or payer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              aria-label="Filter by payment status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | PaymentStatus)}
            >
              <option value="all">All payment statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="free">Free</option>
            </Select>
          </div>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </Button>
      </div>

      <p className="mb-3 text-sm text-warmGray400">
        {filtered.length} registration{filtered.length === 1 ? '' : 's'} · {attendeeCount} attendee
        {attendeeCount === 1 ? '' : 's'}
        {showTickets ? ' · Expand a row to manage tickets' : ''}
      </p>
      {filtered.length ? (
        <p className="mb-3 text-sm text-muted sm:hidden">
          Swipe the table sideways to see payment, totals, and dates.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          message={
            registrations.length === 0
              ? `No registrations yet for ${eventTitle}.`
              : 'No registrations match your filters.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-warmGray400/15 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-warmGray400/15 text-warmGray400">
              <tr>
                {showTickets ? <th className="w-10 px-2 py-3" aria-label="Expand" /> : null}
                <th className="px-4 py-3 font-medium">Attendees</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Payer</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmGray400/15">
              {filtered.map((reg) => {
                const created = toDate(reg.createdAt);
                const expanded = expandedId === reg.id;
                const noteExpanded = expandedNotes.has(reg.id);
                const summary = ticketSummary(reg);

                return (
                  <React.Fragment key={reg.id}>
                    <tr className="align-middle" id={`registration-${reg.id}`}>
                      {showTickets ? (
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            className="min-h-12 min-w-12 rounded-lg text-warmGray400 hover:bg-warmGray50 hover:text-deepBlue"
                            aria-expanded={expanded}
                            aria-label={expanded ? 'Collapse tickets' : 'Expand tickets'}
                            onClick={() => setExpandedId(expanded ? null : reg.id)}
                          >
                            {expanded ? '▾' : '▸'}
                          </button>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <p className="font-medium text-deepBlue">
                          {reg.attendees.map((a) => a.name).join(', ')}
                        </p>
                        <p className="text-xs text-warmGray400">
                          {reg.attendees.length} attendee{reg.attendees.length === 1 ? '' : 's'}
                        </p>
                        {summary ? (
                          <p className="mt-1 text-xs text-warmGray400">{summary}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {reg.accountPhone || '—'}
                      </td>
                      <td className="min-w-40 px-4 py-3 text-muted">
                        <p>{reg.payerName || '—'}</p>
                        {reg.paymentNote ? (
                          <div className="mt-2 max-w-64 border-l-2 border-accent/60 pl-3 text-sm text-ink">
                            <p className="font-semibold text-brand">Payment note</p>
                            <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
                              {reg.paymentNote.length > 80 && !noteExpanded
                                ? `${reg.paymentNote.slice(0, 80).trimEnd()}…`
                                : reg.paymentNote}
                            </p>
                            {reg.paymentNote.length > 80 ? (
                              <button
                                type="button"
                                className="mt-1 min-h-12 rounded-lg py-2 text-left font-semibold text-brand hover:underline"
                                aria-expanded={noteExpanded}
                                onClick={() =>
                                  setExpandedNotes((previous) => {
                                    const next = new Set(previous);
                                    if (next.has(reg.id)) next.delete(reg.id);
                                    else next.add(reg.id);
                                    return next;
                                  })
                                }
                              >
                                {noteExpanded ? 'Show less' : 'Read full note'}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={PAYMENT_TONE[reg.paymentStatus]}>
                          {reg.workflowVersion === 1
                            ? reg.signupStatus === 'expired'
                              ? 'Signup expired'
                              : reg.signupStatus === 'started'
                                ? 'Waiting for member'
                                : reg.reviewStatus === 'approved'
                                  ? 'Payment approved'
                                  : reg.reviewStatus === 'rejected'
                                    ? 'Payment issue'
                                    : reg.resubmittedAt
                                      ? 'Payment updated'
                                      : 'Awaiting review'
                            : reg.paymentStatus}
                        </Badge>
                        {canManage &&
                        reg.workflowVersion === 1 &&
                        reg.totalAmount > 0 &&
                        reg.signupStatus === 'submitted' ? (
                          <fieldset
                            className="mt-2 flex gap-3"
                            disabled={review.busy || confirming}
                          >
                            <legend className="mb-1 text-xs font-semibold text-muted">Paid?</legend>
                            {[true, false].map((approved) => (
                              <label
                                key={String(approved)}
                                className="inline-flex min-h-12 cursor-pointer items-center gap-2 px-3"
                              >
                                <input
                                  type="radio"
                                  name={`paid-${reg.id}`}
                                  checked={
                                    review.drafts[reg.id]
                                      ? review.drafts[reg.id].approved === approved
                                      : reg.reviewStatus === (approved ? 'approved' : 'rejected')
                                  }
                                  onChange={() => review.select(reg, approved)}
                                />
                                {approved ? 'Yes' : 'No'}
                              </label>
                            ))}
                          </fieldset>
                        ) : null}
                        {review.results[reg.id] ? (
                          <p role="status">{review.results[reg.id]}</p>
                        ) : null}
                        {review.drafts[reg.id] &&
                        review.drafts[reg.id].expectedRevision !== (reg.reviewRevision ?? 0) ? (
                          <Button
                            variant="secondary"
                            disabled={review.busy}
                            onClick={() => review.discard(reg.id)}
                          >
                            Discard draft and refresh this row
                          </Button>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-deepBlue">{formatCurrency(reg.totalAmount)}</td>
                      <td className="px-4 py-3 text-warmGray400">
                        {reg.workflowVersion === 1 && !reg.submittedAt ? 'Started ' : 'Registered '}
                        {toDate(reg.submittedAt ?? reg.createdAt)
                          ? formatDateTime(toDate(reg.submittedAt ?? reg.createdAt)!)
                          : '—'}
                      </td>
                    </tr>
                    {showTickets && expanded ? (
                      <tr>
                        <td colSpan={7} className="bg-warmGray50/40 px-4 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warmGray400">
                            Tickets
                          </p>
                          <RegistrationTicketList
                            eligible={ticketsEligible(reg)}
                            currentGeneration={reg.ticketGeneration ?? 0}
                            tickets={ticketsByRegistration?.[reg.id] ?? []}
                          />
                          {reg.workflowVersion === 1 && reg.reviewStatus !== 'approved' ? (
                            <p className="mt-2">
                              Tickets are not usable until payment is approved. Previously issued QR
                              codes will not reactivate.
                            </p>
                          ) : null}
                          {canManage ? (
                            <Link
                              className="mt-4 inline-flex min-h-12 items-center text-deepBlue underline"
                              href={`/events/${eventId}/messages#registration-${reg.id}`}
                            >
                              Open private messages{reg.adminUnread ? ' · Unread' : ''}
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
