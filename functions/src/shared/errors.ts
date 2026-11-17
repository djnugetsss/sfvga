import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Small, shared set of HttpsError constructors so every function returns
 * consistent, greppable error codes (tech design doc §12 — uniform error handling).
 */
export const errors = {
  unauthenticated: () => new HttpsError('unauthenticated', 'Sign in required.'),
  permissionDenied: (message = 'You do not have permission to do that.') =>
    new HttpsError('permission-denied', message),
  invalidArgument: (message = 'The request was invalid.') =>
    new HttpsError('invalid-argument', message),
  notFound: (message = 'Not found.') => new HttpsError('not-found', message),
  failedPrecondition: (message = 'This action cannot be completed right now.') =>
    new HttpsError('failed-precondition', message),
  alreadyExists: (message = 'That already exists.') => new HttpsError('already-exists', message),
  internal: (message = 'Something went wrong. Please try again.') =>
    new HttpsError('internal', message),
};
