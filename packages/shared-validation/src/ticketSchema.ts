import { z } from 'zod';

/** Input for tickets_validate — client relays the raw scanned QR string, never decrypts locally. */
export const ticketValidateSchema = z.object({
  scannedString: z.string().min(1, 'Scanned QR code is required'),
  eventId: z.string().min(1, 'Event ID is required'),
});

export type TicketValidateInput = z.infer<typeof ticketValidateSchema>;

/** Input for tickets_revoke — admin-only path to a single ticket document. */
export const ticketRevokeSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  registrationId: z.string().min(1, 'Registration ID is required'),
  ticketId: z.string().min(1, 'Ticket ID is required'),
});

export type TicketRevokeInput = z.infer<typeof ticketRevokeSchema>;
