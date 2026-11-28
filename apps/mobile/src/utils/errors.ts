function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return 'code' in error ? String((error as { code?: string }).code) : '';
}

/** User-facing message for Firebase Phone Auth send/confirm failures. */
export function getPhoneAuthErrorMessage(
  error: unknown,
  fallback = "We couldn't send a code — check your connection and try again",
): string {
  const code = getErrorCode(error);
  const rawMessage =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message)
      : error instanceof Error
        ? error.message
        : '';

  // Billing must be enabled (Blaze) to send real SMS. Test numbers still work on Spark
  // when registered under Authentication → Phone numbers for testing.
  if (code === 'auth/billing-not-enabled' || /BILLING_NOT_ENABLED/i.test(rawMessage)) {
    return (
      'This Firebase project is on the free Spark plan, which cannot send real SMS. ' +
      'Either upgrade to Blaze, or sign in with a number listed under Authentication → ' +
      'Sign-in method → Phone → Phone numbers for testing (use +1 650-555-XXXX format).'
    );
  }

  // New Firebase projects default to an SMS region policy that allows zero regions.
  if (
    (code === 'auth/operation-not-allowed' || /OPERATION_NOT_ALLOWED/i.test(rawMessage)) &&
    /region/i.test(rawMessage)
  ) {
    return (
      "SMS is blocked by this project's SMS region policy (or the number is not a valid US test number). " +
      '1) Authentication → Settings → SMS region policy → Allow-list → add United States and Save. ' +
      '2) Use a registered test number like +16505553434 — not 5555555555 (area code 555 is invalid).'
    );
  }

  switch (code) {
    case 'auth/invalid-phone-number':
      return "That doesn't look like a valid phone number";
    case 'auth/missing-phone-number':
      return 'Enter your phone number to continue';
    case 'auth/too-many-requests':
      return 'Code requests are temporarily limited. If a code arrived, enter it. Otherwise, wait before trying again.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return "We couldn't verify you're human — please try again";
    case 'auth/operation-not-allowed':
      return (
        'Phone sign-in is blocked for this Firebase project. Confirm Phone is enabled, ' +
        'SMS region policy allows United States, and you are using a registered test number ' +
        '(+1 650-555-XXXX) or a Blaze-plan project for real SMS.'
      );
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded — please try again later';
    case 'auth/network-request-failed':
      return 'You appear to be offline. Check your connection and try again.';
    case 'auth/invalid-verification-code':
    case 'auth/code-expired':
    case 'auth/session-expired':
      return "That code doesn't match — try again";
    case 'auth/missing-verification-code':
      return 'Enter the 6-digit code we texted you';
    default:
      if (error instanceof Error && /reCAPTCHA client element has been removed/i.test(error.message)) return 'Verification was interrupted. Refresh this page and try again.';
      return getErrorMessage(error, fallback);
  }
}

/** User-facing message for a caught error (Firebase, network, or generic). */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error || typeof error !== 'object') {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const code = getErrorCode(error);
  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  const details =
    'details' in error && (error as { details?: unknown }).details != null
      ? String((error as { details?: unknown }).details)
      : '';

  if (code === 'permission-denied' || code === 'functions/permission-denied') {
    return "You don't have permission to do that.";
  }
  if (code === 'unauthenticated' || code === 'functions/unauthenticated') {
    return 'Sign in again, then try registering.';
  }
  if (code === 'unavailable' || code === 'functions/unavailable') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (code === 'functions/not-found' || code === 'not-found') {
    if (/registration|event/i.test(message)) return message || 'Not found.';
    return (
      'Registration service is not deployed yet. From the repo root run: ' +
      'pnpm --dir functions build && firebase deploy --only functions:registrations_create,functions:tickets_onRegistrationConfirmed'
    );
  }
  if (code === 'functions/internal' || code === 'internal' || /^internal$/i.test(message.trim())) {
    // Prefer the server message when it is more specific than the bare code.
    if (message && !/^internal$/i.test(message.trim()) && !message.includes('Firebase')) {
      return message;
    }
    return (
      'Registration failed on the server. Confirm Cloud Functions are deployed for this ' +
      'Firebase project (registrations_create). If they are, check the Functions logs.'
    );
  }

  if (message && !message.includes('Firebase') && !/^internal$/i.test(message.trim())) {
    return message;
  }
  if (details) return details;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  return (
    code === 'functions/unavailable' ||
    code === 'unavailable' ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('offline')
  );
}
