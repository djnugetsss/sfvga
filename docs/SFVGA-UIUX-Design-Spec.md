# SFVGA Mobile App — Complete UI/UX Design Specification

> **Approved payment design — September 2026:** [Manual payment verification](./SFVGA-Manual-Payment-Verification.md) supersedes all earlier Stripe, payment bypass, direct-client ticket writes, automatic payment confirmation, and attendee-editing descriptions in this document. PROJECT_RULES.md remains the highest-priority project instruction. Other historical architecture sketches are not authorization to add features.

> **Visual refinement — November 2026:** The shared tokens and implemented screens use warm ivory (`#FAF7EF`) as the canvas, deep burgundy (`#74363C`) for primary actions, selected navigation, and major headings, and antique gold (`#C79A2B`) only as a restrained accent. Preserve this established visual character; refine spacing, labels, and legibility without replacing its colors or card patterns with mockup styling. Keep the approved payment wording and workflow unchanged.

**Scope:** Member-facing mobile app (the app ~500 members and their families use day to day). Screens match the navigation structure from the project structure document.

**Design mandate:** extremely simple, warm, and usable by someone who opens the app twice a year — including seniors who may not be comfortable with technology. Every screen is judged against one question: _could a grandparent figure this out on the first try, without anyone explaining it?_

---

## 0. Design System Foundation

Every screen below is built from this shared system — stated once here so it isn't repeated 13 times.

### 0.1 Color Palette

| Token         | Hex (approx.) | Usage                                                                       |
| ------------- | ------------- | --------------------------------------------------------------------------- |
| `saffron`     | #C79A2B       | Decorative gold accents; not a background for small white labels            |
| `primary`     | #74363C       | Burgundy primary actions with white labels                                  |
| `gold`        | #C79A2B       | Same SFVGA gold, used for borders and dividers                              |
| `deepBlue`    | #74363C       | Legacy token name for burgundy; primary headings and actions                |
| `white`       | #FFFFFF       | Backgrounds, cards                                                          |
| `warmGray50`  | #FAF7EF       | App background (warm off-white, not stark white)                            |
| `warmGray400` | #756F64       | Secondary/muted text                                                        |
| `success`     | #49705A       | Confirmations, "valid ticket," paid status                                  |
| `error`       | #A6473D       | Errors — used sparingly, never for routine states like "already checked in" |
| `warning`     | #8A6419       | Non-blocking alerts (e.g., "registration closes in 2 days")                 |

**Rule:** the deeper `error` red is reserved for things that are genuinely wrong (payment failed, network error). Gujarati red is a separate secondary brand accent and does not signal failure by itself. Routine informational states (already scanned, event ended, no results yet) use neutral text, not error styling.

### 0.2 Typography

| Style           | Size | Weight   | Usage                                                                                       |
| --------------- | ---- | -------- | ------------------------------------------------------------------------------------------- |
| `displayLarge`  | 29sp | Bold     | Event detail titles                                                                         |
| `headingLarge`  | 25sp | Bold     | Screen titles                                                                               |
| `headingMedium` | 20sp | Semibold | Card titles                                                                                 |
| `bodyLarge`     | 18sp | Regular  | Default body text — deliberately larger than a typical 16sp default, for senior readability |
| `bodyMedium`    | 16sp | Regular  | Secondary body text, captions with real content                                             |
| `caption`       | 14sp | Regular  | Timestamps, minor metadata only — used minimally                                            |

All text respects the OS-level font-scaling setting (Dynamic Type on iOS, font scale on Android) — nothing is fixed at a pixel size that ignores a user's accessibility settings.

### 0.3 Spacing Scale

`4 / 8 / 12 / 16 / 24 / 32 / 48` (px/dp). Use 12–16 for internal grouping, 16 between related rows, and 24 between sections. Nothing tighter than 8dp between separately tappable elements, to keep tap targets forgiving for less precise motor control.

### 0.4 Shared Component Language

- **Cards:** warm-white background, 14dp rounded corners, a subtle border and shallow shadow only when separation is needed. Prefer plain rows with dividers for lists and secondary detail sections.
- **Buttons:** minimum 48dp height (56dp for member primary CTAs), 12dp rounded corners, full-width on mobile forms. Use burgundy `primary` with white labels/icons, burgundy outlines for secondary actions, and plain text for tertiary actions. Hover uses `primaryHover`, never a translucent fill that reduces contrast.
- **Hierarchy:** reserve editorial serif for screen titles and major headings; use clean sans-serif for forms, conversations, and navigation. Bottom-tab labels are sentence case at 11dp, with a soft burgundy active indicator. Message bubbles distinguish outgoing from incoming with quiet brand and neutral surfaces. Gold is decorative, not a solid primary-button fill.
- **Icons:** paired with a text label wherever they're interactive — no icon-only buttons for primary actions, since unlabeled icons are a common senior-usability failure point.

### 0.5 Accessibility Baseline (Applies to Every Screen)

- Minimum tap target: 48x48dp, even where the visible icon/text is smaller.
- Color is never the only signal (e.g., "paid" also has a checkmark + the word "Paid," not just a green dot).
- All interactive elements have accessible labels for screen readers (VoiceOver/TalkBack).
- Text contrast meets WCAG AA minimum against its background at every color-token pairing above.
- Font scaling respected (0.2 above).
- No content relies on gesture alone (swipe-to-delete always has a visible button alternative).
- Member notifications can be dismissed with a left swipe or a visible Dismiss button. Dismissal hides an item from that device's notification feed without deleting its underlying announcement, registration, or message. Admin notices have a visible Dismiss action saved per admin account.
- The member notification screen mirrors the admin bell's calm row layout: a clear title and subtitle, All/Unread controls, full readable message text, an explicit destination action, Mark read, and Dismiss. Publication of a new open event creates one durable member alert per event; it opens that event and pushes to members who allow announcement alerts. Drafts and closed events do not alert members.

---

## 1. Phone Sign-In Screen

**Purpose:** the very first thing a new or returning user sees. Must feel instantly trustworthy and require zero learning.

**Layout:** vertically centered, single column.

- SFVGA logo, centered, top third of screen.
- `headingLarge`: "Welcome to SFVGA"
- `bodyLarge`, muted: "Enter your phone number to get started"
- Phone number input (large, single field, country code pre-filled to +1)
- Primary button: "Continue"
- Small `caption` legal line below button: "We'll text you a code to verify it's you"

**Components:** `Input` (phone-formatted, auto-formats as typed), `Button` (primary).

**Navigation:** on success → OTP Verify Screen. No back navigation needed (first screen).

**User interactions:** type number → tap Continue → button shows inline loading spinner (replaces label text, doesn't change size) → navigates forward on success.

**Empty state:** N/A (this screen has no data to be empty).

**Loading state:** button shows spinner in place of "Continue" text while the OTP is being sent; rest of screen stays static and interactive-looking so it doesn't feel frozen.

**Error state:** inline red text below the input ("That doesn't look like a valid phone number" / "We couldn't send a code — check your connection and try again") — the input field itself gets a red border, not the whole screen.

**Buttons:** one primary button only. No secondary actions on this screen — deliberately nothing else to look at or misclick.

**Colors:** `warmGray50` background, `deepBlue` heading text, `saffron` button.

**Accessibility:** phone input has `keyboardType: phone-pad` and an explicit label ("Phone number") for screen readers, not just a placeholder (placeholders disappear once typing starts and screen readers may not re-announce them).

---

## 2. OTP Verify Screen

**Purpose:** confirm the code sent by SMS, second and final step before entering the app.

**Layout:**

- `headingLarge`: "Enter the code"
- `bodyLarge`, muted: "We sent a 6-digit code to (XXX) XXX-1234"
- Six-box OTP input (large individual digit boxes, auto-advance, auto-submits when the 6th digit is entered — no separate "Verify" button needed to reduce taps)
- Text link below: "Didn't get a code? Resend" (disabled/grayed for 30 seconds after send, then becomes tappable)
- Text link: "Wrong number? Go back"

**Components:** `OtpInput` (6 boxes), text link buttons.

**Navigation:** success → Home Screen (first-time users see a brief 2-step onboarding first, see Note below). "Go back" → Phone Sign-In Screen.

**User interactions:** typing the last digit auto-submits — no explicit "Confirm" tap required, minimizing steps for an already slightly technical flow.

**Loading state:** after auto-submit, the 6 boxes show a subtle pulse/shimmer while verifying (under a second typically) rather than a full-screen spinner, keeping the code visible so the user isn't left wondering what happened to what they typed.

**Error state:** boxes shake gently and turn red-bordered with text below: "That code doesn't match — try again," and the boxes clear for re-entry. Never a generic "Error" alert popup.

**Colors/Typography:** identical system to Screen 1 for consistency.

**Accessibility:** each OTP box is independently focusable and announced by screen readers as "digit 1 of 6," etc.; auto-advance works with assistive keyboards too.

**Note on first-run onboarding:** immediately after first successful verification only, a brief two-card swipe-through appears ("Add your family" / "Turn on notifications for event reminders") — skippable with a visible "Skip" text link on every card, never a forced flow. This is the only onboarding in the app; it never reappears for returning users.

---

## 3. Home Screen

**Purpose:** the screen a member sees most — answers "what's coming up" and "is there anything I need to do" in one glance. Highest-priority screen per the design review.

**Layout (top to bottom):**

1. Header: "Hi, [First Name]" + small profile icon (top-right, tap → Profile).
2. **"What's Next" card** — the single biggest, most prominent card on the screen: upcoming event banner image, title, date, a one-line countdown ("in 5 days"), and a "View & Register" or "View Tickets" button depending on registration status.
3. **"You're on staff" card** (only visible if the user has an active or upcoming volunteer/committee role) — shows the event name and role, with a "Scan Tickets" button if their role allows scanning and its grant window is currently active. A member with permanent organization-wide scanning access also sees this shortcut on their event-specific scanner assignments, even before the temporary grant begins. Other roles only show event info.
4. **Announcements feed** — a simple scrollable list of the 3 most recent announcements, each a small card (title + first line + timestamp), with "See all" link at the bottom.

**Components:** `EventCard` (large variant for "What's Next"), `StaffCard`, `AnnouncementListItem`, `Button`.

**Navigation:** "What's Next" card → Event Detail Screen. On a scanner assignment, the staff card and its "Scan Tickets" action → Scanner Screen; other staff cards → Event Detail Screen. "See all" → full Announcements list (simple screen, list of `AnnouncementListItem`s, no separate spec needed beyond what's described here since it's just this feed un-truncated).

**User interactions:** pull-to-refresh at the top of the screen (standard, expected gesture) re-syncs data; tapping any card navigates, nothing on this screen requires precision tapping (all cards are single large tap targets, not small buttons inside them).

**Empty state:** if there are no upcoming events at all, the "What's Next" card is replaced with a friendly illustration + `bodyLarge` text: "No upcoming events right now — check back soon!" No dead-end error feel, just calm information.

**Loading state:** skeleton placeholder cards (soft gray rounded rectangles matching the card shapes) while data loads, not a spinner — feels faster and less jarring on a screen someone opens frequently.

**Error state:** if data fails to load (rare — bad connectivity), a small inline banner at the top: "Couldn't refresh — showing your last saved info" with a "Retry" text link. The screen still shows whatever was last cached rather than going blank, per the offline-behavior design from the technical doc.

**Buttons:** primary saffron button inside the "What's Next" card only; everything else is a full-card tap or a text link — avoids button clutter on the most-viewed screen.

**Accessibility:** the whole "What's Next" card is one accessible element with a full descriptive label ("Diwali Celebration, in 5 days, view and register"), not several small separately-announced pieces.

---

## 4. Event List Screen

**Purpose:** browse all upcoming events (and, in a simple toggle, past events for looking back at gallery/feedback).

**Layout:**

- Simple header: "Events"
- Small segmented toggle: "Upcoming" / "Past" (defaults to Upcoming)
- Vertical scrolling list of `EventCard` (medium variant: banner thumbnail, title, date, one-line location)

**Components:** `EventCard` (medium), segmented control.

**Navigation:** tap any card → Event Detail Screen.

**User interactions:** scroll, tap toggle, tap card. No search bar or filters — at ~10-15 events a year, a plain scrolling list is genuinely sufficient and simpler than adding a search feature nobody needs yet.

**Empty state:** "Upcoming" empty → "Nothing scheduled yet — check back soon." "Past" empty (new member) → "Your event history will show up here once you've attended something."

**Loading state:** 3-4 skeleton `EventCard` shapes while loading.

**Error state:** same inline retry banner pattern as Home Screen.

**Colors:** `warmGray50` background, cards white with the gold-accented top border strip on each card matching its category color if categories are used (optional visual touch, not required).

**Accessibility:** the segmented toggle is clearly labeled ("Upcoming events" / "Past events" as accessible names, not just "Upcoming"/"Past" which could be ambiguous out of visual context to a screen reader).

---

## 5. Event Detail Screen

**Purpose:** everything a member needs to know about one specific event — the highest-value screen from the "keep it simple" review. One page, no tabs.

**Layout (top to bottom, single scroll):**

1. Banner image (full width)
2. `displayLarge` title, overlaid or just below the banner
3. **Countdown row**: "5 days until this event" (only shown pre-event; replaced by "Happening now" during the event window, and hidden entirely after it ends)
4. **Primary CTA button**, contextual:
   - Not registered, registration open → "Register Now"
   - Registered, event upcoming → "View My Tickets"
   - Event happening right now → "Show My Tickets" (visually emphasized, e.g., slightly larger)
   - Event ended → button removed entirely, replaced by "View Photos" once gallery is live
5. **Date, time, and location card** — includes an embedded small map thumbnail; tapping it opens native Maps app for directions. Parking note (if the admin added one) shown directly beneath in plain text.
6. **What to bring / dress code** card (only rendered if the admin filled this field in — otherwise the section doesn't appear at all, avoiding empty-looking cards).
7. **Schedule card** (only if the admin added one) — simple stacked list, "6:00 Doors open," "7:00 Program begins," etc.
8. **FAQs card** — simple accordion-style expand/collapse list of question/answer pairs.
9. **Announcements for this event** (event-scoped ones only) — small feed, same component as Home Screen's.

**Components:** `CountdownTimer`, `EventMap`, `FaqList` (accordion), `AnnouncementListItem`, `Button`.

**Navigation:** "Register Now" → Registration Screen. "View/Show My Tickets" → Ticket Wallet Screen (pre-filtered to this event). "View Photos" → Album View Screen for this event.

**User interactions:** vertical scroll, tap map thumbnail (opens external Maps app with a native OS confirmation, standard behavior), tap FAQ items to expand/collapse individually.

**Empty state:** N/A at the page level (an event always has at least title/date/location); individual optional sections simply don't render if empty, as noted above — this _is_ the empty-state handling for this screen: absence, not a placeholder saying "No FAQs yet."

**Loading state:** the whole page shows a skeleton version of the layout (gray banner block, gray title bar, gray card shapes) while the event document loads.

**Error state:** if the event fails to load (bad link, deleted event), a simple centered message: "We couldn't find this event" with a "Go back" button — no jargon, no error codes shown to the member.

**Buttons:** exactly one primary CTA button per screen state, always in the same visual position (just below the countdown) so returning users' muscle memory transfers across every event they've ever viewed.

**Colors:** banner may include a subtle gradient overlay (deepBlue, low opacity) at the bottom edge so white title text stays readable regardless of the photo underneath.

**Accessibility:** countdown text is also read by screen readers in full sentence form ("5 days until this event"), not just visually implied by a number; the map thumbnail has an accessible label ("Open directions to [venue name]").

---

## 6. Registration Screen

Keep the existing attendee picker and price breakdown. For priced signups, prominently show **One more step after payment** with the total, a reminder to return, and **Continue to payment**. Save the signup before opening the link; do not promise a particular bank app opens. Keep an **Open payment link** fallback visible. The same link appears alongside the event description while registration is open.

Resume the saved signup after reload or bank return, with attendees and quoted total locked. Require **Payer’s name**; **Payment reference or note** is optional. The completion action is **I’ve paid — finish registration**. Display a persistent **Registration submitted** confirmation explaining that QR codes appear in Tickets after verification and the member will be notified. Never automatically navigate away. Free signups skip payment review.

The status screen contains a private organizer conversation. After a No decision, the member can correct payment and press **I’ve updated my payment — request review** once per review cycle. Closed actions are disabled; an organizer can grant a time-limited correction exception. Show closing times with the Pacific timezone.

The admin table retains attendee, phone, payer/note, price, dates, and tickets. **Paid? Yes / No** controls are mutually exclusive drafts until **Confirm payment decisions** and a named summary are confirmed. Warn before leaving with unsaved selections. Show row errors and require conflicted rows to be refreshed. Private conversation and exception controls require registration-management permission.

The dashboard shows **Registrations needing attention**, distinguishing Waiting for member, Awaiting review, Payment issue, and Payment updated. Prioritize updates/unread replies; retain unresolved submitted registrations after closing. Show **Unread registration messages** separately. Empty state: **You’re all caught up. No registrations need review.**

Exact member-facing payment warnings and notification copy are specified in [the approved manual-payment design](./SFVGA-Manual-Payment-Verification.md).

---

## 7. Ticket Wallet Screen

**Purpose:** the single place to pull up a QR ticket — needs to work in under 2 seconds, including for someone standing at a check-in table.

**Layout:**

- Header: "My Tickets"
- If arriving from an Event Detail Screen "Show My Tickets" tap, opens **already scrolled/filtered** to that event's tickets.
- List of event groups, most imminent first: each group shows the event name/date as a small header, followed by one **Ticket Card** per attendee registered.
- Each Ticket Card: attendee name, a "Tap to view QR" affordance, and a small status tag (Upcoming / Checked In).

**Components:** `TicketCard`, `QrCodeDisplay` (shown full-screen on tap, see below).

**Navigation:** tap a Ticket Card → **full-screen QR view** (not a new screen exactly, more like an expanded modal): large QR code centered, attendee name and event name above it, a "Done" text link or swipe-down to dismiss. Brightness is programmatically boosted while this view is open (a small but genuinely useful detail for scanning in dim venue lighting).

**User interactions:** tap card → full QR view; swipe down or tap outside to dismiss. That's the entire interaction set — deliberately minimal since this screen gets used in a slightly stressful "people are waiting behind me in line" moment.

**Empty state:** "You don't have any tickets yet — register for an event to see them here," with a button linking to the Event List Screen.

**Loading state:** skeleton ticket-card shapes while loading; since this screen may be opened with poor connectivity at a venue, it relies on Firestore's offline cache to show the last-synced tickets immediately rather than a spinner blocking the view.

**Error state:** essentially none needed for viewing (cached data always available). Revoked tickets and superseded QR generations stay in the server's audit history but are hidden from the member wallet. Checked-in tickets and tickets for ended events remain in Past.

**Buttons:** none needed beyond the implicit tap-to-expand — this screen is about speed, not choices.

**Colors:** the full-screen QR view uses a plain white background regardless of app theme, since QR scanners read a plain white/black code most reliably — this is a deliberate exception to using the warm-gray app background.

**Accessibility:** the QR image itself has an accessible label stating the attendee/event in words ("Ticket for John Doe, Diwali Celebration") for a screen-reader user who may need someone else to actually scan it but wants to confirm they have the right one pulled up.

---

## 8. Scanner Screen

**Purpose:** used only by volunteers/committee members with an active, permitted role — fast, low-friction check-in tool. Not something a regular member ever opens.

**Layout:**

- Full-screen camera viewfinder with a rounded square scan-target overlay in the center.
- Top bar: event name + a small running counter ("42 checked in") for volunteer reassurance that it's working.
- Bottom: a flashlight toggle button (for dim entrances) and a "Manual search" text link (fallback: type a name to find their registration if a QR won't scan).

**Components:** camera view (native), simple overlay graphics, `Button` (flashlight toggle — icon + label "Flashlight").

**Navigation:** reached from the Home Screen's "You're on staff" card. Back button returns to Home.

**User interactions:** point camera at a QR — scanning is automatic on detection, no manual "capture" tap needed. After each scan, a brief full-width colored banner slides down over the viewfinder:

- **Valid, first scan:** green banner, "✓ John Doe — Checked in" (auto-dismisses after ~2 seconds, camera keeps scanning continuously in the background, no re-tap needed for the next person in line).
- **Already scanned:** blue/neutral banner (not red), "Already checked in at 6:42pm."
- **Revoked/invalid:** amber banner, "Not valid — please see an organizer."

**Empty state:** N/A (camera view is always "live").

**Loading state:** a brief (sub-second) spinner overlay on the scan-target itself while a scan is being validated server-side, so the volunteer knows a scan registered and isn't tempted to re-scan immediately.

**Error state:** if there's no connectivity, the whole viewfinder is covered by a calm message: "No connection — scanning is paused. Try moving closer to the entrance or check your wifi," with a "Retry" button — deliberately not a technical error, phrased as a physical, actionable suggestion since the volunteer using this may not be technical either.

**Buttons:** flashlight toggle (persistent, bottom-left), manual search link (bottom-right) — both always visible but small enough not to distract from the primary scanning action.

**Colors:** banners use `success` green, `deepBlue` (neutral/informational), and `warning` amber — never `error` red, per the system-wide rule that routine check-in outcomes (even "already scanned") shouldn't read as alarming to a volunteer or the guest standing in front of them.

**Accessibility:** each scan result banner is also announced via a short haptic pulse (different pattern for valid vs already-scanned vs invalid) so a volunteer glancing away from the screen for a second still gets non-visual confirmation.

---

## 9. Album List Screen (Gallery)

**Purpose:** browse photo albums, organized by event.

**Layout:**

- Header: "Photos"
- Grid or stacked list of album cards: cover photo thumbnail, event name, photo count.

**Components:** `AlbumCard` (thumbnail + title + count).

**Navigation:** tap an album → Album View Screen.

**User interactions:** scroll, tap.

**Empty state:** "No photos yet — check back after the next event!"

**Loading state:** skeleton thumbnail grid.

**Error state:** standard inline retry banner, consistent with other list screens.

**Accessibility:** each album card announces "[Event name] album, 34 photos" as one element.

---

## 10. Album View Screen

**Purpose:** view and save photos from a specific event.

**Layout:**

- Header: event name, back button.
- Photo grid (3 columns), tap any photo to view full-screen with swipe-left/right to browse the rest of the album.
- In full-screen photo view: a simple "Save" button (saves to the phone's photo library) and "Share" (native OS share sheet).

**Components:** photo grid, full-screen photo viewer (swipeable).

**Navigation:** back button returns to Album List Screen.

**User interactions:** tap to open full-screen, swipe to browse, tap Save/Share.

**Empty state:** N/A (only reached from a non-empty album).

**Loading state:** photos load progressively as low-res thumbnails first, sharpening in as full images load — standard, expected pattern for photo grids, avoids a long blank wait.

**Error state:** if a specific photo fails to load, its grid cell shows a small "Couldn't load" placeholder icon rather than breaking the whole grid layout.

**Accessibility:** full-screen viewer supports pinch-to-zoom for anyone wanting a closer look at a photo, and Save/Share buttons are labeled with text, not icon-only.

---

## 11. Profile Screen

**Purpose:** manage personal info and notification preferences — a short, calm settings screen.

**Layout:**

- Profile photo + name at top (tap photo to change).
- Simple list of rows: "Family Members" (→ Family Members Screen), "Notification Preferences" (two toggle switches inline: Announcements, Event Reminders), "Sign Out" (bottom, visually separated, text-only in a muted/neutral color, not styled as a warning even though it's a meaningful action — signing out isn't dangerous, just a normal action).

**Components:** `Avatar`, list rows with toggles, `Button` (text-style for Sign Out).

**Navigation:** "Family Members" row → Family Members Screen. "Sign Out" → confirms once ("Are you sure you want to sign out?") → Phone Sign-In Screen.

**User interactions:** tap toggles (instant save, no separate "Save" button — every setting change here should feel immediate, not require a confirm step).

**Empty state:** N/A.

**Loading state:** toggles show their last-known state immediately from cache; if a toggle change fails to save (rare), it visually reverts with a small toast: "Couldn't save — try again."

**Error state:** as above, handled inline per-toggle, not a full-page error.

**Accessibility:** toggles are standard native switch components (already accessible by default via the OS), each with a clear adjacent label rather than relying on icon meaning alone.

---

## 12. Family Members Screen

**Purpose:** add/edit the people who make up a member's household, used during registration.

**Layout:**

- Header: "Family Members"
- List of existing family members, each row: name, relation, age group, with a small "Edit" text link.
- "+ Add Family Member" button at the bottom, always visible (sticky).

**Components:** list rows, `Button` (Add), simple form (modal or pushed screen) for add/edit: Name, Relation (dropdown: Spouse/Child/Parent/Guest), Age Group (Adult/Child/Senior), optional Dietary Notes field.

**Navigation:** "Add" or "Edit" opens the simple form as a modal sheet (slides up from bottom, standard pattern), "Save" or "Cancel" to dismiss.

**User interactions:** tap Edit on a row, fill form fields, Save.

**Empty state:** "You haven't added any family members yet — add them here so registering for events is faster," shown above the Add button on first visit.

**Loading state:** minimal — this is locally-owned data, loads near-instantly from cache.

**Error state:** simple inline field-level validation (e.g., "Please enter a name") — no full-page errors on this screen.

**Buttons:** "Add Family Member" primary button, "Save"/"Cancel" in the modal form.

**Accessibility:** the add/edit form fields are all standard labeled inputs; the dropdown selectors use native OS picker components for maximum familiarity and built-in accessibility support rather than a custom-built picker UI.

---

## 13. Feedback Prompt (Lightweight Modal, Not a Full Screen)

**Purpose:** one simple question after an event, shown gently — never demanded.

**Layout:** a small bottom-sheet modal, not a full-screen takeover:

- `headingMedium`: "How was [Event Name]?"
- 5-star tap rating row (large, easy-to-tap stars)
- Optional comment field, appears only after a star is tapped ("Want to tell us more? (optional)")
- "Submit" button + a small "Not now" text link

**Components:** `StarRating`, `Input` (multiline, optional), `Button`.

**Navigation:** appears automatically (once) the first time a member opens the app after an event they attended has ended; dismissible via "Not now" or swipe-down, and never reappears for that event again either way.

**User interactions:** tap a star (1-5), optionally type a comment, tap Submit — or dismiss without rating at all.

**Empty/loading/error states:** minimal by design — this is a small, optional, low-stakes interaction; a failed submit simply shows a small inline "Couldn't send — try again" without blocking anything else in the app.

**Accessibility:** each star is independently tappable and labeled ("1 star" through "5 stars") for screen readers, and the modal can be dismissed via a standard accessible "close" action, not only a swipe gesture.

---

## Cross-Screen Consistency Summary

### Implemented payment and responsive layout conventions

- Member bottom navigation is Home, Events, Messages, Tickets, Profile. The Messages page uses the same eyebrow, display title, card, and empty-state patterns as Events and Tickets; it groups private conversations by event and shows only current and upcoming events. Past conversations remain stored but are hidden from this member list. A notification can open a linked current or upcoming event directly. Admin navigation is permission-filtered at the bottom on phones and desktop; Access remains in the header, not a tab.
- Payment and private-message notification previews are short and do not expose full private conversation text. On web, the initial payment action reserves a separate tab during the tap, saves the signup, then opens the payment URL in that tab. Later payment actions also open a separate tab. If pop-ups are blocked, keep SFVGA open and show an actionable error rather than navigating away.

- Private conversations use left/right message alignment, short sender/timestamp labels, and a compact reply composer. Earlier history is behind an explicit “Show earlier messages” control. Do not change the app palettes.
- The admin attention card has Payments and Messages filters with counts, concise rows, and a Show all control. The admin notification bell is separate from member notifications and contains registration activity only, with All/Unread filters and saved read state. See the manual-payment design for recipient permission rules.
- Paid signup alerts are sent when registration is finished and ready for review, not when a member only starts payment. Older “Registration started” alerts are hidden from the admin inbox; unfinished signups can still appear in the dashboard queue for operational follow-up.
- Event details use one combined Event sections control row: Event details, Registrations, Messages, Staff, and the permitted publishing status/action. Do not repeat Registrations or Staff in the page header. Controls wrap on smaller screens while retaining the existing palette.
- Deleting an event requires organization-wide `events.delete` permission and a confirmation that explicitly names registrations, private messages, tickets, announcements, and event roles. A server operation removes the selected event and its nested data; a failed deletion stays visible in the dialog with a retryable error.
- On the admin Members page, Super Admin appears in the same Admin role dropdown as other organization roles. Granting, changing, or revoking access uses one control pattern, with an explicit confirmation for Super Admin changes.
- On Organization Roles, only Super Admins can open the role editor. They may edit the protected Super Admin role’s name, description, and displayed permission list after an explicit confirmation. This list is informational: every Super Admin always has full effective access regardless of which boxes are checked. The edited name appears in admin/member access labels. The role’s protected system status and delete protection remain fixed. Every role card links to Members for granting or revoking member access; the Super Admin editor also links there. A Super Admin cannot revoke their own access. Seeding defaults does not overwrite organizer edits.

- The bottom navigation reserves its own layout space; it does not cover screen content. Registration and family-member action bars also stay in normal layout flow, above navigation, with padded, width-constrained buttons.
- Both member and admin surfaces use the shared SFVGA palette: deeper saffron with white text for primary buttons, soft gold with dark-gold text for active navigation/filters, Gujarati red for secondary actions and unread badges. Labels can wrap and buttons grow beyond their minimum touch height; preserve existing primary/secondary button variants. Keep safe-area space below navigation on phones and restrained card shadows on both surfaces.
- Registration separates the saved attendee/price summary, payment status notice, payment-completion form, and private conversation into readable cards. Payment instructions emphasize returning to finish registration without repeating long paragraphs.
- Event details have a centered reading width on desktop. Multiline fields provide a taller, top-aligned writing area. Screens no longer need oversized bottom padding to compensate for overlapping navigation.
- Admin payment statuses use plain-language badges. Review summaries and action groups wrap on small screens; registration tables offer horizontal scrolling with a visible mobile hint. Phone and Payer have separate columns. Private chats live in the event Messages section, not ticket dropdowns; the conversation list stacks above the selected chat on phones.
- These presentation changes preserve payment eligibility, deadlines, review permissions, and ticket behavior described in `Manual-Payment-Verification.md`.

A few rules that apply everywhere, restated because they're what actually make this feel "extremely simple" in practice rather than just individually simple screens:

- **The primary action button is always in the same relative position** (bottom of the visible content, same color, same size) across every screen that has one — Event Detail, Registration, and the Home Screen's "What's Next" card all train the same muscle memory.
- **Red is never used for routine states.** Only for things that are genuinely wrong. This single rule does more for making the app feel calm and non-intimidating than any individual screen's layout.
- **No screen requires more than one decision at a time** where avoidable — the Registration Screen is the most complex flow in the app and it's still a single scroll with one final button, not a multi-step wizard with a progress bar.
- **Every list has a warm, specific empty state**, never a blank screen or a generic "No data" message — each one tells the person what will appear there and, where relevant, what to do next.
- **Every loading state uses skeleton shapes that match the eventual content's layout**, not generic spinners, so the screen never feels like it's "thinking" — it feels like it's already there, just filling in.
