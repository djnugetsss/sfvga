# SFVGA merged preview

The merged app is developed on the `Rahil-Work` branch of `djnugetsss/sfvga`. It combines the functional SFVGA member/admin workflows with the community content and editorial design from the partner app. The original SFVGA production site and the partner-only preview are separate deployments.

## Preview links

- Member app: https://sfvga-cabe6-merged-preview.web.app/home
- Admin app: https://sfvga-merged-admin-preview.vercel.app (opens inside the member app from Profile)

The member site is the Firebase Hosting site `sfvga-cabe6-merged-preview`. The admin site is the isolated Vercel project `sfvga-merged-admin-preview`. The admin project accepts embedded sessions from the merged member site. The member web build must set `EXPO_PUBLIC_ADMIN_WEB_URL` to the admin preview URL.

## Data and release boundary

The previews currently use the **same `sfvga-cabe6` Firebase backend as the existing SFVGA app**, as requested until SFVGA creates its own backend. Preview actions that create events, register attendees, send messages, change roles, or approve payments can affect live records and notifications. Use test records and avoid changing real events while evaluating the design. Publishing the preview does not replace the existing SFVGA Hosting site or original admin deployment.

Before a broader release, create the new organization-owned Firebase project, migrate and validate data, update app configuration and authorized domains, deploy rules/functions/indexes/Storage, and test account sign-in, admin handoff, notifications, payment links, tickets, and scanner behavior against that project.

## Verification performed

The merged member and admin typechecks, lints, Jest suites, Expo web export, and admin production build passed. The preview URLs and admin frame policy returned HTTP 200. Authenticated phone/browser walkthroughs still require an SFVGA account and organizer-supplied payment link; no real payment was made during automated tests.
