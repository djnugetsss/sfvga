#!/usr/bin/env node
/**
 * One-time bootstrap for an existing Firebase Phone Authentication account.
 * The phone number is accepted only as a command argument and is never stored in source.
 * Requires Application Default Credentials with access to the Firebase project.
 */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(scriptDir, '../functions/package.json'));
const admin = require('firebase-admin');

function args(argv) {
  const values = { phone: '', project: process.env.GCLOUD_PROJECT || 'sfvga-cabe6' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--phone' && argv[index + 1]) values.phone = argv[++index];
    else if (argv[index] === '--project' && argv[index + 1]) values.project = argv[++index];
  }
  return values;
}

async function main() {
  const input = args(process.argv.slice(2));
  if (!/^\+[1-9]\d{7,14}$/.test(input.phone)) {
    throw new Error('Pass the existing verified phone account in E.164 format with --phone.');
  }
  if (!admin.apps.length) admin.initializeApp({ projectId: input.project });
  const auth = admin.auth();
  const db = admin.firestore();
  const user = await auth.getUserByPhoneNumber(input.phone);
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), superAdmin: true });

  const now = admin.firestore.Timestamp.now();
  const permissions = [
    'dashboard.view',
    'events.view',
    'events.create',
    'events.edit',
    'events.publish',
    'events.delete',
    'registrations.view',
    'registrations.manage',
    'tickets.scan',
    'tickets.revoke',
    'staff.view',
    'staff.assign',
    'staff.revoke',
    'announcements.view',
    'announcements.create',
    'announcements.edit',
    'announcements.delete',
    'gallery.view',
    'gallery.manage',
    'members.view',
    'payments.view',
    'payments.refund',
  ];
  await db.doc('adminRoleDefinitions/super-admin').set(
    {
      name: 'Super Admin',
      description: 'Protected system role with complete administrative access.',
      permissions,
      active: true,
      system: true,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  await db.doc('config/bootstrap').set(
    {
      superAdminBootstrapped: true,
      bootstrappedUid: user.uid,
      bootstrappedAt: now,
      method: 'verified-phone-admin-script',
    },
    { merge: true },
  );
  console.log(
    `Protected Super Admin granted to Firebase user ${user.uid}. Refresh the member app.`,
  );
}

main().catch((error) => {
  console.error(`Bootstrap failed: ${error?.message || error}`);
  process.exit(1);
});
