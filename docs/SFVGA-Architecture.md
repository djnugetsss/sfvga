# SFVGA Community Operating System — Software Architecture

> **Approved payment design — September 2026:** [Manual payment verification](./SFVGA-Manual-Payment-Verification.md) supersedes all earlier Stripe, payment bypass, direct-client ticket writes, automatic payment confirmation, and attendee-editing descriptions in this document. PROJECT_RULES.md remains the highest-priority project instruction. Other historical architecture sketches are not authorization to add features.


**Status:** Draft for approval
**Author:** Lead Architecture Review
**Scope:** Mobile app (iOS + Android) + Web Admin Dashboard + Backend

---

## 0. Architectural Philosophy

Before the details, three decisions shape everything below:

1. **Firebase-native, event-sourced-ish design.** Firestore is the system of record. We avoid a secondary relational database — everything (RBAC, event lifecycle, tickets, food redemption) is modeled as Firestore documents with Cloud Functions enforcing invariants server-side. This keeps ops simple for a small nonprofit admin team while still being production-grade.
2. **Server-side authority, zero client trust.** Every sensitive action (ticket validation, food redemption, role grants, payment confirmation) is executed in a Cloud Function, never trusted from client writes. Firestore Security Rules are the second line of defense, not the first.
3. **Temporal RBAC as a first-class concept.** Volunteer/Committee roles are not a boolean flag — they are time-boxed grants tied to an event's lifecycle, activated/expired by a scheduled function, not by the client checking a date.

---

## 1. Complete Software Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌────────────────────┐        ┌───────────────────────────┐    │
│  │  Mobile App (RN)    │        │  Admin Web Dashboard (Next)│   │
│  │  iOS / Android      │        │  React + Next.js           │   │
│  └─────────┬───────────┘        └──────────────┬────────────┘   │
└────────────┼────────────────────────────────────┼────────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FIREBASE PLATFORM                            │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌────────────────┐  │
│  │   Auth     │ │ Firestore  │ │  Storage  │ │ Cloud Messaging│  │
│  └───────────┘ └────────────┘ └───────────┘ └────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Cloud Functions (Node.js / TypeScript)         │  │
│  │  - HTTPS callable functions (business logic API)            │  │
│  │  - Firestore triggers (onCreate/onUpdate/onDelete)           │  │
│  │  - Scheduled functions (role expiry, workspace lifecycle)    │  │
│  │  - Pub/Sub background jobs (analytics rollups, notifications)│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  Stripe (payments) | Apple/Google Wallet | Google Maps | Sentry  │
└─────────────────────────────────────────────────────────────────┘
```

**Why this shape:**
- Both clients (mobile + admin web) talk to the *same* Cloud Functions API and the *same* Firestore schema — one backend, two frontends. No duplicated business logic.
- All writes that matter (registrations, payments, QR redemption, role grants) go through callable Cloud Functions, not direct Firestore writes from the client. Direct client writes are limited to low-risk, easily-validated fields (e.g., editing your own profile display name).
- Firestore triggers handle "reactive" work: when a registration is created, a trigger generates tickets; when an event is created, a trigger provisions its workspace.

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Mobile framework | **React Native (Expo, bare workflow)** | Single codebase for iOS/Android, huge ecosystem for QR/camera/wallet libraries, easier hiring than Flutter for most US teams, first-class Firebase JS SDK support |
| Admin dashboard | **Next.js 14 (App Router) + TypeScript** | SSR for fast dashboard loads, API routes double as a thin proxy layer if needed, great DX |
| UI (mobile) | React Native Paper / NativeWind (Tailwind for RN) | Card-based, themeable, matches design system fast |
| UI (admin) | Tailwind CSS + shadcn/ui | Consistent design tokens across mobile/web |
| State management (mobile) | **Zustand** + React Query (TanStack Query) | Zustand for local/UI state, React Query for all server state (caching, retries, offline) |
| State management (admin) | React Query + Zustand | Same pattern, keeps mental model identical across teams |
| Backend | **Firebase** (Auth, Firestore, Storage, Cloud Functions Gen 2, Cloud Messaging, Analytics) | Managed, scales down to near-zero cost for a nonprofit, scales up for large events |
| Functions runtime | Node.js 22, TypeScript, organized as a monorepo package | Type safety shared between functions and clients via shared types package |
| Payments | **Stripe** (Payment Intents, Stripe Connect not needed — single org), Apple Pay / Google Pay via Stripe's PaymentSheet | PCI compliance offloaded, native wallet support built in |
| QR generation | `qrcode` (server-side generation) + AES-encrypted signed payload | Prevents client-side forgery |
| QR scanning | `react-native-vision-camera` + `vision-camera-code-scanner` | Fast, reliable, offline-capable |
| Push notifications | Firebase Cloud Messaging (FCM) | Native integration, topics for segmented announcements |
| Maps | Google Maps SDK (mobile) + Maps JavaScript API (admin) | Location display for events |
| Monitoring/errors | Sentry + Firebase Crashlytics | Mobile crash reporting + backend error tracking |
| CI/CD | GitHub Actions → EAS Build (mobile) + Vercel (admin) + Firebase Deploy (functions/rules) | Fully automated pipelines, environment-gated (dev/staging/prod) |
| Monorepo tooling | Turborepo + pnpm workspaces | Shared types, shared config, independent deploy pipelines |

---

## 3. Folder Structure (Monorepo)

```
sfvga-platform/
├── apps/
│   ├── mobile/                      # React Native (Expo) app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   ├── home/
│   │   │   │   ├── events/
│   │   │   │   ├── tickets/
│   │   │   │   ├── membership/
│   │   │   │   ├── gallery/
│   │   │   │   ├── announcements/
│   │   │   │   └── event-workspace/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── scanner/
│   │   │   │       ├── tasks/
│   │   │   │       ├── chat/
│   │   │   │       ├── documents/
│   │   │   │       └── timeline/
│   │   │   ├── components/          # shared design-system components
│   │   │   ├── navigation/
│   │   │   ├── hooks/
│   │   │   ├── stores/              # Zustand stores
│   │   │   ├── services/            # Firebase SDK wrappers, API clients
│   │   │   ├── theme/                # colors, typography (saffron/gold/deep blue)
│   │   │   └── utils/
│   │   ├── app.config.ts
│   │   └── package.json
│   │
│   └── admin-web/                   # Next.js admin dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── dashboard/
│       │   │   ├── events/
│       │   │   │   └── [eventId]/
│       │   │   │       ├── workspace/
│       │   │   │       ├── registrations/
│       │   │   │       ├── volunteers/
│       │   │   │       └── live-mode/
│       │   │   ├── members/
│       │   │   ├── announcements/
│       │   │   ├── documents/
│       │   │   ├── gallery/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── stores/
│       │   └── lib/
│       └── package.json
│
├── packages/
│   ├── firebase-config/             # shared Firebase init (client SDK)
│   ├── shared-types/                # TS types: Event, Ticket, User, Role, etc.
│   ├── shared-ui/                   # cross-platform design tokens/constants
│   ├── validation/                  # Zod schemas shared client+server
│   └── qr-crypto/                   # shared QR encode/decode logic (server + verifying clients)
│
├── functions/                       # Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── auth/                    # onCreate user provisioning, custom claims
│   │   ├── events/                  # event CRUD, workspace lifecycle
│   │   ├── registrations/           # registration + family attendee logic
│   │   ├── tickets/                 # QR generation, validation, redemption
│   │   ├── food/                    # food ticket redemption logic
│   │   ├── payments/                # Stripe webhooks, payment intents
│   │   ally/roles/                  # role grant/expiry (temporal RBAC)
│   │   ├── notifications/           # FCM push, announcement fan-out
│   │   ├── analytics/               # rollup aggregations
│   │   ├── scheduled/                # cron jobs (role expiry, workspace lock)
│   │   └── shared/                  # middleware, error handling, audit logging
│   └── package.json
│
├── firestore.rules
├── storage.rules
├── firebase.json
├── turbo.json
└── package.json
```

---

## 4. Database Schema (Firestore — Document Model)

Firestore is NoSQL, so "schema" = collection/document shape + relationships by reference ID. Detailed collections are in Section 10. Key relationships:

```
users (1) ──< familyMembers (many, subcollection)
users (1) ──< eventRoles (many; temporal role grants)
events (1) ──< registrations (many)
registrations (1) ──< tickets (many; one per attendee)
registrations (1) ──< foodTickets (many)
events (1) ──< tasks (many)
events (1) ──< workspaceChat (subcollection of messages)
events (1) ──< documents (many, or shared via documentLibrary with eventId tag)
events (1) ──< auditLogs (many, filtered by eventId)
```

Design choice: **subcollections for anything scoped to a single event or user** (tickets, tasks, chat messages), and **top-level collections for anything queried globally** (events, users, announcements) — this keeps composite queries efficient and security rules simpler.

---

## 5. Authentication Design

- **Firebase Auth** as the identity provider.
- Sign-in methods: Phone number (OTP) as primary (best fit for a family-oriented, senior-friendly community), plus Google/Apple Sign-In for convenience. Email/password as fallback for admins.
- **Custom Claims** are the backbone of authorization:
  - `role: "member" | "admin"` (permanent, rarely changes)
  - `adminLevel: "super" | "org" | "finance" | "content"` (only present for admins)
  - Event-based roles (volunteer/committee) are **NOT** stored as custom claims (claims are for permanent, infrequently-changing roles and are capped at 1000 bytes — temporal per-event roles would blow past that quickly for active members). Instead, event roles live in Firestore (`eventRoles` collection) and are checked server-side per-request and cached client-side via a lightweight "my active roles" listener.
- **Session flow:**
  1. User authenticates via Firebase Auth (phone OTP).
  2. `onCreate` Cloud Function trigger provisions a `users/{uid}` document with default `role: member`.
  3. Client subscribes to `users/{uid}` and `eventRoles` (where `userId == uid` and `active == true`) to build its permission model.
  4. Admin custom claims are set only via a Super Admin-triggered callable function (`setAdminRole`), never client-writable.
- **Family accounts:** family members are *not* separate Firebase Auth users — they're subdocuments under the primary account holder (`users/{uid}/familyMembers/{memberId}`), since children/seniors typically don't need independent login. This matches the "one login = whole family" requirement directly.

---

## 6. User Roles

| Role | Permanence | Granted By | Scope |
|---|---|---|---|
| **Member** | Permanent (default) | Auto on signup | Own account + family |
| **Volunteer** | Temporary, event-scoped | Org/Content Admin, per event | Single event workspace only |
| **Committee Member** | Temporary, event-scoped, variable permissions | Org Admin, per event | Single event, elevated tools depending on assignment |
| **Content Admin** | Permanent | Super Admin | Announcements, gallery, documents |
| **Finance Admin** | Permanent | Super Admin | Payments, refunds, financial reports |
| **Organization Admin** | Permanent | Super Admin | Events, volunteers, registrations, most operations |
| **Super Admin** | Permanent | Manual/bootstrap only | Full system control, including granting other admins |

### 6.1 Configurable Role Names (Not Hardcoded)

The specific names of volunteer/committee roles will change over time as the board's needs change — "Volunteer" today might need to become "Setup Crew," "Registration Desk," or "Photography" tomorrow, and none of that should require a code change. So instead of hardcoding a fixed set of role labels, the system maintains **two simple, admin-editable lists**:

- **Volunteer Roles** — e.g., starts with just "Volunteer" (and optionally "Check-in Staff"); admins can add, rename, or remove entries at any time from Settings.
- **Committee Roles** — e.g., starts with just "Committee Member"; same editability.

Each role in either list is just a name plus one setting that actually matters at this scale: **can this role scan tickets at check-in, yes or no.** No broader permissions matrix — that was more complexity than a volunteer-run event needs (see the "keep it simple" review).

```ts
// Master lists, editable by admins — not hardcoded in the app
interface RoleDefinition {
  id: string;
  name: string;             // e.g., "Volunteer", "Setup Crew", "Committee Member"
  listType: "volunteer" | "committee";
  canScanTickets: boolean;
  active: boolean;          // soft-delete so past assignments still display correctly
}
```

**When assigning someone to an event**, an admin picks the person, then picks a role from whichever list (Volunteer or Committee) fits — a dropdown populated from whatever's currently in `roleDefinitions`, not something baked into the code. Adding a new role to either list makes it available for every event going forward with zero developer involvement.

Event-scoped role *grants* reference a role definition rather than a hardcoded label:
```ts
interface EventRoleGrant {
  userId: string;
  eventId: string;
  roleDefinitionId: string;   // references roleDefinitions/{id}
  listType: "volunteer" | "committee";
  activatesAt: Timestamp;     // e.g., 2 hours before event start
  expiresAt: Timestamp;       // e.g., event end + buffer
  active: boolean;            // maintained by scheduled function
}
```

We'll launch with a small starter set on each list (just enough to cover today's real usage) and expand either list whenever the board's actual set of roles becomes clearer — that's a Settings-screen edit, not a rebuild.

---

## 7. Security Model

**Defense in depth, four layers:**

1. **Firebase Auth** — identity verification (phone/OTP, Apple/Google).
2. **Custom Claims** — coarse, permanent authorization (member vs admin, admin subtype).
3. **Firestore Security Rules** — deny-by-default; every collection has explicit read/write rules referencing `request.auth.uid`, custom claims, and (for event-scoped resources) a `get()` lookup against `eventRoles` to check active status and permission flags.
4. **Cloud Functions (callable) as the only path for sensitive writes** — ticket generation, QR validation, food redemption, payment confirmation, and role grants are executed exclusively server-side. Security rules for these collections explicitly **deny all direct client writes** and only allow reads.

**Additional requirements:**
- **QR encryption:** each QR payload is a signed JSON blob encrypted with AES-256-GCM using a server-held key (Cloud Functions environment secret via Secret Manager). Payload includes `ticketId`, `eventId`, `registrationId`, `exp` (expiry), and an HMAC signature. Validation happens only via a callable function (`validateTicket`) — the client never decrypts or trusts the QR content itself, it just relays the scanned string to the server.
- **Replay protection:** once a ticket is marked `redeemed`, the validation function rejects subsequent scans (idempotency via Firestore transaction on the ticket doc).
- **Audit logs:** every admin action (role grant, ticket revoke, refund, announcement broadcast) writes an immutable `auditLogs` entry (`actorId`, `action`, `targetId`, `timestamp`, `metadata`), write-only from functions, read-only for Super Admins.
- **Rate limiting:** callable functions apply per-uid rate limiting (via Firestore-backed counters or App Check + Cloud Armor if traffic grows) to prevent scanner abuse or brute-force ticket guessing.
- **App Check** enabled on both mobile and web clients to ensure only legitimate app instances call Firebase services.
- **PII minimization:** dietary/accessibility notes and family member birthdates are stored but access-scoped — volunteers see only what's needed at check-in (name, family size, food remaining), not full profile data.

---

## 8. API Architecture

The "API" is the set of **Firebase Callable Functions** (HTTPS callable, using `onCall`), grouped by domain. This gives us auth-context-aware, type-safe, CORS-free calls from both mobile and web without hand-rolling a REST layer.

**Naming convention:** `domain_action`, e.g.:

```
auth_setAdminRole
auth_provisionFamilyMember

events_create
events_update
events_archive
events_provisionWorkspace   (internal trigger, not client-callable)

registrations_create
registrations_cancel
registrations_calculateTickets

tickets_generate            (internal, triggered by registration)
tickets_validate             (called by scanner)
tickets_revoke

food_redeem
food_getStatus

payments_createIntent
payments_confirmWebhook      (HTTPS endpoint, not callable — Stripe webhook)
payments_refund

roleDefinitions_create      (add a new Volunteer or Committee role name to the list)
roleDefinitions_update      (rename, toggle canScanTickets, activate/deactivate)
roles_assign                (assign a person + roleDefinitionId to an event)
roles_revoke
roles_getActiveForUser

announcements_send
announcements_schedule

tasks_create
tasks_updateStatus
tasks_assign

chat_sendMessage             (could also be direct Firestore write with rules, since low-risk)

analytics_getEventSummary
analytics_getOrgDashboard

documents_upload
documents_delete
```

Each function:
- Validates the caller's auth + role via a shared middleware (`requireAuth`, `requireRole(["admin"])`, `requireCanScanTickets(eventId)` — looks up the caller's active `EventRoleGrant` for that event, then checks the referenced `roleDefinitions/{id}.canScanTickets`).
- Validates input with a shared Zod schema (from `packages/validation`), reused by client-side forms for consistent validation UX.
- Wraps logic in Firestore transactions where atomicity matters (ticket redemption, capacity limits, payment confirmation).
- Emits an audit log entry for any mutating admin action.

**Why callable functions over REST/GraphQL:** for a Firebase-native app, callables give free auth context propagation, automatic retries client-side, and no need to manage a separate API gateway or CORS policy. If the org later needs public/partner APIs, we can add an Express-based HTTPS API in the same Functions codebase without restructuring.

---

## 9. State Management

**Mobile (React Native):**
- **React Query (TanStack Query)** owns all server-derived state: events list, registrations, tickets, roles, workspace data. Configured with Firestore listeners bridged into Query's cache (`onSnapshot` → `queryClient.setQueryData`) so we get realtime updates *and* Query's caching/retry/offline semantics.
- **Zustand** owns ephemeral UI/local state: current scanner mode, active family-member selection during registration, theme, onboarding progress.
- **Persisted state:** Zustand + `react-native-mmkv` for fast, encrypted local persistence (auth session hints, last-viewed event, offline scan queue).

**Admin Web (Next.js):**
- Same React Query pattern for server state, hydrated server-side where useful (e.g., event list SSR for fast first paint), then live-subscribed client-side for real-time dashboard updates.
- Zustand for dashboard UI state (selected date range in analytics, live-mode toggle, sidebar state).

**Real-time layers requiring direct `onSnapshot` (bypassing React Query cache staleness):**
- Live Event Mode dashboard (attendance/check-in counts)
- Event workspace chat
- QR scanner validation feedback

---

## 10. Firestore Collections (Detailed)

```
users/{uid}
  - displayName, phone, email, photoUrl
  - role: "member" | "admin"
  - adminLevel?: "super" | "org" | "finance" | "content"
  - membership: { id, status, expiresAt, qrCode }
  - createdAt, updatedAt

users/{uid}/familyMembers/{memberId}
  - name, relation ("spouse"|"child"|"parent"|"guest"), ageGroup ("adult"|"child"|"senior")
  - dietaryNotes?, accessibilityNotes?

events/{eventId}
  - title, description, bannerUrl, category
  - startAt, endAt, location: { address, lat, lng }
  - capacity, registrationDeadline
  - pricing: { adult, child, senior }
  - foodRules: { ticketsPerAdult, ticketsPerChild }
  - customQuestions: [{ id, label, type, required }]
  - status: "draft" | "published" | "live" | "ended" | "archived"
  - workspaceStatus: "not_created" | "provisioned" | "active" | "locked"
  - createdBy, createdAt, updatedAt

events/{eventId}/registrations/{registrationId}
  - userId (account holder)
  - attendees: [{ familyMemberId | "self", name, ageGroup }]
  - rsvpStatus: "yes" | "no" | "maybe"
  - answers: { [questionId]: value }
  - paymentStatus: "unpaid" | "paid" | "refunded"
  - totalAmount, paymentIntentId
  - createdAt

events/{eventId}/registrations/{registrationId}/tickets/{ticketId}
  - attendeeName, ageGroup
  - qrPayloadEncrypted (opaque string, decrypted only server-side)
  - status: "valid" | "redeemed" | "revoked"
  - redeemedAt?, redeemedBy?

events/{eventId}/registrations/{registrationId}/foodTickets/{foodTicketId}
  - attendeeRef, allocated, redeemed (bool), redeemedAt?, redeemedBy?

roleDefinitions/{roleDefinitionId}
  - name (e.g., "Volunteer", "Setup Crew", "Committee Member")
  - listType: "volunteer" | "committee"
  - canScanTickets (bool)
  - active (bool — soft-delete, keeps history intact)
  - createdBy, createdAt
  (admin-editable list; seeded with a small starter set per list at launch)

events/{eventId}/roles/{roleGrantId}
  - userId, roleDefinitionId (references roleDefinitions/{id}), listType
  - activatesAt, expiresAt, active

events/{eventId}/tasks/{taskId}
  - title, description, assignedTo (userId), status, priority, notes, updatedAt

events/{eventId}/workspaceChat/{messageId}
  - senderId, text, attachmentUrl?, createdAt

events/{eventId}/documents/{documentId}
  - title, fileUrl, uploadedBy, uploadedAt

events/{eventId}/timeline/{itemId}
  - label, startAt, endAt, order

announcements/{announcementId}
  - title, body, audience ("all"|"members"|"volunteers"|eventId-scoped)
  - scheduledFor?, sentAt?, pinned (bool), createdBy

documentLibrary/{documentId}
  - title, category, fileUrl, tags[], eventId?, uploadedBy, createdAt

gallery/albums/{albumId}
  - eventId, title, coverPhotoUrl
gallery/albums/{albumId}/photos/{photoId}
  - uploadedBy, url, status ("pending"|"approved"|"rejected"), likes, createdAt

auditLogs/{logId}
  - actorId, action, targetType, targetId, metadata, timestamp

analyticsRollups/{eventId}
  - attendanceCount, revenueTotal, foodRedeemedCount, volunteerHours, capacityPct
  - updatedAt (maintained by scheduled/trigger functions, not computed client-side)
```

---

## 11. Cloud Functions (Complete List by Trigger Type)

**Callable (client-invoked):**
`auth_setAdminRole`, `auth_provisionFamilyMember`, `events_create/update/archive/delete`, `registrations_create/cancel`, `tickets_validate`, `tickets_revoke`, `food_redeem`, `payments_createIntent`, `payments_refund`, `roleDefinitions_create/update`, `roles_assign/revoke`, `announcements_send/schedule`, `tasks_create/updateStatus/assign`, `documents_upload/delete`, `analytics_getEventSummary/getOrgDashboard`.

**Firestore Triggers:**
- `onRegistrationCreated` → generates tickets + food tickets for all attendees (transaction).
- `onEventCreated` → provisions the event workspace (creates default timeline template, empty task list, chat room).
- `onRoleGrantWritten` → validates permission shape, logs audit entry.
- `onPhotoUploaded` → sets status `pending`, triggers admin notification for gallery approval.

**Scheduled (Cloud Scheduler + Pub/Sub):**
- `expireEventRoles` (runs every 15 min) → flips `active: false` for role grants past `expiresAt`; flips `active: true` for grants entering their `activatesAt` window.
- `lockEndedWorkspaces` (runs hourly) → sets `workspaceStatus: "locked"` for events past `endAt` + buffer, archives chat/tasks as read-only.
- `rollupAnalytics` (runs every 10 min during live events, hourly otherwise) → recomputes `analyticsRollups/{eventId}`.
- `membershipExpiryReminder` (daily) → pushes renewal notifications.

**HTTPS (non-callable) endpoints:**
- `payments_stripeWebhook` — receives Stripe events (`payment_intent.succeeded`, `charge.refunded`), verifies signature, updates registration payment status.

---

## 12. Storage Architecture

Firebase Storage, bucketed by purpose with matching security rules:

```
/users/{uid}/profile/            — profile photos (owner read/write, public read for display)
/events/{eventId}/banner/         — event banner images (admin write, public read)
/events/{eventId}/documents/      — workspace documents (role-restricted read)
/documentLibrary/                 — public/member-facing documents
/gallery/{albumId}/               — event photo uploads (member write w/ pending status, public read only after approval)
```

- All uploads go through resumable upload with client-side compression (mobile: `expo-image-manipulator`) before upload to control storage costs.
- Storage Security Rules mirror Firestore role checks (custom claims + a lightweight cross-check callable if event-role validation is needed for document access).
- CDN caching via Firebase Hosting/Storage's default CDN for gallery and public documents.

---

## 13. Payment Architecture

SFVGA uses external HTTPS payment links with manual organizer verification, not a payment processor SDK or webhook. The approved workflow is:

1. Server saves/resumes an attendee-locked signup and reserves capacity.
2. Member opens payment, returns, enters payer details, and completes registration before closing.
3. An authorized registration manager confirms a draft Yes/No decision.
4. Eligible completed registrations receive deterministic tickets and durable notifications.

Signup completion and payment review are separate states. Rejection holds QR eligibility at registration level; scan validation always checks that eligibility. Private conversations, correction exceptions, and a cross-event review queue support manual resolution without collecting banking credentials. Historical tickets retain their identifiers and eligibility. See [the full design and release gates](./SFVGA-Manual-Payment-Verification.md).

---

## 14. QR System Architecture

**Generation (server-side only, in `tickets_generate`):**
1. Build payload: `{ ticketId, eventId, registrationId, attendeeName, exp }`.
2. Sign with HMAC-SHA256 using a Secret Manager-held key → append signature.
3. Encrypt the whole payload with AES-256-GCM (same or a second key) → base64 encode.
4. Render as QR image (server-side, using `qrcode` npm package) → store the encoded string in Firestore (`qrPayloadEncrypted`); the *image* is rendered on-device from the string for display (no need to store image files).

**Validation (scanner flow):**
1. Volunteer scans QR → gets raw encrypted string.
2. Client calls `tickets_validate({ scannedString, eventId })` — never decrypts locally.
3. Cloud Function: decrypts, verifies HMAC signature, checks `exp`, looks up ticket doc, checks `status == "valid"` inside a **Firestore transaction**.
4. If valid → transaction sets `status: "redeemed"`, `redeemedAt`, `redeemedBy`; returns attendee info (name, family size, food tickets remaining, notes) to display.
5. If already redeemed → returns a clear "already checked in at [time] by [volunteer]" response (prevents screenshot reuse).
6. If revoked/expired/invalid signature → clear rejection reason returned (never a generic error — front-desk staff need to know *why*).

**Offline fallback:**
- Scanner caches the day's valid ticket list (IDs + hashes only, not full payloads) locally for offline soft-validation, then queues redemptions to sync once connectivity returns, resolved via the transaction's `status` check to prevent double-redemption conflicts (last-write-wins with a conflict log if two offline devices scanned the same ticket).

**Revocation:**
- `tickets_revoke` (admin-only) instantly sets `status: "revoked"`, so even a valid unscanned QR will be rejected on next scan attempt.

---

## 15. Event Workspace Architecture

Each event gets an **isolated workspace** that is really just a well-defined access pattern over subcollections already in Section 10, plus a lifecycle state machine:

```
   [Event Created]
          │  onEventCreated trigger
          ▼
   workspaceStatus: "not_created" → "provisioned"
   (default timeline template, empty chat, empty task board created)
          │  roles_assign called by admin (picks a person + a role from the Volunteer or Committee list)
          ▼
   activatesAt reached (scheduled function)  →  roles become active
          │
          ▼
   workspaceStatus: "active"  (event is happening / about to happen)
     - Live Dashboard (real-time listeners on registrations, tickets, foodTickets, roles)
     - Staff Tools (e.g., the QR scanner) gated by the `canScanTickets` flag on the role assigned to the user's active role grant
     - Chat, Tasks, Documents, Timeline all live-editable by assigned staff
          │  event endAt + buffer passed (scheduled function)
          ▼
   workspaceStatus: "locked"  →  "archived"
     - Chat/tasks become read-only
     - Roles auto-expire (roles_expire scheduled function)
     - Data retained for historical reporting, no manual cleanup needed
```

**Access control inside the workspace:** every screen/tool checks the user's `EventRoleGrant` for *that specific eventId* (and, for scanning specifically, the `canScanTickets` flag on the referenced role) — a volunteer active on Event A has zero access to Event B's workspace, enforced both in the UI (hide tools) and in Firestore rules / callable functions (reject regardless of UI state).

---

## 16. Admin Dashboard Architecture

**Normal Mode (default):**
- Event management (CRUD, publish/unpublish)
- Registration management (search, manual overrides, refunds)
- Volunteer/committee assignment UI (assign role + permission checkboxes, set activation window)
- Announcements composer (send now / schedule)
- Document library manager
- Gallery moderation queue
- Analytics (historical, org-wide)

**Live Event Mode (auto-activated when `workspaceStatus == "active"` and current time is within event window):**
- Real-time attendance counter (Firestore listener aggregating `tickets` where `status == "redeemed"`)
- Live check-in feed (last N scans, scrolling)
- Food distribution live counter
- Volunteer activity feed (who's scanning, who's redeeming food)
- Revenue-so-far ticker
- Capacity alerts (push admin notification at 80%/100% capacity)

**Emergency Control Panel:**
- `announcements_send` with `priority: "emergency"` → bypasses quiet-hours/scheduling, forces push notification with high-priority FCM flag.
- `events_pauseCheckIns` (sets a flag scanners check before allowing validation — a "circuit breaker" for e.g. a security incident).
- Staff-only broadcast (writes directly to `workspaceChat` with a `type: "alert"` flag for distinct UI treatment).

**Quick Actions bar:** each quick action maps 1:1 to a callable function listed in Section 11, surfaced as a single-tap button with confirmation modals for destructive/high-stakes ones (end event, revoke ticket, refund).

---

## 17. Suggested Development Phases

**Phase 0 — Foundations (1–2 weeks)**
- Monorepo scaffold, Firebase project setup (dev/staging/prod), CI/CD pipelines, design system tokens, shared types/validation packages.

**Phase 1 — Identity & Core Data (2–3 weeks)**
- Auth (phone OTP, Apple/Google sign-in), user provisioning, family member management, custom claims infrastructure, base Firestore rules.

**Phase 2 — Events & Registration (3–4 weeks)**
- Event CRUD (admin), public event browsing (mobile), registration flow with family selection, custom questions, capacity enforcement.

**Phase 3 — Payments & Ticketing (3 weeks)**
- Stripe integration (PaymentSheet, webhooks), QR generation/encryption, ticket wallet UI.

**Phase 4 — Check-in & Food Distribution (2–3 weeks)**
- QR scanner (online + offline), validation Cloud Function, food ticket redemption flow, front-desk UX.

**Phase 5 — Event Workspace & Temporal RBAC (3–4 weeks)**
- Role grant system, scheduled activation/expiry functions, workspace chat/tasks/documents/timeline, permission-gated UI.

**Phase 6 — Admin Control Center (2–3 weeks)**
- Normal Mode dashboard, Live Event Mode, analytics rollups, Emergency Control Panel.

**Phase 7 — Community Features (2 weeks)**
- Announcements, push notifications, gallery with moderation, document library, membership cards.

**Phase 8 — Hardening & Launch (2–3 weeks)**
- Security rule audit, load testing (simulate large check-in events), accessibility pass (senior/child usability), App Store/Play Store submission, admin training.

**Total estimate: ~20–25 weeks** for a small senior team (2–3 engineers + 1 designer), assuming phases have some overlap rather than strict sequencing.

---

## Open Questions for Approval

1. **RN vs Flutter** — I've recommended React Native for hiring/ecosystem reasons; confirm this matches your team's preference before we scaffold.
2. **Phone OTP as primary login** — good fit for a family/senior-friendly community, but confirm SMS costs (via Firebase Auth) are acceptable at your expected user volume.
3. **Single Stripe account** — no need for Stripe Connect/multi-party payouts unless SFVGA plans to split revenue with sub-groups or vendors; confirm.
4. **Offline scanning tolerance** — confirmed approach uses "soft validation + sync" for offline mode; there's an inherent small window where a double-redemption *could* slip through across two offline devices scanning the same ticket simultaneously. Acceptable trade-off for a community event, but flagging explicitly.

Once you confirm or adjust the above, I'll move into Phase 0 implementation.
