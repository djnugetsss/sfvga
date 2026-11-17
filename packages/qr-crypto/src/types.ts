/**
 * Shape of the decrypted QR ticket payload.
 * Encryption/decryption is server-only — this type is shared for consistency.
 */
export interface QrTicketPayload {
  ticketId: string;
  eventId: string;
  registrationId: string;
  attendeeName: string;
  exp: number;
  signature: string;
}

// Encrypt/decrypt/sign helpers live in functions/src/shared/qrCrypto.ts (server-only secret
// access). Client apps must NEVER decrypt — they only relay the scanned string to
// tickets_validate. This type is shared so the server and any verifying tooling agree on the shape.
