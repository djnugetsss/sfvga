/** Outcome codes returned by tickets_validate to drive the scanner UI banners. */
export type TicketValidateOutcome = 'checked_in' | 'already_redeemed' | 'invalid';

export interface TicketValidateResponse {
  outcome: TicketValidateOutcome;
  attendeeName?: string;
  partySize?: number;
  message: string;
}

export const INVALID_SCAN_MESSAGE = 'Not valid — please see an organizer.';

/** Format a redeemed timestamp for the "Already checked in at 6:42pm" banner (UI/UX §8). */
export function formatRedeemedAt(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${minuteStr}${ampm}`;
}

export function buildCheckedInMessage(attendeeName: string): string {
  return `✓ ${attendeeName} — Checked in`;
}

export function buildAlreadyRedeemedMessage(redeemedAt?: Date): string {
  if (redeemedAt) {
    return `Already checked in at ${formatRedeemedAt(redeemedAt)}.`;
  }
  return 'Already checked in.';
}

export function invalidScanResponse(): TicketValidateResponse {
  return { outcome: 'invalid', message: INVALID_SCAN_MESSAGE };
}
