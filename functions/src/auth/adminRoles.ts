import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
  adminRoleAssignSchema,
  adminRoleCreateSchema,
  adminRoleDeleteSchema,
  adminRoleRevokeSchema,
  adminRoleUpdateSchema,
} from '@sfvga/shared-validation';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@sfvga/shared-types';
import { errors } from '../shared/errors';
import { requireAuth } from '../shared/requireAuth';
import { requireSuperAdmin, resolveAdminAccess } from '../shared/adminAccess';
import { writeAdminAudit } from '../shared/adminAudit';

const DEFAULT_ROLES: Array<{
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
}> = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Protected system role with complete administrative access.',
    permissions: [...ADMIN_PERMISSIONS],
  },
  {
    id: 'organization-admin',
    name: 'Organization Admin',
    description: 'Temporary default role for organization operations.',
    permissions: [
      'dashboard.view',
      'events.view',
      'events.create',
      'events.edit',
      'events.publish',
      'registrations.view',
      'registrations.manage',
      'tickets.scan',
      'tickets.revoke',
      'staff.view',
      'staff.assign',
      'staff.revoke',
      'members.view',
    ],
  },
  {
    id: 'content-admin',
    name: 'Content Admin',
    description: 'Temporary default role for announcements and galleries.',
    permissions: [
      'dashboard.view',
      'announcements.view',
      'announcements.create',
      'announcements.edit',
      'announcements.delete',
      'gallery.view',
      'gallery.manage',
      'members.view',
    ],
  },
  {
    id: 'finance-admin',
    name: 'Finance Admin',
    description: 'Temporary default role for registrations and payments.',
    permissions: [
      'dashboard.view',
      'registrations.view',
      'payments.view',
      'payments.refund',
      'members.view',
    ],
  },
];

export async function seedDefaultAdminRoles(uid: string): Promise<number> {
  const db = getFirestore();
  const refs = DEFAULT_ROLES.map((role) => db.doc(`adminRoleDefinitions/${role.id}`));
  const existing = await db.getAll(...refs);
  const now = Timestamp.now();
  const batch = db.batch();
  let created = 0;
  for (const [index, role] of DEFAULT_ROLES.entries()) {
    // Seeding must not reset names or permissions customized by organizers.
    if (existing[index].exists) continue;
    batch.set(refs[index], {
      ...role,
      active: true,
      system: role.id === 'super-admin',
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  if (created) await batch.commit();
  return created;
}

export const adminRoles_list = onCall(async (request) => {
  const uid = requireAuth(request);
  const access = await resolveAdminAccess(uid, request.auth?.token);
  if (!access.isSuperAdmin && !access.organizationRole) {
    throw errors.permissionDenied('Admin access required.');
  }
  const snap = await getFirestore().collection('adminRoleDefinitions').orderBy('name').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const adminRoles_seedDefaults = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const count = await seedDefaultAdminRoles(uid);
  await writeAdminAudit(uid, 'adminRoles.seedDefaults', { count });
  return { success: true };
});

export const adminRoles_create = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const input = adminRoleCreateSchema.parse(request.data);
  const now = Timestamp.now();
  const ref = getFirestore().collection('adminRoleDefinitions').doc();
  await ref.set({
    ...input,
    active: true,
    system: false,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  await writeAdminAudit(uid, 'adminRoles.create', { roleId: ref.id, name: input.name });
  return { roleId: ref.id };
});

export const adminRoles_update = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { roleId, ...patch } = adminRoleUpdateSchema.parse(request.data);
  const ref = getFirestore().doc(`adminRoleDefinitions/${roleId}`);
  const snap = await ref.get();
  if (!snap.exists) throw errors.notFound('Admin role not found.');
  if (snap.data()?.system !== true && patch.permissions?.length === 0)
    throw errors.invalidArgument('Select at least one permission for this role.');
  await ref.update({ ...patch, updatedAt: Timestamp.now() });
  await writeAdminAudit(uid, 'adminRoles.update', { roleId, fields: Object.keys(patch) });
  return { success: true };
});

export const adminRoles_delete = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { roleId } = adminRoleDeleteSchema.parse(request.data);
  const db = getFirestore();
  const ref = db.doc(`adminRoleDefinitions/${roleId}`);
  const snap = await ref.get();
  if (!snap.exists) throw errors.notFound('Admin role not found.');
  if (snap.data()?.system === true)
    throw errors.permissionDenied('The Super Admin role cannot be deleted.');

  const grants = await db.collection('organizationAdminGrants').where('roleId', '==', roleId).get();
  const now = Timestamp.now();
  // Deactivating the definition first revokes effective access immediately, even while
  // the audit-preserving grant cleanup spans more than one Firestore batch.
  await ref.update({ active: false, deletedAt: now, updatedAt: now });
  const writer = db.bulkWriter();
  grants.docs.forEach((grant) => writer.delete(grant.ref));
  await writer.close();
  await writeAdminAudit(uid, 'adminRoles.delete', { roleId, revokedAssignments: grants.size });
  return { success: true, revokedAssignments: grants.size };
});

export const adminRoles_assign = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { targetUid, roleId } = adminRoleAssignSchema.parse(request.data);
  const db = getFirestore();
  const role = await db.doc(`adminRoleDefinitions/${roleId}`).get();
  if (!role.exists || role.data()?.active !== true || role.data()?.deletedAt) {
    throw errors.failedPrecondition('Choose an active admin role.');
  }
  if (role.data()?.system === true)
    throw errors.failedPrecondition('Use the protected Super Admin action for this role.');
  const now = Timestamp.now();
  await db.doc(`organizationAdminGrants/${targetUid}`).set({
    userId: targetUid,
    roleId,
    grantedBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  await writeAdminAudit(uid, 'adminRoles.assign', { targetUid, roleId });
  return { success: true };
});

export const adminRoles_revoke = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { targetUid } = adminRoleRevokeSchema.parse(request.data);
  await getFirestore().doc(`organizationAdminGrants/${targetUid}`).delete();
  await writeAdminAudit(uid, 'adminRoles.revoke', { targetUid });
  return { success: true };
});

export const adminRoles_grantSuperAdmin = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { targetUid } = adminRoleRevokeSchema.parse(request.data);
  const auth = getAuth();
  const target = await auth.getUser(targetUid);
  await auth.setCustomUserClaims(targetUid, { ...(target.customClaims ?? {}), superAdmin: true });
  await writeAdminAudit(uid, 'adminRoles.grantSuperAdmin', { targetUid });
  return { success: true };
});

export function withoutSuperAdminClaims(
  claims: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const nextClaims = { ...(claims ?? {}) };
  delete nextClaims.superAdmin;
  if (nextClaims.role === 'admin' && nextClaims.adminLevel === 'super') {
    delete nextClaims.role;
    delete nextClaims.adminLevel;
  }
  return nextClaims;
}

export function assertCanRevokeSuperAdmin(actorUid: string, targetUid: string): void {
  if (targetUid === actorUid)
    throw errors.failedPrecondition('You cannot revoke your own Super Admin access.');
}

export const adminRoles_revokeSuperAdmin = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { targetUid } = adminRoleRevokeSchema.parse(request.data);
  assertCanRevokeSuperAdmin(uid, targetUid);
  const auth = getAuth();
  const target = await auth.getUser(targetUid);
  await auth.setCustomUserClaims(targetUid, withoutSuperAdminClaims(target.customClaims));
  await auth.revokeRefreshTokens(targetUid);
  await writeAdminAudit(uid, 'adminRoles.revokeSuperAdmin', { targetUid });
  return { success: true };
});

export const adminRoles_migrateLegacy = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  await seedDefaultAdminRoles(uid);
  const auth = getAuth();
  const db = getFirestore();
  let pageToken: string | undefined;
  let migratedGrants = 0;
  let migratedSuperAdmins = 0;
  do {
    const page = await auth.listUsers(500, pageToken);
    const batch = db.batch();
    const now = Timestamp.now();
    for (const user of page.users) {
      const claims = user.customClaims ?? {};
      if (claims.role !== 'admin' || typeof claims.adminLevel !== 'string') continue;
      if (claims.adminLevel === 'super') {
        if (claims.superAdmin !== true) {
          await auth.setCustomUserClaims(user.uid, { ...claims, superAdmin: true });
          migratedSuperAdmins += 1;
        }
        continue;
      }
      const roleId = `${claims.adminLevel}-admin`;
      if (!DEFAULT_ROLES.some((role) => role.id === roleId)) continue;
      batch.set(
        db.doc(`organizationAdminGrants/${user.uid}`),
        {
          userId: user.uid,
          roleId,
          grantedBy: uid,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      migratedGrants += 1;
    }
    await batch.commit();
    pageToken = page.pageToken;
  } while (pageToken);
  await writeAdminAudit(uid, 'adminRoles.migrateLegacy', { migratedGrants, migratedSuperAdmins });
  return { success: true, migratedGrants, migratedSuperAdmins };
});
