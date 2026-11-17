import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import type { QrTicketPayload } from '@sfvga/qr-crypto';

/**
 * Server-only QR encryption/decryption helpers (architecture doc §14, tech design §8).
 *
 * Flow:
 *  - encryptPayload: HMAC-SHA256 sign → AES-256-GCM encrypt → base64 string stored on the Ticket doc.
 *  - decryptPayload: reverse, verifying the HMAC signature and expiry (used ONLY server-side).
 *
 * The signing secret comes from Firebase Secret Manager (QR_SIGNING_KEY) and is passed in
 * explicitly so these functions stay pure and unit-testable. Clients NEVER call these; they
 * only relay the scanned string to tickets_validate.
 */

type UnsignedPayload = Omit<QrTicketPayload, 'signature'>;

const IV_BYTES = 12; // 96-bit nonce, the recommended size for AES-GCM
const TAG_BYTES = 16;

/**
 * Derive independent 32-byte encryption and MAC subkeys from the single configured secret,
 * so the same secret never doubles as both the AES key and the HMAC key.
 */
function deriveKeys(secret: string): { encKey: Buffer; macKey: Buffer } {
  if (!secret) {
    throw new Error('QR signing secret is not configured.');
  }
  return {
    encKey: createHash('sha256').update(`${secret}|enc`).digest(),
    macKey: createHash('sha256').update(`${secret}|mac`).digest(),
  };
}

/** Deterministic serialization so the signature is stable regardless of key order. */
function canonical(payload: UnsignedPayload): string {
  return JSON.stringify([
    payload.ticketId,
    payload.eventId,
    payload.registrationId,
    payload.attendeeName,
    payload.exp,
  ]);
}

function sign(payload: UnsignedPayload, macKey: Buffer): string {
  return createHmac('sha256', macKey).update(canonical(payload)).digest('hex');
}

export function encryptPayload(payload: UnsignedPayload, secret: string): string {
  const { encKey, macKey } = deriveKeys(secret);
  const signed: QrTicketPayload = { ...payload, signature: sign(payload, macKey) };

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(signed), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptPayload(encrypted: string, secret: string): QrTicketPayload {
  const { encKey, macKey } = deriveKeys(secret);
  const raw = Buffer.from(encrypted, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const authTag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv('aes-256-gcm', encKey, iv);
  decipher.setAuthTag(authTag);

  let json: string;
  try {
    json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered ciphertext — GCM authentication failed.
    throw new Error('invalid-ciphertext');
  }

  const parsed = JSON.parse(json) as QrTicketPayload;

  const expected = Buffer.from(sign(parsed, macKey), 'hex');
  const actual = Buffer.from(parsed.signature ?? '', 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('invalid-signature');
  }

  if (typeof parsed.exp === 'number' && parsed.exp < Date.now()) {
    throw new Error('expired');
  }

  return parsed;
}
