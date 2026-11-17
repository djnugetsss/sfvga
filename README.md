# SFVGA Platform

Community operating system for the San Fernando Valley Gujarati Association — mobile app, admin dashboard, and Firebase backend.

## Rahil-Work combined preview

This branch combines the functional SFVGA app at `Rshah2012/SFVGA_App@d7ea25a`
with the association information from `djnugetsss/sfvga@67a0145`. It is a
separate integration checkout; the existing live website is not deployed from
this branch. The member app keeps its Home, Events, Messages, Tickets, and
Profile navigation. **Home → Explore SFVGA** and **Profile → About SFVGA**
open the partner's mission, board, membership, youth, documents, and FAQ
content. Live events, registration, tickets, and admin operations continue to
use the functional app's implementation.

The merge preview has its own native bundle identifier and URL scheme. Its
Firebase default alias is deliberately unset. Configure an isolated Firebase
project or use the emulator demo before testing any action that writes data.
The current functional code still targets Rahil's existing Firebase backend
when its local environment is configured; it does not connect to the partner's
Firebase project. The team can move to a new shared backend later.

Firebase client configuration belongs in local environment variables. For an
Android native build, place `google-services.json` in `apps/mobile/` locally;
it is ignored by Git. For a web push build, set the `EXPO_PUBLIC_FIREBASE_*`
variables in the shell and run `pnpm --filter @sfvga/mobile build:web`. That
generates the public service worker configuration during the build. Firebase
client API keys are identifiers visible in any shipped app, so protect the
backend with Security Rules and restrict the key to the required Firebase APIs.
For the seeded, isolated web demo, use Node 22 and Java 21:

```bash
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH fnm exec --using 22 pnpm test:payments:ui
```

This starts the member preview at `http://localhost:8082` and the admin
preview at `http://localhost:3002`. The demo uses `demo-sfvga-payment-ui` and
cannot write to the production Firebase project. Do not deploy this branch to
`sfvga-cabe6.web.app`; release integration needs a separate review.

## Structure

```
apps/mobile       — React Native (Expo) member app
apps/admin-web    — Next.js admin dashboard
packages/*        — Shared types, validation, UI tokens
functions/        — Firebase Cloud Functions
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Firebase CLI (`npm i -g firebase-tools`)
- Expo CLI / EAS CLI (for mobile builds)

## Setup

```bash
pnpm install
cp apps/mobile/.env.development.example apps/mobile/.env.local
cp apps/admin-web/.env.development.example apps/admin-web/.env.local
cp functions/.env.development.example functions/.env.local
cp functions/.secret.local.example functions/.secret.local
```

Fill in the local environment files and replace the project aliases in `.firebaserc`.
See `docs/FIREBASE_SETUP.md` for the exact Firebase Console setup and secret handling steps.

## Development

```bash
# Mobile app
pnpm --filter @sfvga/mobile dev

# Admin web
pnpm --filter @sfvga/admin-web dev

# Cloud Functions (emulator)
firebase emulators:start
```

## Documentation

See `docs/` for architecture, technical design, project structure, and UI/UX specifications.
