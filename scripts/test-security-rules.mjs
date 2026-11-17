import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testEnv = await initializeTestEnvironment({
  projectId: 'demo-sfvga-security-rules',
  firestore: { rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') },
  storage: { rules: readFileSync(resolve(root, 'storage.rules'), 'utf8') },
});

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc('users/member').set({ displayName: 'Member', role: 'member' });
    await db.doc('users/other').set({ displayName: 'Other', role: 'member' });
    await db.doc('users/new-member').set({ displayName: '', role: 'member' });
    await db.doc('announcements/first').set({ title: 'News', body: 'Update' });
    await db.doc('announcements/second').set({ title: 'More news', body: 'Update' });
    await db.doc('adminRoleDefinitions/content-role').set({
      active: true,
      permissions: ['members.view', 'announcements.delete'],
    });
    await db.doc('organizationAdminGrants/content-admin').set({ roleId: 'content-role' });
    await db.doc('events/event').set({ title: 'Event', status: 'published' });
    await db.doc('events/event/roleDefinitions/registration-manager').set({
      active: true,
      permissions: ['registrations.view', 'registrations.manage'],
    });
    await db.doc('events/event/roles/manager').set({
      userId: 'manager',
      roleDefinitionId: 'registration-manager',
      activatesAt: new Date('2020-01-01T00:00:00Z'),
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    });
    await db.doc('events/event/registrations/mine').set({ userId: 'member' });
    await db.doc('events/event/registrations/theirs').set({ userId: 'other' });
    await db.doc('events/event/registrations/theirs/messages/message').set({ body: 'Private' });
    await db.doc('events/event/registrations/theirs/tickets/ticket').set({ userId: 'other' });
  });

  const member = testEnv.authenticatedContext('member').firestore();
  const newMember = testEnv.authenticatedContext('new-member').firestore();
  const legacyAdmin = testEnv.authenticatedContext('legacy-admin', { role: 'admin' }).firestore();
  const legacyContentAdmin = testEnv
    .authenticatedContext('legacy-content-admin', {
      role: 'admin',
      adminLevel: 'content',
    })
    .firestore();
  const contentAdmin = testEnv.authenticatedContext('content-admin').firestore();
  const eventManager = testEnv.authenticatedContext('manager').firestore();

  await assertSucceeds(member.doc('users/member').get());
  await assertFails(member.doc('users/other').get());
  await assertFails(legacyAdmin.doc('users/member').get());
  await assertSucceeds(contentAdmin.doc('users/member').get());
  await assertSucceeds(legacyContentAdmin.doc('users/member').get());
  await assertSucceeds(member.doc('users/member').update({ displayName: 'New name' }));
  await assertFails(newMember.doc('users/new-member').update({ displayName: 'New member' }));
  await assertFails(
    newMember.doc('users/new-member').update({
      legalAcceptance: {
        termsVersion: 'incorrect',
        privacyVersion: '2026-11-13',
        acceptedAt: new Date(),
      },
    }),
  );
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc('users/new-member')
      .update({
        legalAcceptance: {
          termsVersion: '2026-11-13',
          privacyVersion: '2026-11-13',
          acceptedAt: new Date(),
        },
      });
  });
  await assertFails(
    newMember.doc('users/new-member').update({ 'legalAcceptance.termsVersion': 'later' }),
  );
  await assertSucceeds(newMember.doc('users/new-member').update({ displayName: 'New member' }));
  await assertFails(member.doc('users/member').update({ role: 'admin' }));
  await assertFails(legacyAdmin.doc('users/member').update({ role: 'admin' }));
  await assertFails(legacyAdmin.doc('users/member/familyMembers/child').get());
  await assertFails(legacyAdmin.doc('users/member/familyMembers/child').set({ name: 'Child' }));
  await assertFails(member.doc('announcements/new').set({ title: 'Injected' }));
  await assertFails(legacyAdmin.doc('announcements/new').set({ title: 'Injected' }));
  await assertFails(legacyAdmin.doc('announcements/first').delete());
  await assertSucceeds(contentAdmin.doc('announcements/first').delete());
  await assertSucceeds(legacyContentAdmin.doc('announcements/second').delete());
  await assertFails(member.doc('gallery/album/photos/photo').set({ status: 'approved' }));
  await assertFails(
    member.doc('events/event/registrations/registration').set({ userId: 'member' }),
  );
  await assertSucceeds(member.doc('events/event/registrations/mine').get());
  await assertFails(member.doc('events/event/registrations/theirs').get());
  await assertFails(member.doc('events/event/registrations/theirs/messages/message').get());
  await assertFails(member.doc('events/event/registrations/theirs/tickets/ticket').get());
  await assertFails(legacyAdmin.doc('events/event/registrations/theirs').get());
  await assertSucceeds(eventManager.doc('events/event/registrations/theirs').get());
  await assertSucceeds(
    eventManager.doc('events/event/registrations/theirs/messages/message').get(),
  );
  await assertFails(
    eventManager.doc('events/event/registrations/theirs').update({ paymentStatus: 'approved' }),
  );

  const memberStorage = testEnv.authenticatedContext('member').storage();
  const otherStorage = testEnv.authenticatedContext('other').storage();
  await assertSucceeds(
    memberStorage.ref('users/member/profile/avatar.jpg').put(new Uint8Array([1, 2, 3]), {
      contentType: 'image/jpeg',
    }),
  );
  await assertFails(
    memberStorage.ref('users/member/profile/file.pdf').put(new Uint8Array([1, 2, 3]), {
      contentType: 'application/pdf',
    }),
  );
  await assertFails(
    otherStorage.ref('users/member/profile/avatar.jpg').put(new Uint8Array([1, 2, 3]), {
      contentType: 'image/jpeg',
    }),
  );
  await assertFails(
    memberStorage.ref('gallery/album/photo.jpg').put(new Uint8Array([1, 2, 3]), {
      contentType: 'image/jpeg',
    }),
  );

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc('users/member').update({ deletionRequestedAt: new Date() });
    await context.firestore().doc('accountDeletionJobs/member').set({ status: 'pending' });
  });
  await assertFails(member.doc('users/member').update({ displayName: 'After deletion' }));
  await assertFails(member.doc('users/member/familyMembers/child').get());
  await assertFails(member.doc('events/event/registrations/mine').get());
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc('users/member').delete();
  });
  await assertFails(
    member.doc('users/member').set({
      uid: 'member',
      displayName: '',
      phone: '',
      role: 'member',
      membership: { id: 'member', status: 'expired', expiresAt: new Date() },
      notificationPrefs: { announcements: true, eventReminders: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  process.stdout.write('Firestore and Storage security rules passed.\n');
} finally {
  await testEnv.cleanup();
}
