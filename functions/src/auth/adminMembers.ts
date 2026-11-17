import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { hasPermission, requireAdminPermission } from '../shared/adminAccess';

async function activeAuthUsers() {
  const users = new Map<string, { customClaims?: Record<string, unknown> }>();
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    page.users.forEach((user) => users.set(user.uid, user));
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

/** A lightweight count for the dashboard, independent of the full member directory. */
export const adminMembers_count = onCall(async (request) => {
  await requireAdminPermission(request, 'members.view');
  const [profiles, authUsers] = await Promise.all([
    getFirestore().collection('users').select().get(),
    activeAuthUsers(),
  ]);
  return { count: profiles.docs.filter((profile) => authUsers.has(profile.id)).length };
});

/** Returns only the member fields needed by admin assignment screens. */
export const adminMembers_list = onCall(async (request) => {
  const eventId = typeof request.data?.eventId === 'string' ? request.data.eventId : undefined;
  const authorization = eventId
    ? await requireAdminPermission(request, 'staff.view', eventId)
    : await requireAdminPermission(request, 'members.view');
  const db = getFirestore();
  const assignedUserIds =
    eventId && !hasPermission(authorization.access, 'staff.assign', eventId)
      ? new Set(
          (await db.collection(`events/${eventId}/roles`).get()).docs.map((grant) =>
            String(grant.data().userId),
          ),
        )
      : null;
  const [allUsers, authUsers, grants] = await Promise.all([
    db.collection('users').get(),
    activeAuthUsers(),
    eventId ? Promise.resolve(null) : db.collection('organizationAdminGrants').get(),
  ]);
  const users = assignedUserIds
    ? allUsers.docs.filter((user) => assignedUserIds.has(user.id) && authUsers.has(user.id))
    : allUsers.docs.filter((user) => authUsers.has(user.id));
  // Event staff pickers need contact details, not every account's organization
  // grant or custom claims. Avoid several sequential Auth lookups for this path.
  if (eventId) {
    return users
      .map((user) => {
        const data = user.data();
        return {
          uid: user.id,
          displayName: String(data.displayName || 'Member'),
          phone: String(data.phone || ''),
          email: typeof data.email === 'string' ? data.email : undefined,
          organizationRoleId: null,
          isSuperAdmin: false,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const roleByUser = new Map(
    (grants?.docs ?? []).map((grant) => [grant.id, String(grant.data().roleId)]),
  );

  return users
    .map((user) => {
      const data = user.data();
      return {
        uid: user.id,
        displayName: String(data.displayName || 'Member'),
        phone: String(data.phone || ''),
        email: typeof data.email === 'string' ? data.email : undefined,
        organizationRoleId: roleByUser.get(user.id) ?? null,
        isSuperAdmin:
          authUsers.get(user.id)?.customClaims?.superAdmin === true ||
          (authUsers.get(user.id)?.customClaims?.role === 'admin' &&
            authUsers.get(user.id)?.customClaims?.adminLevel === 'super'),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
});
