'use client';

import React from 'react';
import type { TicketStatus } from '@sfvga/shared-types';
import type { AdminTicket } from '@/hooks/useEventTickets';
import { Badge } from '@/components/ui/primitives';
import { TicketQr } from './TicketQr';

const STATUS_TONE: Record<TicketStatus, 'success' | 'info' | 'neutral' | 'warning'> = {
  valid: 'success',
  redeemed: 'info',
  revoked: 'neutral',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  valid: 'Valid',
  redeemed: 'Checked in',
  revoked: 'Revoked',
};

interface RegistrationTicketListProps {
  tickets: AdminTicket[];
  eligible?: boolean;
  currentGeneration?: number;
}

export function RegistrationTicketList({
  tickets,
  eligible = true,
  currentGeneration = 0,
}: RegistrationTicketListProps) {
  if (tickets.length === 0) {
    return <p className="text-sm text-warmGray400">No tickets generated yet.</p>;
  }

  const currentTickets = tickets.filter((ticket) => (ticket.generation ?? 0) === currentGeneration);
  const previousTickets = tickets.filter(
    (ticket) => (ticket.generation ?? 0) !== currentGeneration,
  );

  const renderTicket = (ticket: AdminTicket) => {
    const isRevoked = ticket.status === 'revoked';
    const isCurrent = (ticket.generation ?? 0) === currentGeneration;

    return (
      <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-deepBlue">{ticket.attendeeName}</p>
          <p className="text-sm text-warmGray400">
            Ticket {ticket.id.slice(0, 8)}…{isCurrent ? '' : ' · Previous QR (inactive)'}
          </p>
          {eligible && isCurrent && !isRevoked ? (
            <details>
              <summary className="cursor-pointer py-2">Show QR</summary>
              <TicketQr payload={ticket.qrPayloadEncrypted} name={ticket.attendeeName} />
            </details>
          ) : (
            <p>QR unavailable while ticket is revoked, replaced, or payment is on hold.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isCurrent ? STATUS_TONE[ticket.status] : 'neutral'}>
            {!isCurrent && ticket.status === 'valid' ? 'Replaced' : STATUS_LABEL[ticket.status]}
          </Badge>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {currentTickets.length > 0 ? (
        <ul className="divide-y divide-warmGray400/10 rounded-xl border border-warmGray400/15 bg-warmGray50/50">
          {currentTickets.map(renderTicket)}
        </ul>
      ) : (
        <p className="text-sm text-warmGray400">No current tickets available.</p>
      )}
      {previousTickets.length > 0 ? (
        <details className="rounded-xl border border-warmGray400/15 bg-warmGray50/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-deepBlue">
            Previous tickets ({previousTickets.length})
          </summary>
          <p className="px-4 pb-2 text-sm text-warmGray400">
            These QR codes were replaced and cannot be used for check-in.
          </p>
          <ul className="divide-y divide-warmGray400/10 border-t border-warmGray400/15">
            {previousTickets.map(renderTicket)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
