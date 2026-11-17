import { encryptPayload, decryptPayload } from '../../src/shared/qrCrypto';

const SECRET = 'test-secret-key-for-qr-crypto';

const basePayload = {
  ticketId: 'ticket-1',
  eventId: 'event-1',
  registrationId: 'reg-1',
  attendeeName: 'John Doe',
  exp: Date.now() + 60_000,
};

describe('qrCrypto', () => {
  it('round-trips an encrypted payload with the correct secret', () => {
    const encrypted = encryptPayload(basePayload, SECRET);
    const decrypted = decryptPayload(encrypted, SECRET);

    expect(decrypted.ticketId).toBe(basePayload.ticketId);
    expect(decrypted.eventId).toBe(basePayload.eventId);
    expect(decrypted.registrationId).toBe(basePayload.registrationId);
    expect(decrypted.attendeeName).toBe(basePayload.attendeeName);
    expect(decrypted.exp).toBe(basePayload.exp);
    expect(decrypted.signature).toEqual(expect.any(String));
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptPayload(basePayload, SECRET)).not.toBe(encryptPayload(basePayload, SECRET));
  });

  it('rejects decryption with the wrong secret', () => {
    const encrypted = encryptPayload(basePayload, SECRET);
    expect(() => decryptPayload(encrypted, 'a-different-secret')).toThrow();
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptPayload(basePayload, SECRET);
    const tampered = `${encrypted.slice(0, -4)}AAAA`;
    expect(() => decryptPayload(tampered, SECRET)).toThrow();
  });

  it('rejects an expired ticket', () => {
    const encrypted = encryptPayload({ ...basePayload, exp: Date.now() - 1_000 }, SECRET);
    expect(() => decryptPayload(encrypted, SECRET)).toThrow('expired');
  });
});
