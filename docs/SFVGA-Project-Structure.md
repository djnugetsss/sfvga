# SFVGA Platform — Complete Project Structure

> **Approved payment design — September 2026:** [Manual payment verification](./SFVGA-Manual-Payment-Verification.md) supersedes all earlier Stripe, payment bypass, direct-client ticket writes, automatic payment confirmation, and attendee-editing descriptions in this document. PROJECT_RULES.md remains the highest-priority project instruction. Other historical architecture sketches are not authorization to add features.

**Purpose:** A full folder/file map developers can scaffold directly from, with the responsibility of every file stated. No implementation code — structure and conventions only.

**Philosophy carried through from the technical design doc:** every folder here earns its place because something in the design doc actually needs it. Nothing is added "in case we need it later." If a future feature needs a new folder, add it then.

---

## 0. Top-Level Monorepo Layout

```
sfvga-platform/
├── apps/
│   ├── mobile/                 # React Native (Expo) — members, volunteers
│   └── admin-web/               # Next.js — board/admin dashboard
├── packages/
│   ├── shared-types/             # TS interfaces from the technical design doc §2
│   ├── shared-validation/        # Zod schemas (client + Cloud Functions)
│   ├── shared-ui-tokens/         # colors, spacing, typography constants
│   └── qr-crypto/                 # shared encode/decode helpers (server-authoritative, but types shared)
├── functions/                     # Cloud Functions (Firebase)
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── .github/workflows/             # CI/CD
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

**Why a monorepo:** the mobile app, admin web app, and Cloud Functions all share the same TypeScript types and validation schemas (Section 2/§12 of the tech design doc). Keeping them in one repo with `packages/shared-*` means a schema change happens in one place and both frontends + backend pick it up at compile time — no copy-pasted types drifting out of sync, which matters more for a small team than any monorepo tooling overhead.

---

## 1. Mobile App (`apps/mobile/`) — Expo, React Native

### 1.1 Full Structure

```
apps/mobile/
├── app.config.ts
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env.development
├── .env.production
├── assets/
│   ├── fonts/
│   ├── images/
│   │   ├── logo.png
│   │   ├── splash.png
│   │   └── icons/                    # app icon variants (iOS/Android sizes)
│   └── lottie/                       # simple loading animations, if used
│
├── src/
│   ├── App.tsx                        # root entry — providers + navigation mount
│   ├── navigation/
│   │   ├── RootNavigator.tsx           # switches between Auth stack and Main stack
│   │   ├── AuthStack.tsx               # phone sign-in, OTP screens
│   │   ├── MainTabs.tsx                # bottom tab bar: Home, Events, Messages, Tickets, Profile
│   │   ├── EventStack.tsx              # event list → event detail → registration flow
│   │   └── linking.ts                  # deep link config (e.g., push notification → event page)
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── PhoneSignInScreen.tsx    # enter phone number
│   │   │   └── OtpVerifyScreen.tsx      # enter OTP code
│   │   │
│   │   ├── home/
│   │   │   └── HomeScreen.tsx           # "What's Next" card, announcements feed, staff-for-event card
│   │   │
│   │   ├── events/
│   │   │   ├── EventListScreen.tsx      # upcoming events list
│   │   │   ├── EventDetailScreen.tsx    # single event page: countdown, map, schedule, FAQs, ticket button
│   │   │   └── RegistrationScreen.tsx   # family member picker, price breakdown, pay
│   │   │
│   │   ├── tickets/
│   │   │   └── TicketWalletScreen.tsx   # list of all upcoming tickets + QR display
│   │   │
│   │   ├── scanner/
│   │   │   └── ScannerScreen.tsx        # camera QR scanner (only reachable if canScanTickets)
│   │   │
│   │   ├── gallery/
│   │   │   ├── AlbumListScreen.tsx      # albums per event
│   │   │   └── AlbumViewScreen.tsx      # photos in an album
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx        # user info, notification prefs toggle
│   │   │   └── FamilyMembersScreen.tsx  # add/edit family members
│   │   │
│   │   └── feedback/
│   │       └── FeedbackPromptScreen.tsx # simple star rating + comment, shown post-event
│   │
│   ├── components/
│   │   ├── ui/                          # generic, reusable, no business logic
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Badge.tsx
│   │   │
│   │   ├── events/
│   │   │   ├── EventCard.tsx             # used in EventListScreen and "What's Next"
│   │   │   ├── CountdownTimer.tsx        # used on EventDetailScreen
│   │   │   ├── EventMap.tsx              # embedded map + tap-to-navigate
│   │   │   ├── FaqList.tsx
│   │   │   └── PriceBreakdown.tsx        # used in RegistrationScreen
│   │   │
│   │   ├── tickets/
│   │   │   ├── QrCodeDisplay.tsx         # renders QR image from the stored payload string
│   │   │   └── TicketCard.tsx
│   │   │
│   │   └── forms/
│   │       ├── FamilyMemberPicker.tsx    # checkbox-style attendee selector
│   │       └── StarRating.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                    # wraps Firebase Auth state + user doc listener
│   │   ├── useEvent.ts                   # single event, real-time
│   │   ├── useEventList.ts               # upcoming events, real-time
│   │   ├── useMyRegistrations.ts         # a user's own registrations/tickets
│   │   ├── useActiveStaffRoles.ts        # this user's active volunteer/committee grants
│   │   ├── useFamilyMembers.ts
│   │   └── useNotificationPrefs.ts
│   │
│   ├── services/
│   │   ├── firebase.ts                   # Firebase SDK init (uses firebase-config package)
│   │   ├── functionsClient.ts            # thin wrapper calling Cloud Functions (httpsCallable)
│   │   ├── notificationService.ts        # FCM token registration, permission prompts
│   │   └── qrRenderer.ts                 # renders a QR image from a payload string (display only)
│   │
│   ├── stores/
│   │   ├── useUiStore.ts                 # Zustand — ephemeral UI state (active tab, modal visibility)
│   │   └── useOnboardingStore.ts         # first-run flow state, persisted via MMKV
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx              # wraps app, exposes auth state via context + useAuth
│   │   ├── QueryProvider.tsx             # React Query client setup
│   │   └── ThemeProvider.tsx             # exposes design tokens from shared-ui-tokens
│   │
│   ├── theme/
│   │   ├── colors.ts                     # saffron/gold/deep blue/white palette
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   └── utils/
│       ├── dateFormat.ts
│       ├── currencyFormat.ts
│       └── validators.ts                 # thin re-exports of shared-validation for form-level checks
│
└── __tests__/
    ├── components/
    ├── hooks/
    └── utils/
```

### 1.2 Navigation Structure (Explained)

```
RootNavigator
 ├─ (not signed in) → AuthStack: PhoneSignIn → OtpVerify
 └─ (signed in)     → MainTabs
       ├─ Home tab      → HomeScreen
       ├─ Events tab    → EventStack: EventList → EventDetail → Registration
       ├─ Messages tab  → event-grouped private registration conversations
       ├─ Tickets tab   → TicketWalletScreen
       └─ Profile tab   → ProfileScreen → FamilyMembersScreen

Modal/pushed (not tabs):
 - ScannerScreen (opened from HomeScreen's "staff for event" card, not a tab —
   most members never see it, so it doesn't deserve permanent tab real estate)
 - AlbumViewScreen (opened from EventDetailScreen after an event ends)
 - FeedbackPromptScreen (shown as a lightweight modal, not a screen anyone navigates to directly)
```

The member app now has five bottom tabs. Messages was added at the user's request so payment and registration conversations are not hidden in event details. Conversations remain scoped to the member's saved registration and grouped by event.

---

## 2. Admin Web App (`apps/admin-web/`) — Next.js

### 2.1 Full Structure

```
apps/admin-web/
├── next.config.js
├── package.json
├── tsconfig.json
├── .env.development
├── .env.production
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # root layout, wraps providers
│   │   ├── page.tsx                     # redirects to /dashboard or /login
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx           # admin sign-in (phone or email, same Firebase Auth)
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # simple overview: upcoming events, recent registrations
│   │   │
│   │   ├── events/
│   │   │   ├── page.tsx                 # list of events (draft/published/ended), "New" + "Duplicate" buttons
│   │   │   ├── new/page.tsx             # create event form
│   │   │   └── [eventId]/
│   │   │       ├── page.tsx             # event edit form (details, schedule, FAQs, pricing)
│   │   │       ├── registrations/page.tsx  # searchable registration list, export CSV
│   │   │       └── staff/page.tsx       # assign volunteers/committee, pick role from dropdown
│   │   │
│   │   ├── roles/
│   │   │   └── page.tsx                 # manage the two editable lists (Volunteer Roles / Committee Roles)
│   │   │
│   │   ├── announcements/
│   │   │   ├── page.tsx                 # list of sent announcements
│   │   │   └── new/page.tsx             # compose + choose audience + send
│   │   │
│   │   ├── gallery/
│   │   │   └── page.tsx                 # pending photo moderation queue
│   │   │
│   │   ├── documents/
│   │   │   └── page.tsx                 # document library upload/manage
│   │   │
│   │   ├── feedback/
│   │   │   └── page.tsx                 # per-event rating averages + comments
│   │   │
│   │   └── settings/
│   │       └── page.tsx                 # admin account management (Super Admin only)
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui-based primitives (Button, Table, Dialog, etc.)
│   │   ├── events/
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventList.tsx
│   │   │   └── DuplicateEventDialog.tsx
│   │   ├── registrations/
│   │   │   └── RegistrationTable.tsx
│   │   ├── roles/
│   │   │   ├── RoleListEditor.tsx        # add/rename/deactivate entries in either list
│   │   │   └── StaffAssignForm.tsx       # pick person + role + activation window
│   │   ├── announcements/
│   │   │   └── AnnouncementComposer.tsx
│   │   └── gallery/
│   │       └── PhotoModerationCard.tsx
│   │
│   ├── hooks/
│   │   ├── useAdminAuth.ts               # confirms admin custom claim, redirects if not admin
│   │   ├── useEvents.ts
│   │   ├── useRegistrations.ts
│   │   ├── useRoleDefinitions.ts
│   │   └── usePendingPhotos.ts
│   │
│   ├── services/
│   │   ├── firebase.ts
│   │   └── functionsClient.ts            # same pattern as mobile — calls the same Cloud Functions
│   │
│   ├── stores/
│   │   └── useUiStore.ts                 # sidebar open/closed, active filters — ephemeral only
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   │
│   └── lib/
│       └── formatters.ts                 # currency/date display helpers, admin-side
│
└── __tests__/
    ├── components/
    └── hooks/
```

### 2.2 Admin Navigation Structure

The implemented admin app uses a permission-filtered bottom navigation at phone and desktop widths, matching the member app's navigation position. Both surfaces use SFVGA saffron/gold for primary actions and active states, with Gujarati red as a secondary accent. The header retains SFVGA Administration branding, access label, notifications, and sign-out. The older sidebar outline below is historical.

```
Sidebar (persistent, since this is a desktop-first dashboard, unlike mobile's tabs):
  Dashboard
  Events            → list → [create new] / [duplicate] / [open existing]
  Roles             → manage the two editable role lists
  Announcements     → list → compose new
  Gallery           → moderation queue
  Documents         → library
  Feedback          → per-event summaries
  Settings          → admin accounts (Super Admin only, hidden for other admin levels)
```

A flat sidebar, not a nested multi-level menu — matches the "simple, not enterprise" directive; a five-person board doesn't need a mega-nav.

---

## 3. Shared Packages (`packages/`)

```
packages/shared-types/
├── src/
│   ├── user.ts            # User, FamilyMember
│   ├── event.ts            # Event
│   ├── registration.ts     # Registration, Ticket
│   ├── role.ts              # RoleDefinition, EventRoleGrant
│   ├── announcement.ts
│   ├── gallery.ts
│   ├── feedback.ts
│   └── index.ts            # re-exports everything
└── package.json

packages/shared-validation/
├── src/
│   ├── registrationSchema.ts   # Zod schema used by both the mobile registration form
│   │                             AND the registrations_create Cloud Function
│   ├── eventSchema.ts
│   ├── roleDefinitionSchema.ts
│   └── index.ts
└── package.json

packages/shared-ui-tokens/
├── src/
│   ├── colors.ts           # single source of truth for saffron/gold/deep blue/white,
│   │                          imported by both mobile theme/ and admin-web components/ui/
│   ├── typography.ts
│   └── index.ts
└── package.json

packages/qr-crypto/
├── src/
│   ├── types.ts             # shape of the decrypted QR payload (shared so both the
│   │                           Cloud Function and any future debugging tool agree on the shape)
│   └── index.ts
└── package.json
```

**Why these four packages and no more:** each one is shared by at least two of the three codebases (mobile, admin-web, functions). We deliberately did _not_ create a `shared-ui-components` package to share actual React components between mobile and web — React Native and web components aren't directly reusable anyway, and forcing shared components across such different rendering targets is a classic case of abstraction that costs more than it saves. Sharing just the _tokens_ (colors/type) keeps them visually consistent without that trap.

---

## 4. Cloud Functions (`functions/`)

```
functions/
├── package.json
├── tsconfig.json
├── .env.development
├── .env.production
└── src/
    ├── index.ts                        # exports every function (Firebase's entry point)
    │
    ├── auth/
    │   └── setAdminRole.ts
    │
    ├── events/
    │   ├── create.ts
    │   ├── update.ts
    │   ├── duplicate.ts
    │   └── endPassedEvents.ts          # scheduled, daily
    │
    ├── registrations/
    │   ├── create.ts
    │   ├── update.ts
    │   └── cancel.ts
    │
    │   ├── finish.ts                  # member completes saved signup
    │   ├── confirmPayments.ts         # revision-checked Yes/No decisions
    │   ├── requestReview.ts           # member payment resubmission
    │   ├── grantCorrection.ts         # time-limited existing-signup exception
    │   ├── sendMessage.ts             # private registration conversation
    │   ├── markMessagesRead.ts        # only clears messages actually observed
    │   └── expirePending.ts           # retains expired unfinished records
    │
    ├── tickets/
    │   ├── onRegistrationConfirmed.ts  # Firestore trigger, generates tickets
    │   ├── validate.ts
    │   └── revoke.ts
    │
    ├── roles/
    │   ├── roleDefinitionsCreate.ts
    │   ├── roleDefinitionsUpdate.ts
    │   ├── assign.ts
    │   ├── revoke.ts
    │   └── expireRoleGrants.ts          # scheduled, hourly
    │
    ├── notifications/
    │   ├── sendAnnouncement.ts
    │   ├── eventReminder.ts             # scheduled, daily
    │   └── galleryApprovedNotify.ts     # Firestore trigger
    │
    ├── gallery/
    │   ├── uploadPhoto.ts
    │   └── moderatePhoto.ts
    │
    ├── documents/
    │   ├── upload.ts
    │   └── delete.ts
    │
    ├── backups/
    │   └── dailyExport.ts               # scheduled, daily Firestore export to Storage
    │
    └── shared/
        ├── requireAuth.ts               # throws HttpsError if request.auth is missing
        ├── requireAdmin.ts              # throws if custom claim role !== "admin"
        ├── canScanTickets.ts            # the permission-resolution helper from the tech design doc §4
        ├── qrCrypto.ts                  # encrypt/decrypt/sign helpers (server-only secret access)
        └── errors.ts                    # small set of shared HttpsError constructors

└── __tests__/
    ├── tickets/validate.test.ts
    ├── registrations/create.test.ts
    └── roles/assign.test.ts
```

Each file in `src/{domain}/` is one Cloud Function — one file, one responsibility, matching the callable list in the technical design doc §12 one-to-one. `shared/` holds the handful of cross-cutting helpers every function reuses, kept intentionally small (five files) rather than growing into a generic "core" framework.

---

## 5. Environment Configuration

Three `.env` concerns, kept simple (two environments: dev and prod, per the tech design doc's deployment section):

```
apps/mobile/.env.development       EXPO_PUBLIC_FIREBASE_* keys (dev project)
apps/mobile/.env.production         EXPO_PUBLIC_FIREBASE_* keys (prod project)

apps/admin-web/.env.development     NEXT_PUBLIC_FIREBASE_* keys (dev project)
apps/admin-web/.env.production      NEXT_PUBLIC_FIREBASE_* keys (prod project)

functions/.env.development           STRIPE_SECRET_KEY, QR_SIGNING_KEY (dev)
functions/.env.production            same keys, prod values (loaded via Firebase Secret Manager,
                                      not committed — .env.production here is a local-only template)
```

No `.env.staging`, no per-feature-flag environment matrix — two real environments is exactly what a two-environment deployment pipeline (Section 15 of the tech design doc) needs, no more.

---

## 6. Package Dependencies (By App)

**`apps/mobile/package.json` (key dependencies):**

```
expo, react-native
firebase (Auth, Firestore, Storage, Functions, Messaging client SDKs)
@tanstack/react-query
zustand
react-native-mmkv
react-native-vision-camera + vision-camera-code-scanner  (QR scanning)
qrcode  or  react-native-qrcode-svg  (QR display rendering)
@stripe/stripe-react-native
react-navigation (native-stack + bottom-tabs)
zod
date-fns
```

**`apps/admin-web/package.json` (key dependencies):**

```
next, react
firebase (client SDK)
@tanstack/react-query
zustand
tailwindcss, shadcn/ui components
zod
date-fns
papaparse   (CSV export for the registration list)
```

**`functions/package.json` (key dependencies):**

```
firebase-admin, firebase-functions
stripe
zod
qrcode  (server-side QR string prep, if needed beyond raw payload)
```

Deliberately conservative dependency lists — every entry above maps to a specific feature in the technical design doc (Stripe→payments, vision-camera→scanner, papaparse→CSV export). No general-purpose utility-belt libraries (lodash, moment, etc.) added preemptively; `date-fns` alone covers the app's actual date-formatting needs.

---

## 7. Testing Structure

Kept proportional to team size — meaningful coverage on the things that would actually hurt if broken, not 100% coverage as a policy:

```
Cloud Functions (highest priority to test — this is where money/tickets/permissions live):
  functions/__tests__/
    ├── tickets/validate.test.ts        # valid, already-redeemed, revoked, expired cases
    ├── registrations/create.test.ts    # capacity limits, price calculation
    └── roles/assign.test.ts            # canScanTickets resolution

Mobile (test the logic-bearing pieces, not every screen):
  apps/mobile/__tests__/
    ├── hooks/useActiveStaffRoles.test.ts
    ├── components/events/CountdownTimer.test.tsx
    └── utils/currencyFormat.test.ts

Admin Web (same philosophy):
  apps/admin-web/__tests__/
    ├── components/roles/RoleListEditor.test.tsx
    └── hooks/useRegistrations.test.ts
```

**Testing tools:** Jest + React Testing Library (both frontends), Firebase Emulator Suite for Cloud Functions tests (run `tickets_validate`, `registrations_create`, etc. against a local emulator, not mocked Firestore — catches real rule/transaction issues). No end-to-end browser/device automation suite at this scale — manual smoke-testing on TestFlight/internal track before each release (per the deployment section) is proportionate for a team this size.

---

## 8. Coding Conventions

- **File naming:** `PascalCase.tsx` for components, `camelCase.ts` for hooks/services/utils, one component per file, filename matches the exported name.
- **One Cloud Function per file**, filename matches the function's domain action (e.g., `create.ts` inside `registrations/` exports `registrations_create`) — makes the §12 function list and the actual file tree trivially mappable to each other.
- **No default exports** for anything except React screen/page components (Next.js `page.tsx` requires it); everything else uses named exports so imports stay explicit and greppable.
- **Types live next to their domain in `shared-types`**, never redefined locally in mobile/admin-web/functions — if a developer needs a new field, they add it once in `shared-types` and every consumer sees the type error until it's handled.
- **Validation lives once, in `shared-validation`**, imported by both the client form (for inline validation feedback) and the matching Cloud Function (for the real, trusted check) — never duplicated by hand.
- **No global state library beyond Zustand for UI state and React Query for server state** — no Redux, no MobX, no second competing pattern introduced later "for one specific screen."
- **Comments explain _why_, not _what_** — especially around the QR encryption, permission checks, and Stripe webhook handling, since those are the spots a future maintainer most needs the reasoning, not a restatement of the code.
- **Every Cloud Function validates input with the shared Zod schema first, before touching Firestore** — consistent, predictable error handling across all ~25 functions.

---

## 9. State Management Architecture (Recap, Applied to This Structure)

```
Server state  → React Query, fed by Firestore onSnapshot listeners
                (hooks/ in both apps — one hook per real-world "thing you'd ask for":
                 useEvent, useMyRegistrations, useRegistrations, useRoleDefinitions, etc.)

UI state      → Zustand (stores/ in both apps) — sidebar open/closed, active modal,
                selected filter — nothing that would ever need to survive a refresh
                except onboarding progress, which uses MMKV persistence on mobile

Auth state    → A single AuthProvider (providers/) in each app, wrapping Firebase Auth's
                own state + a Firestore listener on users/{uid}, exposed via useAuth()
```

Two state tools, used consistently, mapped 1:1 to "is this server data or is this local UI state" — no ambiguity about where a given piece of state should live, which is what actually keeps a codebase maintainable as it grows, more than any specific library choice would.

---

## Summary

This structure has exactly as many folders as the technical design doc's features require — four mobile tabs, one admin sidebar, ~25 Cloud Function files matching the §12 list one-to-one, four shared packages (each used by 2+ codebases), two environments, and a test suite weighted toward the money/ticket/permission logic that actually needs it. A developer could scaffold every folder and empty file listed here today and have the exact shape the technical design document describes, ready to fill in.
