# SFVGA security and privacy release review

Status: implementation review in progress. Public informational Privacy Notice, Terms of Use, and account-deletion pages live in `apps/mobile/public/`. They use **San Fernando Valley Gujarati Association (SFVGA)** and **sfvgabod@gmail.com**. At the member's direction, an interim six-month post-event retention period for attendee/payer names is implemented for deleted accounts; the president must review it. Event refund details and retention of audit/backup records still require organizational decisions. Do not add unapproved arbitration or liability caps.

## November 2026 account-deletion release

- Members can initiate deletion from Profile after a recent sign-in. The server disables Auth, invalidates QR eligibility, revokes tickets, removes private registration messages, deletes the user profile and subcollections, and deletes profile photos. A durable five-minute worker retries partial cleanup; completed jobs retain a 24-hour cleanup tombstone for late photo writes.
- Active historical registration records keep attendee/payer names until six months after the event end, then a daily worker anonymizes them. Production Firestore export backups can contain earlier copies and do **not** yet have an agreed lifecycle. SFVGA must review this with the president.
- The read-only pre-release inventory showed three current workflow registrations with one ticket each and no duplicate account/event registrations. No existing member account was deleted in testing. A managed backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-11-14T04-08-24-223Z`.
- Isolated Auth/Firestore/Storage emulator tests covered old and future registration retention, name purge, QR holds, photo/profile/message deletion, recent-sign-in checks, and the only-super-admin guard. Firestore/Storage rules tests, lint, type checks, unit/component tests, Functions and admin builds, and Expo web/iOS/Android exports passed. Targeted Functions, Firestore rules/indexes, and member Hosting were deployed; the admin queue change is released through the main-branch push.

## November 14, 2026 member directory cleanup

Three Firestore profiles whose Firebase Authentication accounts had already been deleted were processed through the account-deletion worker. A managed Firestore export completed first at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-11-14T21-38-31-202Z`. The follow-up inventory found three profiles, three Auth accounts, and no orphans. The Admin Access directory and dashboard count now include only profiles with active Auth accounts. An Auth deletion trigger queues the same cleanup for future Firebase Console deletions; registration retention and name-purge rules remain in force.

## Applicable controls checked

- Firebase Authentication uses phone verification. The app does not manage member passwords, password-reset links, or its own session cookies. SQL injection, SQL prepared statements, and row-level SQL security do not apply to Firestore.
- Firestore/Storage rules now restrict sensitive member data and uploads by owner or explicit permission. Client writes cannot mint/redeem tickets, approve payments, change event records, or create announcements. Firebase Cloud Functions continue to validate the corresponding operations server-side.
- Profile/event uploads are limited by content type and size at the Storage rules boundary. Content-type metadata is not a file-signature scan, so organizer review and a server-side scanner would be needed before accepting arbitrary public uploads.
- Hosting and admin responses have HSTS, `nosniff`, and referrer-policy headers. Frame ancestry is constrained to the existing member-app embedding arrangement.
- Security-rules tests run with `pnpm test:security-rules`. Existing unit tests, type checks, lint, and builds remain part of the release gate.
- Paid event prices, capacity, and approval are calculated/validated in Cloud Functions. The app uses an external organizer payment link with manual verification, not a Stripe checkout or webhook. In-app purchases, subscriptions, trial conversion, and AI prompts are not present.

## Important open items before a broad release

1. Have SFVGA's president review the published privacy and terms pages. The notice describes member phone number/name, optional email/profile photo, family-member details, event registrations and payment notes, private organizer messages, ticket/check-in history, notification tokens, Firebase/FCM processing, and external payment providers. Do not add claims about analytics, location tracking, AI, or subscriptions unless they are actually introduced.
2. Review the implemented in-app account-deletion workflow and provisional six-month name retention. It disables the account, invalidates QR tickets, removes profile/contact/family/notification/private-message data, and schedules historical attendee/payer names for removal from active records six months after the event. Existing Firestore export backups may retain earlier copies: SFVGA must set and implement a backup lifecycle. Document any legal hold or longer retention requirement before relying on this as the final organizational policy. Determine retention of aggregate/payment/check-in records and audit logs; test access/export requests separately.
3. Review whether user-generated text or uploaded event media need a moderation/takedown process and a designated copyright agent. This is an organizational/legal decision; do not present the attachment's blanket penalty figures as established facts for SFVGA.
4. Verify App Store Connect and Google Play data disclosures against the released app, including Firebase SDK behavior and push tokens. Add the live policy URLs to both store listings; they are linked inside the app.
5. Triage the dependency audit before expanding distribution. The admin Next.js and vulnerable `proxy-addr` / `shell-quote` packages have been updated. A production-dependency audit still reports 147 advisories, including one critical `tar` path through Expo CLI. Do not force a major Expo/CLI dependency override without native build testing.
6. Firestore event documents currently permit public reads, including drafts. Member/admin queries and server behavior need a coordinated change before tightening this without breaking event management.
7. Confirm an operational backup/export and restore drill, with named SFVGA owner and a realistic recovery target. Do not claim an RTO/RPO until agreed and tested.
8. Profile photos and published event images currently have public Storage reads to support existing display links. Confirm whether SFVGA wants these images public; if not, change the media delivery flow and remove existing long-lived download URLs as part of that migration.

## Not currently applicable

SQL/database query injection; app-managed passwords/reset links; AI model consent, prompt filtering, and AI spending caps; digital subscriptions/trials; payment webhooks; testimonials; public arbitrary-file upload; custom JWT/localStorage token handling. Reassess when those features are added.
