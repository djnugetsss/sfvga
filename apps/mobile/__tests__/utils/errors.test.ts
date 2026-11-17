import { getErrorMessage, getPhoneAuthErrorMessage, isNetworkFailure } from '@/utils/errors';

describe('getErrorMessage', () => {
  it('prefers Error.message from callable failures', () => {
    expect(getErrorMessage(new Error('Event is full'))).toBe('Event is full');
  });

  it('returns an offline-friendly message for unavailable errors', () => {
    expect(getErrorMessage({ code: 'unavailable' })).toContain('offline');
  });
});

describe('getPhoneAuthErrorMessage', () => {
  it('maps invalid phone numbers', () => {
    expect(getPhoneAuthErrorMessage({ code: 'auth/invalid-phone-number' })).toContain(
      'valid phone number',
    );
  });

  it('maps wrong OTP codes', () => {
    expect(getPhoneAuthErrorMessage({ code: 'auth/invalid-verification-code' })).toContain(
      "doesn't match",
    );
  });

  it('maps phone auth disabled', () => {
    expect(getPhoneAuthErrorMessage({ code: 'auth/operation-not-allowed' })).toContain(
      'Phone sign-in is blocked',
    );
  });

  it('maps SMS region policy blocks', () => {
    expect(
      getPhoneAuthErrorMessage({
        code: 'auth/operation-not-allowed',
        message: 'SMS unable to be sent until this region enabled by the app developer.',
      }),
    ).toContain('SMS region policy');
  });

  it('maps billing-not-enabled', () => {
    expect(
      getPhoneAuthErrorMessage({
        code: 'auth/billing-not-enabled',
        message: 'BILLING_NOT_ENABLED',
      }),
    ).toContain('Spark plan');
  });
});

describe('isNetworkFailure', () => {
  it('detects Firebase unavailable errors', () => {
    expect(isNetworkFailure({ code: 'functions/unavailable' })).toBe(true);
    expect(isNetworkFailure(new Error('Network request failed'))).toBe(true);
    expect(isNetworkFailure(new Error('Invalid ticket'))).toBe(false);
  });
});
