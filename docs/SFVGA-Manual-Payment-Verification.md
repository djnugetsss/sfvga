# Manual payment verification — approved September 2026

This design replaces Stripe/PaymentSheet, payment bypasses, client registration/ticket creation, and client check-in fallbacks. PROJECT_RULES.md remains the highest-priority project instruction. When the user asks to finish or release related app work, complete verification, backup, and coordinated deployment without a separate approval request.

## Data and authorization

- Events store a separate HTTPS `paymentUrl`. Publishing a priced event requires both the link and `registrationDeadline`, enforced by event callables. Existing priced events missing payment configuration cannot accept new priced signups.
- New registrations use `workflowVersion: 1`; signup state is `started`, `submitted`, or `expired`, independently of `pending`, `approved`, or `rejected` review state. Store account phone, payer name/note, review revision/actor/time, submission/resubmission dates, and correction expiry/explanation/actor.
- One signup per account/event is resumed on retry. Server prices and capacity checks are transactional. Pending signups reserve places until closing. Attendees and quoted total are locked after saving.
- Only `registrations.manage` for the event permits decisions, exceptions, or organizer replies. View-only access includes records/tickets but not private conversations. Owners alone access their own messages and durable member notices. Client payment/ticket writes are denied.
- Historical registrations without workflow version 1 retain ticket eligibility and existing QR payloads. Do not mass-convert historical records or regenerate their tickets. Legacy device QRs are accepted only against the exact stored historical ticket, after authorization and current eligibility checks.

## Member flow and copy

The event description displays a generated section; never append its instructions into the saved description:

> **Registration and payment**  
> Start your registration in the SFVGA app first. You’ll be directed to the payment link during registration. After paying, return to SFVGA and finish your registration before **[Pacific date and time]**.  
> Payment alone does not register you or provide tickets. Payments made without a completed registration, or after registration closes, are not eligible for tickets unless an organizer has approved an exception.

The public payment action is available only while registration is open. Retain instructions/deadline after closing. Opening an HTTPS link uses supported OS app-link behavior; a particular bank app is not guaranteed. Web uses a separate tab where available.

Before payment:

> **One more step after payment**  
> Pay **[amount]**, then return to this page and select **“I’ve paid — finish registration.”** Your registration is not complete until you do this.

Fallback:

> If the payment page doesn’t open, use **Open payment link** below. The same link is available in the event description. Remember to return here to finish registering.

Require payer name and permit an optional payment reference/note. Never request bank credentials or screenshots. Returning from a payment app is not proof of payment. Completion is an explicit server-validated action before the deadline. Show this persistent confirmation without automatically navigating away:

> **Registration submitted**  
> Thank you! Our team will verify your payment. Your event check-in QR codes will appear in **Tickets** once payment is approved. Verification may take some time, and we’ll notify you when your tickets are ready.

Free signups submit immediately and receive tickets without review. Open screens re-evaluate deadlines and recheck on app return.

## Review, disputes, and queues

The registration table includes attendees, account phone, payer details, total, signup/review state, Started/Registered date, and expandable tickets. Export these fields to CSV and search by name, payer, or phone. Yes/No controls are exclusive, initially unset, and local drafts until the manager confirms a named summary. Submit changed rows only, with stable request IDs and expected review revisions. The server accepts at most 25 rows per call; the client currently uses single-row bounded requests and reports each result. Conflicted rows must be refreshed and reviewed again. Unchanged decisions do not send duplicate notices.

Tickets require submitted + approved, or submitted + zero total. Deterministic attendee IDs within each QR generation make creation retry-safe; creation and the tickets-ready notice share an eligibility-checked transaction. Never reset individual revoked/redeemed states. Yes→No advances the QR generation, so existing screenshots and emailed QRs fail server check-in permanently. Reapproval creates new QR tickets for attendees whose prior tickets were still valid. Previously checked-in and individually revoked tickets remain in the history and receive no replacement. The member wallet shows only the current QR generation; the admin ticket list labels older QRs inactive.

The admin Registrations screen does not offer individual ticket revocation. Payment issues are handled through the registration's Paid? Yes/No review controls, which hold all its tickets and rotate eligible QR codes on reapproval. Historical individually revoked tickets remain in the data and stay invalid; removing the screen control does not rewrite them.

Approved notification:

> Your tickets for **[event]** are ready. Open **Tickets** in the SFVGA app to view your check-in QR codes.

First rejection:

> We haven’t been able to verify your payment for **[event]**. Please review your payment and use the event’s payment link if needed. If you’ve already paid, send our organizers a message so we can help.

After closing, replace payment instructions with a request to contact organizers for a correction exception. Approved-to-rejected notice:

> We’re reviewing an issue with your payment for **[event]**. Your current QR tickets can no longer be used. If your payment is approved again, new tickets will appear in Tickets. An SFVGA organizer will contact you here with the next steps.

Conversations are stored under `events/{eventId}/registrations/{id}/messages`; durable member notices under `users/{uid}/notifications`. Push previews for private messages are generic. Push delivery has lease/retry tracking; exactly-once external delivery is not promised. Older review notices are retained in the app but superseded pushes are suppressed when possible.

Members may request review once after correcting a rejected payment; repeated requests with the same ID do not requeue again. The cross-event dashboard distinguishes Waiting for member, Awaiting review, Payment issue, and Payment updated. Put updates/unread replies first. Approved/free signups leave the payment queue; unread replies remain discoverable separately. Empty state: “You’re all caught up. No registrations need review.”

At closing, unfinished signups expire and leave the queue; a scheduled job materializes this status. Submitted unresolved signups remain. Registration managers may grant an existing signup a future correction expiry (no later than event end) with an explanation sent privately. This does not allow new attendees or new registrations; expired reservations recheck capacity before reopening.

After registration closes, managers still review submitted signups and can confirm Yes or No. A rejected member can discuss a payer-name/reference mismatch in the private conversation. If another payment is necessary, a manager grants a time-limited correction exception from that conversation; only then does the saved signup expose its payment link and resubmission action. The exception must expire before the event ends. The member requests another review after correcting payment, and the manager confirms the new decision. Payment made outside this window does not itself create a registration or tickets. Once the event has ended, organizers can still discuss and reconcile a submitted payment issue, but should not direct a member to make a new payment for expired check-in tickets.

The member ticket wallet classifies ended events by event end time, even when an admin restores valid tickets. Historical valid tickets display a Past event badge rather than Ready. Admin Events separates upcoming and past events by the same end time. A daily reminder about a missing post-event photo album link is created after the first 24 hours, only for admins with current `events.view` and `events.edit` access; it stays in the admin-only inbox and never appears in member notifications. Event-scoped roles that expire shortly after the event are not extended merely to deliver the reminder.

## Local verification and release gates

September 28 QR rotation release: confirmed Paid → Unpaid advances the registration's ticket generation. Reapproval mints distinct codes only for previously unused, non-revoked attendees; server check-in rejects all earlier generations even if a member saved a screenshot or PDF. The wallet hides earlier generations, and the admin ticket list retains them as inactive history. The isolated emulator suite passed 14 tests, including old/new QR scans, a failed generation retry, and revoked/redeemed preservation. Lint, workspace type checks, unit/component tests, Functions build, admin build, and web/iOS/Android exports passed. The pre-release inventory found two historical registrations/four historical tickets and one workflow registration/three workflow tickets, with no duplicate registrations. The managed Firestore backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-29T04-04-06-529Z`. The scanner validator, ticket issuer, payment review handler, and member Hosting were deployed in that order. The admin web update is included in the coordinated main-branch push.

### Admin registration inbox and conversation layout

- Member and organizer messages appear on opposite sides, with neutral message bubbles, compact timestamps, and a separate reply composer. Show the latest eight messages initially, with a visible control for earlier history. Both member and admin surfaces use SFVGA gold as the primary accent and Gujarati red as the secondary accent.
- The dashboard attention card separates Payments and Messages with counts and shows six concise rows initially. Unread-message links open the dedicated event Messages section; payment links open Registrations. Payment and message status remain independent.
- Event navigation includes Messages alongside Registrations and Staff for registration managers. Conversations are no longer embedded in ticket dropdowns. The registration table separates Phone and Payer from Attendees, with payment notes tucked under Payer. Messages use a searchable conversation list and a separate reply panel, stacked on narrow screens.
- Opening a conversation clears unread only when the observed message is still the actual newest message, independently of stale registration pointers. A newer unseen reply remains unread; read failures are visible instead of silently ignored.
- A separate admin bell lists registration starts, completed paid and free submissions, payment resubmissions/issues, member and organizer conversation replies, and missing post-event photo albums. No member announcements or member event reminders enter this inbox. Notices persist under `users/{uid}/adminNotifications`, with owner-only, permission-checked `readAt` updates.
- Registration notice recipients need both `registrations.view` and `registrations.manage` for the same event. Photo-album reminders require current `events.view` and `events.edit` access instead. Super admins, qualifying organization roles, and active event-scoped managers qualify for their respective notices. View-only finance roles, scanner-only volunteers, expired/revoked grants, and unrelated-event staff do not. Do not grant new permissions just to deliver alerts.
- Fan-out uses stable notice IDs for retries and rechecks current access before push delivery. Organizer decisions and organizer replies suppress the acting organizer, while member signups and messages still reach that account's separate admin inbox if they are an authorized registration manager. Private-message previews never contain the message body. Read state is per admin; marking a notice read does not resolve a payment or mark the team's conversation handled.
- Sending a message explicitly distinguishes member and organizer context. The member screen requires signup ownership; the admin screen requires `registrations.manage`, even when the organizer owns the signup. Organizer replies create a durable member notice atomically with the message. A missing push token prevents external device alerts, not in-app inbox entries. Old clients without context retain ownership-based behavior until updated.
- Existing member notices stay intact, but legacy admin-message notices are excluded from the member feed. New admin inbox history starts on rollout; existing unresolved work remains in the dashboard queue. Push uses the existing registered member-app device tokens and opens the admin area. In-app delivery does not depend on push permission.

Verification for this addition: 111 runnable unit/component tests and 12 isolated emulator integration tests passed, including notification recipient scope, retries, read-state writes, expired-grant denial, and automatic expansion of notification-linked registrations. Desktop and 390px-wide browser previews verified message alignment, inbox sizing, read-state updates, and links. Admin build, Functions build, and Expo web/iOS/Android exports passed. Real-device push delivery remains a post-release check. These additions have not yet been deployed.

Follow-up verification (September 21): the separate Messages page, Phone/Payer columns, and actual-latest-message read check pass 112 runnable unit/component tests and 13 isolated emulator tests, plus lint, type checks, Functions build, and admin production build. Regression coverage includes deep-linked conversation switching, no embedded chat in ticket rows, stale message pointers, and preserving newer unread replies. Local browser smoke tests verified desktop and 390px-wide conversation layouts, organizer/member replies, the dashboard message count returning to zero after reading, notification read-state and conversation routing, and separate Phone/Payer columns with ticket-only expansion. Only fictional emulator accounts/data were used. Production remains unchanged pending release approval.

Run lint, type checks, unit tests, admin production build, and Expo web/native exports. The emulator suite is `functions/__tests__/registrations/paymentEmulator.test.ts`; it requires Java and an isolated `demo-*` project and intentionally skips in ordinary unit runs:

```sh
firebase emulators:exec --only auth,firestore --project demo-sfvga-payment 'pnpm --filter @sfvga/functions test -- --runInBand paymentEmulator'
```

Emulator verification must pass before release, including capacity concurrency, ownership, scoped permissions, message isolation, retries, holds, revoked/redeemed tickets, and direct-write denial. Device/web smoke tests must exercise payment return, reload, blocked popups, deadline rollover, exceptions, draft confirmation conflicts, and failed ticket-generation retries. Test a supplied real payment link without making a payment. Bundling native code is not equivalent to testing physical devices.

Prepare backend, rules, indexes, member app, and admin web as one coordinated release. Use Node 22 for Firebase release tooling. Run the read-only inventory script with authorized credentials before deployment; review historical registration/ticket counts, duplicate account/event registrations, and priced events missing payment configuration. Preserve historical documents and QR payloads. Take a database export/backup before rollout. Pause new registration activity during the backend/rules/client cutover, then verify the released member and embedded-admin versions before reopening. Do not deploy only the stricter rules while old client bypasses are still in use.

Production release requires completed verification and the coordinated rollout checks above; there is no additional approval gate once the user has asked for the work to be deployed.

### Implementation verification record

- Lint and all workspace type checks: passed.
- Unit/component suites: 103 passing tests (48 Functions, 39 member app, 16 admin); 10 pre-existing TODO cases remain.
- Isolated Auth/Firestore emulator suite: 11 passing integration tests, rerun on Node 20.20.2. These cover scoped managers, ownership/private isolation, direct-write denial, capacity races, concurrent admin decisions, free registration, failed ticket generation, correction capacity, repeated review requests, historical QR preservation, and payment hold/reapproval.
- Cloud Functions build: passed on Node 20.20.2.
- Admin production build and Expo exports for web, iOS, and Android: passed.
- Member component tests cover saved-signup rendering, payer-name requirement, persistent confirmation, and deadline rollover. Admin tests cover draft-only decisions, changed rows, stable retries, conflicts, and queue lifecycle.
- Production release completed on September 16, 2026 PDT from commit `f9af56f`. No real payment was performed.

- Authenticated local browser smoke test passed: priced signup, dummy external-link opening, reload persistence, payer details, persistent submission confirmation, no pending ticket, embedded-admin session/dashboard queue, direct admin draft/summary/confirmation, member QR delivery, durable ticket-ready notice, and organizer private message. Changing Yes to No updated the member status and removed the usable ticket from the wallet. The browser tool could inspect but could not click inside the embedded frame; review actions were tested at the same authenticated local admin URL directly. Manual embedded-frame interaction remains a release check.
- The isolated interactive harness uses Node 20, a `demo-*` project, dedicated emulator ports, dummy payment links, and a generated local signing secret. It never copies production secret files. Emulator email/push delivery and test-client push token registration are disabled; in-app notices are still exercised. Lint, type checks, and all 103 unit/component tests passed again after adding this setup.

### Production release record

- September 30, 2026 PDT member UI follow-up: aligned Messages with the Events/Tickets header, card, and empty-state patterns; removed the repeated conversation heading and clarified the registration-status action for free signups. Commit `b416920` passed GitHub CI, and the new member web bundle was deployed to Firebase Hosting. The live Messages page was reloaded and visually verified; local 390px and 320px previews included the empty, populated, and expanded states. Lint, type checks, unit tests, and Expo web/iOS/Android exports passed. The read-only inventory found no duplicate account registrations, and a managed Firestore backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-10-01T01-46-32-653Z`. No backend, rules, admin, registration, or ticket data changed.

- September 29, 2026 PDT follow-up: released the short payment-issue preview, event-grouped member Messages tab, direct return to registration status, reliable browser fallback after starting payment, admin conversation collapse, compact bottom admin navigation, and notification-toggle palette cleanup. Read-only inventory found no duplicate account registrations; two real priced events still need payment setup. Managed Firestore backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-30T05-05-48-835Z`. Commit `f9d5e40` was pushed to `main`; the targeted `registrations_confirmPayments` Function and member Firebase Hosting deployed, GitHub CI passed, and the live member Messages tab and embedded admin header were smoke-tested. Lint, type checks, unit/component tests, 17 isolated emulator tests, Functions/admin builds, and Expo web/iOS/Android exports passed. No registration or ticket documents were migrated. Browser fallback was tested with a harmless HTTPS URL; launching a banking app from a future real provider link remains unverified and is tracked as a reminder.

- September 29, 2026 follow-up: classified wallet tickets by event end so restored tickets for ended events remain in Past; split admin Events into Upcoming/Past; clarified the closed-registration correction path and post-event reconciliation; added a one-day-later missing-photo-album reminder for currently authorized event editors in the admin-only inbox. The read-only production inventory found two historical registrations/four historical tickets and one workflow registration/three workflow tickets, with no duplicate accounts; the two real priced events still need organizer payment setup. Managed Firestore backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-29T04-24-00-682Z`. The notification index, rules, targeted Functions, and member Hosting deployed successfully; the matching admin build is released through the main-branch push. Lint, type checks, unit/component tests, 15 isolated Auth/Firestore emulator tests, Functions/admin builds, and web/iOS/Android exports passed. No registration or ticket documents were migrated.

- September 23 notification follow-up release approved by the user after local verification. Pre-release Firestore backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-23T18-00-49-617Z`. Release scope: `registrations_sendMessage`, `notifications_registrationMessage`, member Hosting, and admin web. No message history is reclassified/replayed, no notification permissions are changed, and no registration/ticket migration is required. The local-only checkpoint below describes the state before this approval.

- September 23 follow-up (local, not deployed): corrected message-sending context for admins who own their registration and removed self-suppression only for member-message admin fan-out. Merged duplicate event controls into one Event sections row with publishing status/action. Verified 113 unit/component tests, 14 emulator tests, lint/type checks, admin build, and Expo web/iOS/Android exports. Browser tests sent replies in both directions using the same fictional organizer account and confirmed each destination bell, plus the unified desktop event controls. Production metadata showed all reported messages classified as member messages, no admin inbox notices, and no registered push tokens. Existing messages/notices were not rewritten or replayed.

- September 22, 2026: released the separate event Messages page, Phone/Payer columns, admin notification bell, notification handlers, rules/indexes, and member web updates. Initial release commit: `9aac00d`; Firebase deployment, Vercel deployment, and CI succeeded. The pre-release backup completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-23T03-41-11-935Z`. The inventory contained two historical registrations/four historical tickets and one workflow registration/three workflow tickets; none were migrated or rewritten.
- Live verification identified an admin reading their own registration as a distinct case: the admin client now explicitly requests the admin read context, checked server-side against `registrations.manage`. This clears the admin flag without clearing the independent member flag. Ordinary members cannot impersonate that context. The emulator regression covers this case and denial of unauthorized admin-context requests.
- The earlier “not yet deployed” notes above describe pre-release checkpoints, superseded by this release record. Real-device push delivery remains a manual follow-up.

- The pre-release inventory found three published priced events missing payment configuration, two historical registrations, four historical tickets, no duplicate account/event registrations, and no historical unpaid registrations without tickets. The two real events still require their organizer-supplied payment links and deadlines before accepting new paid signups.
- A managed Firestore export completed at `gs://gcf-sources-702898287093-us-central1/firestore-backups/payment-rollout-2026-09-17T00-38-32-443Z` before deployment.
- Required indexes, the targeted payment/event/ticket/notification Functions, Firebase Hosting, and Firestore rules deployed successfully to `sfvga-cabe6`. GitHub CI and the Vercel deployment for `f9af56f` passed.
- The production member site and embedded admin session were smoke-tested after release. The existing event named `test` was explicitly configured as a harmless demonstration using `https://example.com/?sfvga-payment-demo`, a September 17, 2026 6:00 PM PDT deadline, and a description warning members not to send real money.

**Post-release follow-up:** test the actual organizer-supplied payment URL on physical iOS and Android devices without sending money, smoke-test real push delivery, and configure the two real priced events before opening their registrations. In November 2026, the event, staff, and admin-access functions were updated from decommissioned Node 20 to Node 22. Other deployed functions still require a separate, coordinated Node 22 migration; keep future deployments on a supported runtime.

**Next payment-link follow-up:** The browser fallback can be released using a harmless HTTPS test URL, but a dummy URL cannot verify that an installed Zelle/banking app handles a future organizer-supplied link. When the app and payment setup are further along, explicitly remind the organizer to test that exact link on physical iOS and Android phones, with the banking app installed, without sending money. If no app-link association exists, the browser fallback is the expected behavior; never claim that every HTTPS payment link launches a banking app.

## Try the features safely on this Mac

The test app is **http://localhost:8082**, not the production `web.app` URL. Open it on the same Mac while the test servers are running. No real payment is needed; the example.com page is intentional.

1. Choose **Use test member** on the sign-in screen. If already signed in, use **Profile → Sign out** to switch accounts.
2. Open **Events → TEST — payment verification → Register Now**. If a saved signup already exists, continue with its displayed status; the browser smoke test leaves this signup with a payment issue so you can try correction/review.
3. For a fresh event, choose attendees, press **Continue to payment**, then return from the dummy example.com page. Reloading the registration page must retain the signup and locked total.
4. Enter any fictional payer name and select **I’ve paid — finish registration**. For a payment issue, select **I’ve updated my payment — request review** instead. Do not send actual money.
5. Sign out and choose **Use test organizer**, then **Profile → Admin dashboard**. Open the signup under **Registrations needing attention**.
6. Choose **Yes** or **No**, then **Confirm payment decisions**. Inspect the summary and press **Confirm and send updates**. Selecting a box alone does not save or send notices.
7. Sign in as the member again. **Yes** produces the ticket-ready notice and QR in **Tickets**; **No** produces a payment-issue notice and no usable QR. Open the registration to send a private message or request another review.
8. To test from scratch, the organizer can create a new test event with an HTTPS dummy link such as `https://example.com/`, a future closing time, and a small fictional price. The seeded **TEST — free registration** event exercises immediate ticket delivery without payment review.

To restart later, use Node 22 and Java 21, then run `fnm exec --using 22 pnpm test:payments:ui` from the repository root. The harness builds Functions, starts emulators, seeds fictional accounts/events, and starts the member app (8082) and admin (3002). Keep that terminal open; Ctrl+C stops the servers. Emulator data is temporary and is not exported on shutdown. Existing fixtures are preserved when the seed script is rerun against an already-running emulator.

The test-only sign-in buttons require explicitly enabled payment-test mode, which rejects a non-demo Firebase project. Normal builds keep the existing sign-in flow and production configuration. Do not deploy with payment-test environment variables enabled.
