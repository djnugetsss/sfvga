# Firebase Setup

The project uses two Firebase projects, `dev` and `prod`. Client configuration values are
public Firebase identifiers, but local environment files remain uncommitted so each
environment can be selected independently.

## 1. Create the Firebase projects

Create one development project and one production project. Replace the placeholders in the
root `.firebaserc` with their exact Firebase project IDs:

- `dev` and `default`: development project ID
- `prod`: production project ID

Do not use project display names or project numbers in `.firebaserc`.

## 2. Register client apps

Register a Web app for the Expo mobile client and a Web app for the Next.js admin dashboard
in each Firebase project. Copy each app's Firebase configuration object verbatim into:

- `apps/mobile/.env.local` (`EXPO_PUBLIC_FIREBASE_*`)
- `apps/admin-web/.env.local` (`NEXT_PUBLIC_FIREBASE_*`)

The Expo app uses the Firebase JavaScript SDK, so these values are used on iOS, Android, and
web. `measurementId` is optional unless Analytics is enabled.

Never put Admin SDK private keys, service-account JSON, Stripe secrets, SMTP passwords, or QR
signing secrets in a `*_PUBLIC_*` variable. Firebase client API keys are identifiers, not
server credentials; access control must remain in Auth, App Check, and security rules.

## 3. Enable Firebase products

Configure both projects consistently:

1. Authentication:
   - Enable Phone for mobile members.
   - Enable Email/Password for administrators.
   - Add `localhost` and the deployed Vercel domain to Authorized domains.
   - Add Firebase test phone numbers/codes in the development project if desired.
   - **Required for new projects:** Authentication → Settings → **SMS region policy**
     and allow the countries you will send SMS to (e.g. United States). New projects
     default to allowing **zero** regions, which surfaces as `auth/operation-not-allowed`
     even when Phone sign-in is enabled and test numbers are configured.
   - **Billing:** Since Sept 2024, real SMS requires the **Blaze** plan. On Spark, use only
     numbers under **Phone numbers for testing**. Use a valid fictional format such as
     `+1 650-555-3434` — not `555-555-5555` (area code 555 is invalid and Firebase rejects it).
2. Create Firestore in Native mode and choose the permanent database location.
3. Cloud Storage (optional):
   - **Not required for event thumbnails/flyers.** The admin app compresses images in the
     browser and stores them on the event document in Firestore (works on the free Spark plan).
   - Storage **does** require the Blaze plan to create a bucket (since 2024/2025). Blaze has
     no monthly fee and includes a free Storage quota — you only pay if you exceed it.
   - Enable Storage later if you need PDF flyers, gallery uploads, or document library files:
     https://console.firebase.google.com/project/sfvga-cabe6/storage → Get Started, then
     `firebase deploy --only storage`.
4. Enable Cloud Functions/Cloud Build prerequisites (a billing-enabled project is required
   for production Functions deployment).
5. Enable Cloud Messaging for native push notifications.
6. Register App Check providers before enforcing App Check. Enforcement must remain off until
   the clients are configured and verified.

## 4. Functions and local emulators

Cloud Functions use `initializeApp()` from `firebase-admin/app`. In deployed Functions and
the Firebase Emulator Suite, project identity and credentials are supplied by Firebase; no
client Firebase config or committed service-account key is required.

Workspace packages (`@sfvga/shared-validation`, `@sfvga/qr-crypto`) ship TypeScript sources for
the apps, but Cloud Functions need compiled CommonJS. `pnpm --dir functions build` runs
`scripts/prepare-functions-deps.mjs` to build those packages and copy `dist/` into
`functions/node_modules/@sfvga/*` before `tsc`. Always build before deploy — otherwise
callables crash with a generic `internal` error (Node cannot `require()` `.ts` files).

**Blaze plan required to deploy Cloud Functions.** On Spark, the mobile app falls back to
client-side registration + DEV QR tickets (Firestore rules allow this temporarily). Upgrade at:
https://console.firebase.google.com/project/sfvga-cabe6/usage/details
then:

```sh
pnpm --dir functions build
firebase deploy --only functions:registrations_create,functions:tickets_onRegistrationConfirmed,functions:tickets_validate
firebase functions:secrets:set QR_SIGNING_KEY
```

Until then, reload the Expo app after pulling these changes and register again — tickets
should appear without the `internal` error.

Local non-secret parameters live in the gitignored `functions/.env.local`. Local emulator
values for `defineSecret` parameters live in the gitignored `functions/.secret.local`.

Production QR secret setup:

```sh
firebase use dev
firebase functions:secrets:set QR_SIGNING_KEY

firebase use prod
firebase functions:secrets:set QR_SIGNING_KEY
```

Use a distinct, cryptographically random value per environment. Do not copy either value into
the mobile or admin applications.

The optional SMTP settings are:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Stripe settings are required for paid event registration (see **Registration and Stripe payments** below).

## 5. Deploy Firebase resources

After replacing project aliases and authenticating the Firebase CLI:

```sh
firebase use dev
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Deploying Firestore rules is required for first phone login: owners may create their
own initial `users/{uid}` member profile when `auth_onUserCreated` is delayed or not
yet deployed. Without the updated rules, profile creation will be denied.

Do **not** run an unqualified Functions deployment yet. `functions/src/index.ts` still exports
documented phase placeholders, including scheduled functions and a gallery trigger. Deploying
all exports would create endpoints that intentionally return "not implemented" and schedules
that intentionally throw.

The implemented Functions currently safe to select for a development deployment are:

- `auth_onUserCreated`
- `auth_setAdminRole`
- `auth_devBootstrapSuperAdmin` (dev only; requires `DEV_BOOTSTRAP_SECRET`)
- `registrations_create`
- `tickets_onRegistrationConfirmed`
- `tickets_validate`
- `tickets_revoke`
- `payments_createIntent`
- `payments_stripeWebhook`
- `announcements_send`
- `notifications_onOrgAnnouncementCreated`
- `notifications_onEventAnnouncementCreated`
- `notifications_eventReminder`

Repeat against `prod` only after validating the development project and reviewing the selected
function list. The admin dashboard is deployed through Vercel and the mobile app through EAS,
as documented in the architecture.

## 6. First Super Admin (dev) and feature testing

Admin features (create events, assign volunteers, moderate gallery, etc.) require a Firebase
Auth user with custom claims `{ role: "admin", adminLevel: "super" }` and a verified email.
The first Super Admin is a chicken-and-egg: `auth_setAdminRole` itself requires an existing
Super Admin. Use one of these bootstrap paths once.

### Preferred: local Admin SDK script

1. Enable **Email/Password** in Firebase Console → Authentication → Sign-in method.
2. Download a service account key (Project settings → Service accounts) and set:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
```

Or run `gcloud auth application-default login` with access to the Firebase project.

3. From the repo root:

```sh
pnpm bootstrap:admin -- --email you@example.com --password 'DevAdminPass123!'
```

This creates (or finds) the user, marks email verified, sets Super Admin claims, mirrors
`users/{uid}`, and seeds **Ticket Scanner**, **Door Greeter**, and **Committee Member** role
definitions when the collection is empty.

4. Start the admin app and sign in:

```sh
cd apps/admin-web && pnpm dev
```

Open http://localhost:3000/login — if the dashboard still says forbidden, sign out and back in
so the ID token picks up the new claims.

### Alternate: admin-web `/bootstrap` + Functions callable

1. Set a non-empty `DEV_BOOTSTRAP_SECRET` for Functions (e.g. in `functions/.env` / params),
   deploy `auth_devBootstrapSuperAdmin`, then open http://localhost:3000/bootstrap.
2. Create/sign in with email/password, verify email, paste the secret, and grant Super Admin.
3. Leave `DEV_BOOTSTRAP_SECRET` empty/unset in production so the callable fails closed.

There is also a link on the login page: **First-time Super Admin setup**.

### Smoke-test checklist

| Feature | Where | Notes |
|--------|--------|--------|
| Create event | Admin → Events → New | Writes Firestore; needs admin claim + rules deployed |
| Role lists | Admin → Roles | Bootstrap seeds Ticket Scanner (`canScanTickets: true`) |
| Assign volunteers | Event → Staff | Assign **Ticket Scanner** to your **mobile** user’s UID |
| Register + ticket | Mobile app | Free events mint tickets immediately; paid events need Stripe PaymentSheet |
| Pay for event | Mobile → Register | Requires `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` + deployed payment Functions |
| Scan tickets | Mobile → Scan | Scanner must have an active event role grant with `canScanTickets` |
| Grant more admins | Admin → Members | Uses `auth_setAdminRole` (needs Super Admin) |

Ticket validation also needs `QR_SIGNING_KEY` configured for Functions (see §4). Deploy
Firestore rules before testing client writes.

### Registration and Stripe payments

Paid events use Stripe PaymentIntents + PaymentSheet (native iOS/Android). Money settles to
SFVGA’s Stripe account (linked bank), minus Stripe fees.

**Flow**

1. `registrations_create` writes `paymentStatus: "unpaid"` when `totalAmount > 0` (or `"free"` when $0).
2. Mobile calls `payments_createIntent` and opens Stripe PaymentSheet.
3. Stripe sends `payment_intent.succeeded` to `payments_stripeWebhook`, which sets `paymentStatus: "paid"`.
4. `tickets_onRegistrationConfirmed` mints tickets on `paid` / `free`.

**One-time Stripe + Firebase setup**

1. Create a Stripe account for SFVGA and complete business / bank onboarding.
2. In Stripe Dashboard → Developers → API keys, copy the **publishable** and **secret** keys
   (use test keys for development).
3. Set Firebase secrets (Blaze required for Functions):

```sh
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

4. Deploy payment Functions, then add a Stripe webhook endpoint:

   - URL: `https://us-central1-<PROJECT_ID>.cloudfunctions.net/payments_stripeWebhook`
   - Event: `payment_intent.succeeded`
   - Copy the webhook **signing secret** into `STRIPE_WEBHOOK_SECRET`

   Local testing:

```sh
stripe listen --forward-to http://127.0.0.1:5001/<PROJECT_ID>/us-central1/payments_stripeWebhook
```

5. Mobile env (`apps/mobile/.env.development` / `.env.production`):

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

6. Keep Functions param `SKIP_PAYMENT=false` (code default). Set `SKIP_PAYMENT=true` only to
   skip card charges while testing registration without Stripe.

7. Rebuild a **dev client / EAS build** after adding the Stripe config plugin — PaymentSheet
   does not run in Expo Go for production-like native modules in all setups.

**Notes**

- Web (Expo web) cannot run PaymentSheet; paid registration prompts members to use the phone app.
- Free ($0) events still mint tickets immediately without Stripe.
- Amounts under $0.50 USD cannot be charged (Stripe minimum); keep event prices at or above that.

## 7. Native mobile files

Before EAS native builds and FCM testing, download the Android `google-services.json` and the
iOS `GoogleService-Info.plist` from the matching Firebase mobile app registrations. These
files are project-specific and must not be fabricated. Add their paths to `app.config.ts`
only after the real files are available.
