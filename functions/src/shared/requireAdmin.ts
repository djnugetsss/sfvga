import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { requireAuth } from './requireAuth';

/**
 * Assert the caller is an authenticated admin. Checks authentication first so anonymous
 * callers get an `unauthenticated` error (not `permission-denied`), then verifies the
 * admin custom claim. Returns the caller's uid for convenience.
 */
export function requireAdmin(request: CallableRequest): string {
  const uid = requireAuth(request);
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
  return uid;
}
