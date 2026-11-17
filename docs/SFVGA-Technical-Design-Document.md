# SFVGA Platform — Technical Design Document

> **Approved payment design — September 2026:** [Manual payment verification](./SFVGA-Manual-Payment-Verification.md) supersedes all earlier Stripe, payment bypass, direct-client ticket writes, automatic payment confirmation, and attendee-editing descriptions in this document. PROJECT_RULES.md remains the highest-priority project instruction. Other historical architecture sketches are not authorization to add features.


**Version:** 1.0 (Implementation-Ready)
**Scale target:** ~500 members, single organization
**Philosophy:** Simple, maintainable, straightforward — not over-engineered for a scale this org will never hit

This document assumes the reader has the architecture doc and the simplified role-list decision. It goes one level deeper: concrete schemas, concrete flows, concrete security rules, concrete function signatures. A developer should be able to start building directly from this.

---

## 1. System Overview

```
┌──────────────────────┐        ┌──────────────────────┐
│   Mobile App (RN)     │        │  Admin Web (Next.js)  │
│   iOS + Android       │        │  Board/volunteers use │
└──────────┬────────────┘        └──────────┬────────────┘
           │                                 │
           └───────────────┬─────────────────┘
                            ▼
                  ┌───────────────────┐
                  │  Cloud Functions   │   (single API surface,
                  │  (callable, TS)    │    both apps call the same fns)
                  └─────────┬──────────┘
                            ▼
        ┌───────────────────────────────────────┐
        │              Firestore                │
        │  (single database, no sharding,        │
        │   no multi-region complexity needed)   │
        └───────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Firebase       Stripe        Firebase
          Storage      (payments)     Cloud Messaging
```

One database, one backend, two thin clients. No microservices, no message queue, no third database. At 500 members and a dozen or so events a year, a single well-organized Firestore instance and a single Cloud Functions codebase is not just "enough" — it's the *correct* choice; splitting this up further would only add operational surface area with nothing to show for it.

---

## 2. Firestore Collection Structure & Relationships

### 2.1 Collection Diagram

```
users/{uid}
 ├─ familyMembers/{memberId}                 (subcollection)
 │
events/{eventId}
 ├─ registrations/{registrationId}           (subcollection)
 │   └─ tickets/{ticketId}                   (subcollection)
 ├─ roles/{roleGrantId}                      (subcollection — volunteer/committee assignments)
 └─ announcements/{announcementId}           (subcollection — event-scoped updates)

roleDefinitions/{roleDefinitionId}           (top-level — the two editable lists)

announcements/{announcementId}               (top-level — org-wide announcements)

documentLibrary/{documentId}                 (top-level)

gallery/{albumId}
 └─ photos/{photoId}                         (subcollection)

feedback/{feedbackId}                        (top-level — one row per event per family)
```

### 2.2 Why Subcollections vs Top-Level (Rule of Thumb Used Throughout)

- **Subcollection** when the data is always queried *in the context of its parent* (tickets always belong to one registration, roles always belong to one event).
- **Top-level** when the data is queried *across* parents (all announcements regardless of event, the document library, the two role-definition lists).

This isn't a hard science — it's just "where will the app actually query this from" applied consistently, which keeps the schema predictable for every future developer instead of needing a design doc re-read every time.

### 2.3 Full Document Shapes

```ts
// users/{uid}
interface User {
  uid: string;
  displayName: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  role: "member" | "admin";
  adminLevel?: "super" | "org" | "finance" | "content"; // only present if role === "admin"
  membership: {
    id: string;
    status: "active" | "expired";
    expiresAt: Timestamp;
  };
  notificationPrefs: {
    announcements: boolean;
    eventReminders: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// users/{uid}/familyMembers/{memberId}
interface FamilyMember {
  id: string;
  name: string;
  relation: "spouse" | "child" | "parent" | "guest";
  ageGroup: "adult" | "child" | "senior";
  dietaryNotes?: string;
}

// events/{eventId}
interface Event {
  id: string;
  title: string;
  description: string;
  bannerUrl?: string;
  startAt: Timestamp;
  endAt: Timestamp;
  location: { name: string; address: string; lat: number; lng: number };
  parkingNote?: string;          // plain text, e.g. "Parking in the school lot behind the building"
  whatToBring?: string;          // plain text
  schedule?: string;             // plain text, line-per-item, e.g. "6:00 Doors open\n7:00 Program begins"
  faqs: { question: string; answer: string }[];
  capacity?: number;
  registrationDeadline?: Timestamp;
  pricing: { adult: number; child: number; senior: number };  // 0 if free
  status: "draft" | "published" | "ended";
  duplicatedFromEventId?: string;  // set when created via "Duplicate this event"
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// events/{eventId}/registrations/{registrationId}
interface Registration {
  id: string;
  userId: string;                 // account holder who registered
  attendees: {
    familyMemberId: string | "self";
    name: string;
    ageGroup: "adult" | "child" | "senior";
  }[];
  donationAmount?: number;        // optional add-on donation at checkout
  paymentStatus: "unpaid" | "paid" | "free";
  totalAmount: number;
  paymentIntentId?: string;
  createdAt: Timestamp;
}

// events/{eventId}/registrations/{registrationId}/tickets/{ticketId}
interface Ticket {
  id: string;
  attendeeName: string;
  ageGroup: "adult" | "child" | "senior";
  qrPayloadEncrypted: string;      // opaque, decrypted only server-side
  status: "valid" | "redeemed" | "revoked";
  redeemedAt?: Timestamp;
  redeemedBy?: string;              // uid of the volunteer who scanned it
}

// roleDefinitions/{roleDefinitionId}
interface RoleDefinition {
  id: string;
  name: string;                       // e.g. "Volunteer", "Setup Crew", "Committee Member"
  listType: "volunteer" | "committee";
  canScanTickets: boolean;
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

// events/{eventId}/roles/{roleGrantId}
interface EventRoleGrant {
  id: string;
  userId: string;
  roleDefinitionId: string;
  listType: "volunteer" | "committee";
  activatesAt: Timestamp;
  expiresAt: Timestamp;
  active: boolean;                   // maintained by a scheduled function
}

// announcements/{announcementId}  (org-wide) and events/{eventId}/announcements/{id} (event-scoped)
interface Announcement {
  id: string;
  title: string;
  body: string;
  eventId?: string;                 // present only for event-scoped announcements
  createdBy: string;
  createdAt: Timestamp;
}

// documentLibrary/{documentId}
interface LibraryDocument {
  id: string;
  title: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: Timestamp;
}

// gallery/{albumId}
interface GalleryAlbum {
  id: string;
  eventId: string;
  title: string;
  coverPhotoUrl?: string;
}

// gallery/{albumId}/photos/{photoId}
interface GalleryPhoto {
  id: string;
  uploadedBy: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}

// feedback/{feedbackId}
interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: Timestamp;
}
```

That's the entire schema. No sharded counters, no analytics rollup collection maintained by a fleet of scheduled jobs, no audit-log collection, no multi-tenant `orgId` field — all deliberately left out per the simplicity review. If SFVGA ever outgrows this, extending it later (adding a field, adding a collection) is easy; building it now would just be unused surface area.

---

## 3. Authentication Flow

```
1. User opens app → chooses "Sign in with phone number"
2. Firebase Auth sends OTP via SMS
3. User enters OTP → Firebase Auth verifies → returns auth token
4. Client checks: does users/{uid} exist?
     NO  → onCreate Cloud Function trigger fires:
             - creates users/{uid} with role: "member"
             - sends welcome push/email (optional, simple)
     YES → proceed directly to Home
5. Client subscribes (onSnapshot) to:
     - users/{uid}                          (their own profile)
     - events/*/roles where userId == uid    (their active volunteer/committee assignments)
6. App now has everything it needs to render the right UI (member vs
   volunteer-for-event-X vs admin) without additional round trips.
```

**Admin accounts:** created the same way (phone sign-in), but `role: "admin"` and `adminLevel` are set only by an existing Super Admin through a callable function (`auth_setAdminRole`) — never client-writable, never self-service. For a 500-member org, we expect a small, known handful of admin accounts (the board), so this manual-grant approach is intentionally simple rather than building a request/approval workflow.

**Session handling:** standard Firebase Auth session persistence (refresh tokens handled by the SDK). No custom device/session management screen — unnecessary at this scale; if someone needs to sign out a lost phone, they just sign out from that phone, or an admin can note it and the org re-issues access if truly needed.

---

## 4. Permission Flow

Permission checks happen at three points, always in the same order, for consistency:

```
1. UI layer (mobile/admin) — hides/shows buttons based on locally cached
   role state. This is a UX convenience ONLY. It is never trusted for security.

2. Firestore Security Rules — the first real gate. Every rule checks
   request.auth (is the user signed in) and, where relevant, a get()
   lookup against roleDefinitions / eventRoles to confirm active status.

3. Cloud Function (callable) — the final and most important gate for
   anything sensitive (ticket validation, food/payment actions, role
   assignment). Functions re-check the caller's role server-side and
   never trust a client-supplied "I'm an admin" flag.
```

**Concrete permission resolution example — "can this user scan tickets for event X":**

```ts
async function canScanTickets(uid: string, eventId: string): Promise<boolean> {
  const grant = await db.collection(`events/${eventId}/roles`)
    .where("userId", "==", uid)
    .where("active", "==", true)
    .limit(1)
    .get();

  if (grant.empty) return false;

  const roleDefId = grant.docs[0].data().roleDefinitionId;
  const roleDef = await db.doc(`roleDefinitions/${roleDefId}`).get();
  return roleDef.exists && roleDef.data()?.canScanTickets === true;
}
```

This single function is called from inside `tickets_validate` before any redemption is allowed — simple, readable, and the entire permission model for check-in in one place.

**Admin permission levels** (`super` / `org` / `finance` / `content`) are checked via Firebase custom claims, set once by `auth_setAdminRole` and read directly off the auth token — no Firestore lookup needed for admin-level checks, which keeps admin actions fast.

---

## 5. Event Lifecycle

```
DRAFT ──────────► PUBLISHED ──────────► ENDED
  │                    │                   │
  │ admin creates       │ members can       │ after endAt passes
  │ (or duplicates       │ register &        │ (simple date check,
  │  a past event)       │ pay                │ no scheduled function
  │                     │                   │  needed — just a status
  │                     │ registrations      │  flip an admin can also
  │                     │ close at           │  do manually)
  │                     │ registrationDeadline│
  ▼                     ▼                   ▼
"Duplicate event"    Live event page      Gallery unlocked,
copies title/desc/    shown to members     feedback prompt
schedule/FAQs/        with countdown,      shown to attendees
pricing into a new    map, schedule, etc.
draft; admin just
updates the date.
```

**Key simplification vs a typical "enterprise" event system:** there is no separate "workspace provisioning," "live mode," or "archival" pipeline. `status` is a single field an admin sets (with `published`→`ended` optionally automated by a simple daily scheduled function that flips status for events whose `endAt` has passed — one small job, not a fleet of them). Everything else (schedule, FAQs, parking note) is just plain fields on the `Event` document from the moment it's created — there's nothing to "activate."

---

## 6. Registration Lifecycle

Members select attendees and see a price breakdown. `registrations_create` recalculates the price, transactionally checks capacity, saves one signup per account/event, and returns the existing signup on retry. Priced signups start as `started/pending`; attendees and total are locked. The external HTTPS payment link opens only after saving. Returning from the payment service is not payment verification.

Members enter payer name (required) and optional reference/note, then press **I’ve paid — finish registration**. `registrations_finish` checks ownership and the deadline and sets `submitted/pending`. Free signups are immediately submitted and approved. Started signups reserve places until closing; submitted registrations retain places. Only an authorized correction exception can reopen an expired signup, and capacity is rechecked.

## 7. Payment Lifecycle

The event stores `paymentUrl` separately from description. Server-side publishing requires an HTTPS link and registration deadline for priced events. Deadlines are displayed in America/Los_Angeles and enforced on the server. The member receives a persistent submitted confirmation, not automatic navigation.

Registration managers draft exclusive Yes/No decisions and explicitly confirm changed rows. Expected revisions detect conflicts; stable request IDs make retries safe. Approval generates deterministic attendee tickets in an eligibility-checked transaction, then creates the durable tickets-ready notice. Rejection creates a durable notice and private conversation entry. Yes→No suspends eligibility without altering revoked or redeemed ticket state; Yes again restores only eligible tickets. Every scan checks registration eligibility, including historical QR screenshots.

Messages live under each registration; member notices live under users. Push is best effort with tracked retries and generic private-message previews. The attention queue includes open unfinished signups and all unresolved submitted signups even after closing; approved/free registrations leave it. Unread conversations remain separately discoverable. See the approved design for release verification and compatibility.

---

## 8. QR Ticket Lifecycle

```
GENERATION (server-side, inside onRegistrationConfirmed trigger):
  1. Build payload: { ticketId, eventId, registrationId, attendeeName, exp }
  2. Sign with HMAC-SHA256 (key in Secret Manager)
  3. Encrypt with AES-256-GCM → base64 string
  4. Store the encoded string on the Ticket doc (qrPayloadEncrypted)
  5. Client renders the QR code image ON-DEVICE from that string
     (no image file stored — just render from the string, every time)

VALIDATION (check-in scanner flow):
  1. Volunteer (with canScanTickets == true) scans a QR → gets the raw string
  2. Client calls tickets_validate({ scannedString, eventId })
       — client NEVER decrypts locally
  3. Cloud Function, inside a Firestore transaction:
       - decrypts, verifies HMAC signature, checks exp
       - looks up the ticket doc
       - if status == "valid"      → sets "redeemed", returns attendee info
       - if status == "redeemed"   → returns a FRIENDLY message:
             "This ticket was already scanned at 6:42pm" (not a red error code)
       - if status == "revoked"    → "This ticket is no longer valid — please see an organizer"
  4. Scanner UI shows attendee name + family size + any notes on successful scan

REVOCATION:
  - Admin-only tickets_revoke sets status: "revoked" instantly — even an
    unscanned valid QR is rejected on next scan attempt.
```

**Offline behavior:** intentionally simple. If the scanner has no connectivity, it shows "No connection — try again" and does not allow a scan to proceed. We are **not** building an offline validation cache or conflict-resolution sync queue — SFVGA's venues have wifi/cell coverage, and the rare dead spot is better solved by a volunteer walking a few feet than by a whole offline-sync subsystem that adds real complexity for a problem that essentially won't occur.

---

## 9. Admin Workflow

```
Create/duplicate an event
  → "New Event" or "Duplicate" (copies title, description, schedule,
     FAQs, pricing from a past event) → edit fields → set status: "published"

Assign volunteers/committee
  → Open event → "Assign Staff" → pick a person from the member list
     → pick a role from the Volunteer or Committee dropdown
       (populated from roleDefinitions) → set activation window
       (defaults to a few hours before start / a bit after end)

Manage roleDefinitions (rare, as-needed)
  → Settings → "Volunteer Roles" / "Committee Roles" → add/rename/deactivate

Manage registrations
  → Open event → searchable list (name, party size, payment status)
     → manual edit/cancel/refund if needed → export to spreadsheet
       (simple CSV button, used as a printed backup check-in list)

Send an announcement
  → "New Announcement" → write message → choose audience
     (Everyone, or "People registered for [event]") → Send
       (single send-now flow; no scheduling or priority tiers)

Moderate gallery
  → Pending photos queue → approve/reject → approved photos go live,
     triggers a single "Photos are up!" notification to attendees

Review feedback
  → Simple list per event: average star rating + comments
```

---

## 10. Volunteer Workflow

```
1. Admin assigns the volunteer to an event with a role (e.g., "Volunteer"
   or "Check-in Staff") and an activation window.
2. Shortly before activatesAt, the volunteer's app shows a new
   "You're on staff for [Event]" card on their Home screen (no separate
   "workspace" app section to learn — it's just an extra card).
3. During the activation window:
     - If their role has canScanTickets == true → a "Scan Tickets" button
       appears, opening the camera-based scanner.
     - If not (a "Helper" role) → they see the event's schedule/FAQs/info
       page, same as any member, just flagged as staff for visibility.
4. After expiresAt passes, the scan button disappears automatically
   (checked server-side on every tickets_validate call — even if the
   client UI were somehow tricked into showing the button, the Cloud
   Function itself re-checks `active` and the time window before allowing
   a scan).
```

No separate task board, staff chat, or document tab — the original "Event Workspace" concept is intentionally collapsed into "the event page, plus a scan button when it's your shift." Coordination among volunteers (who's covering what, when) continues to happen the way it already does today — a text thread or a quick conversation — because building a dedicated in-app tool for that would be solving a problem SFVGA doesn't actually have.

---

## 11. Notification Flow

```
Trigger                          → Channel(s)                → Cadence
─────────────────────────────────────────────────────────────────────────
Registration confirmed           → push + email (PDF ticket)  → once, immediate
1 day before a registered event   → push                       → once
New announcement posted           → push (+ visible in the      → once per announcement
                                     in-app Announcements feed,
                                     so it's not lost if missed)
Gallery album approved            → push                       → once
Feedback prompt (post-event)      → gentle in-app prompt only   → once, NOT a push
                                     (shown next time they open
                                      the app after the event)
```

All notifications route through Firebase Cloud Messaging. There is no notification "priority tier" system, no scheduling engine beyond the single day-before reminder (computed by one simple scheduled function that runs once daily and checks `startAt` against tomorrow's date), and no per-notification-type granular preference screen beyond the two toggles already in `User.notificationPrefs` (announcements, event reminders) — enough control without a settings page nobody will fully use.

---

## 12. API / Cloud Function Architecture

All functions are Firebase **callable functions** (`onCall`), grouped by file/folder in one Functions codebase. No REST gateway, no GraphQL layer — callables give free auth-context propagation to both the mobile app and the admin web app with no extra plumbing.

```
functions/src/
├── auth/
│   └── setAdminRole.ts
├── events/
│   ├── create.ts
│   ├── update.ts
│   ├── duplicate.ts
│   └── endPassedEvents.ts        (scheduled, runs daily)
├── registrations/
│   ├── create.ts
│   ├── update.ts
│   └── cancel.ts
├── payments/
│   ├── createIntent.ts
│   ├── refund.ts
│   └── stripeWebhook.ts          (HTTPS, not callable — receives Stripe events)
├── tickets/
│   ├── onRegistrationConfirmed.ts (Firestore trigger — generates tickets)
│   ├── validate.ts
│   └── revoke.ts
├── roles/
│   ├── roleDefinitions_create.ts
│   ├── roleDefinitions_update.ts
│   ├── assign.ts
│   ├── revoke.ts
│   └── expireRoleGrants.ts       (scheduled, runs every hour)
├── notifications/
│   ├── sendAnnouncement.ts
│   ├── eventReminder.ts          (scheduled, runs daily)
│   └── galleryApprovedNotify.ts  (Firestore trigger)
├── gallery/
│   ├── uploadPhoto.ts
│   └── moderatePhoto.ts
├── documents/
│   ├── upload.ts
│   └── delete.ts
└── shared/
    ├── requireAuth.ts
    ├── requireAdmin.ts
    ├── canScanTickets.ts
    └── qrCrypto.ts
```

**Function count is intentionally small.** Roughly 25 functions total cover the entire app. No analytics rollup jobs, no audit-log writer, no distributed counter maintenance — everything reads directly off the collections in Section 2 since none of them see write volume anywhere near what would require aggregation tricks.

**Every callable follows the same shape:**
```ts
export const registrations_create = onCall(async (request) => {
  requireAuth(request);                       // throws if not signed in
  const input = registrationCreateSchema.parse(request.data); // Zod validation
  // ... business logic, wrapped in a transaction where it touches capacity ...
  return { registrationId };
});
```

---

## 13. Security Rules Overview

Firestore rules are the second line of defense (after Cloud Functions do the sensitive writes). General shape:

```js
// firestore.rules (excerpt)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return request.auth.token.role == "admin"; }
    function isOwner(uid) { return request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isSignedIn();               // members can see basic directory info
      allow write: if isOwner(uid) || isAdmin();  // users edit their own profile; admins can too
      match /familyMembers/{memberId} {
        allow read, write: if isOwner(uid) || isAdmin();
      }
    }

    match /events/{eventId} {
      allow read: if true;                        // event info is public within the app
      allow write: if isAdmin();

      match /registrations/{regId} {
        allow read: if isSignedIn() &&
          (resource.data.userId == request.auth.uid || isAdmin());
        allow write: if false;                     // ALL writes go through Cloud Functions only
        match /tickets/{ticketId} {
          allow read: if isSignedIn() &&
            (get(/databases/$(database)/documents/events/$(eventId)/registrations/$(regId)).data.userId == request.auth.uid
             || isAdmin());
          allow write: if false;                    // never client-writable
        }
      }

      match /roles/{roleId} {
        allow read: if isSignedIn();
        allow write: if isAdmin();                  // simple: admins manage assignments directly
      }
    }

    match /roleDefinitions/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /announcements/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /gallery/{albumId} {
      allow read: if isSignedIn();
      match /photos/{photoId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn();              // members can upload, status starts "pending"
        allow update, delete: if isAdmin();          // only admins approve/reject/remove
      }
    }

    match /documentLibrary/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /feedback/{id} {
      allow read: if isAdmin();
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

**Guiding principle, stated simply:** anything money- or ticket-related is `allow write: if false` at the rules layer — full stop, no exceptions — because that logic must run inside a Cloud Function where it can be validated, transactional, and safe from a modified client. Everything else (profile edits, photo uploads, reading public event info) uses simple, readable rules directly, because adding a Cloud Function in front of a low-risk write would just be unnecessary ceremony.

---

## 14. Offline Behavior

Kept deliberately minimal:

| Scenario | Behavior |
|---|---|
| Member browsing events with poor connectivity | Firestore's built-in offline cache serves last-synced data automatically (no custom code needed — this is a default SDK behavior) |
| Member viewing a ticket with no connection | Ticket QR renders fine (it's generated from locally-cached data, no network call needed to *display* a QR) |
| Volunteer scanning with no connection | Scanner shows "No connection — try again" and blocks the scan. No offline queue. |
| Registration/payment attempted with no connection | Blocked with a clear message ("You'll need an internet connection to register") — these are exactly the two actions we want to always be online/server-validated |

This matches the philosophy directly: Firestore's default offline read caching gives a decent baseline experience for free, and we don't build custom offline-write logic for the handful of actions (payment, ticket redemption) that genuinely require server validation to be trustworthy.

---

## 15. Deployment Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│  GitHub repo    │     │ GitHub Actions │     │  Firebase project  │
│  (monorepo)     │────►│  CI/CD          │────►│  (single project,  │
└───────────────┘     └───────┬───────┘     │   dev + prod via    │
                               │             │   Firebase "aliases")│
                               │             └───────────────────┘
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
           EAS Build      Vercel deploy   firebase deploy
           (mobile app    (admin web      (Functions,
            builds for     dashboard)      Firestore rules,
            app stores)                    Storage rules)
```

- **Two environments: dev and prod.** Not dev/staging/prod-with-canary — a 500-member org's small dev team needs a safe place to test and a place that's live, and that's genuinely sufficient. Use Firebase project aliases (`firebase use dev` / `firebase use prod`) rather than provisioning entirely separate infrastructure.
- **Mobile releases** go through Expo/EAS Build → TestFlight (iOS) / internal track (Android) for a quick admin/volunteer smoke test → public release. No elaborate phased-rollout percentage system needed — just release to everyone once it's been checked.
- **Admin web** deploys straight to Vercel on merge to `main` (after passing CI), since it's low-risk to redeploy quickly if something's off.
- **Functions/Firestore rules** deploy via `firebase deploy` from CI, gated by the same GitHub Actions pipeline (run tests → deploy).
- **Backups:** Firestore's built-in daily automated export (a single scheduled Cloud Function calling the standard export API to a Storage bucket) is enough — no custom backup tooling, no formal quarterly restore-drill program. If it's ever needed, the export sits there ready to be imported.
- **Monitoring:** Firebase's built-in Crashlytics (mobile) and Cloud Functions error logging (via the Firebase console) are sufficient. No separate observability stack (Sentry, Datadog, etc.) needed at this scale — the built-in tools already surface what a small team needs to notice something broke.

---

## Summary

This document is intentionally shorter than a typical "enterprise" technical design doc for a system of this description — and that's the point. ~10 top-level collections, ~25 Cloud Functions, two environments, one Firestore instance, no custom offline sync, no analytics pipeline. Every lifecycle (event, registration, payment, ticket) is a short, linear flow a single developer can hold in their head. A small team can start implementing directly from Sections 2 (schema), 12 (functions), and 13 (rules) today.
