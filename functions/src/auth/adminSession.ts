import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { errors } from '../shared/errors';
import { requireAuth } from '../shared/requireAuth';
import { resolveAdminAccess } from '../shared/adminAccess';
import { ADMIN_DASHBOARD_PERMISSIONS } from '@sfvga/shared-types';

export const auth_getAdminAccess = onCall(async (request) => {
  const uid = requireAuth(request);
  return resolveAdminAccess(uid, request.auth?.token);
});

export const auth_createAdminSession = onCall(async (request) => {
  const uid = requireAuth(request);
  const access = await resolveAdminAccess(uid, request.auth?.token);
  const hasDashboardAccess = access.eventAccess.some((event) =>
    event.permissions.some((permission) =>
      ADMIN_DASHBOARD_PERMISSIONS.some((item) => item === permission),
    ),
  );
  if (!access.isSuperAdmin && !access.organizationRole && !hasDashboardAccess) {
    throw errors.permissionDenied('Admin access is not assigned to this account.');
  }
  const customToken = await getAuth().createCustomToken(uid);
  return { customToken, access };
});
