/** One-time, secret-gated bootstrap for an existing verified phone-auth account. */
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { errors } from '../shared/errors';
import { seedDefaultAdminRoles } from './adminRoles';
import { writeAdminAudit } from '../shared/adminAudit';

const bootstrapSecret = defineSecret('DEV_BOOTSTRAP_SECRET');
const inputSchema = z.object({
  secret: z.string().min(1),
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/),
  seedRoles: z.boolean().optional().default(true),
});

export const auth_devBootstrapSuperAdmin = onCall(
  { secrets: [bootstrapSecret] },
  async (request) => {
    const configuredSecret = bootstrapSecret.value().trim();
    if (!configuredSecret)
      throw errors.failedPrecondition('Phone Super Admin bootstrap is disabled.');
    const { secret, phoneNumber, seedRoles } = inputSchema.parse(request.data ?? {});
    if (secret !== configuredSecret) throw errors.permissionDenied('Invalid bootstrap secret.');

    const db = getFirestore();
    const flagRef = db.doc('config/bootstrap');
    const flagSnap = await flagRef.get();
    const flagData = flagSnap.data();
    const legacyBootstrapUid =
      flagData?.superAdminBootstrapped === true &&
      flagData.via === 'scripts/bootstrap-dev-admin.mjs' &&
      typeof flagData.bootstrappedUid === 'string'
        ? flagData.bootstrappedUid
        : null;
    if (flagData?.superAdminBootstrapped === true && !legacyBootstrapUid) {
      throw errors.alreadyExists('A protected Super Admin has already been bootstrapped.');
    }

    // The phone number is supplied only at invocation time and resolved server-side. It is
    // intentionally never stored in source or bootstrap metadata.
    const auth = getAuth();
    const target = await auth.getUserByPhoneNumber(phoneNumber);
    if (!target.phoneNumber) throw errors.notFound('Verified phone account not found.');
    await auth.setCustomUserClaims(target.uid, {
      ...(target.customClaims ?? {}),
      superAdmin: true,
    });

    // The original development bootstrap targeted an email-auth account. A
    // secret-gated migration may replace only that known legacy marker, then
    // removes its protected claim so there is a single bootstrap Super Admin.
    if (legacyBootstrapUid && legacyBootstrapUid !== target.uid) {
      const legacyUser = await auth.getUser(legacyBootstrapUid);
      const remainingClaims = { ...(legacyUser.customClaims ?? {}) };
      delete remainingClaims.superAdmin;
      await auth.setCustomUserClaims(legacyBootstrapUid, remainingClaims);
    }

    const rolesSeeded = seedRoles ? await seedDefaultAdminRoles(target.uid) : 0;
    const now = Timestamp.now();
    await flagRef.set({
      superAdminBootstrapped: true,
      bootstrappedUid: target.uid,
      bootstrappedAt: now,
      method: 'verified-phone-lookup',
      rolesSeeded,
      migratedFromLegacyUid: legacyBootstrapUid,
    });
    await writeAdminAudit(target.uid, 'adminRoles.bootstrapSuperAdmin', {
      rolesSeeded,
      migratedFromLegacyUid: legacyBootstrapUid,
    });

    return {
      success: true,
      uid: target.uid,
      adminLevel: 'super' as const,
      rolesSeeded,
      message: 'Protected Super Admin access granted. Refresh the member app to continue.',
    };
  },
);
