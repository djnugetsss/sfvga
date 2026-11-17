import { isValidUsPhone, toE164UsPhone } from '@/utils/phone';

describe('toE164UsPhone', () => {
  it('formats 10-digit US numbers', () => {
    expect(toE164UsPhone('(555) 123-4567')).toBe('+15551234567');
  });

  it('keeps an existing country code', () => {
    expect(toE164UsPhone('1-555-123-4567')).toBe('+15551234567');
  });
});

describe('isValidUsPhone', () => {
  it('accepts 10-digit and +1 numbers', () => {
    expect(isValidUsPhone('5551234567')).toBe(true);
    expect(isValidUsPhone('+1 555 123 4567')).toBe(true);
  });

  it('rejects incomplete numbers', () => {
    expect(isValidUsPhone('555123')).toBe(false);
  });
});
