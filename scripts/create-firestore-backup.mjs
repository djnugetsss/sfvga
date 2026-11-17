/** Creates and waits for a managed Firestore export using the authenticated Firebase CLI. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const projectId = process.argv[2];
if (!projectId) throw new Error('Usage: node scripts/create-firestore-backup.mjs <firebase-project-id>');

const firebaseBin = execFileSync('sh', ['-lc', 'command -v firebase'], { encoding: 'utf8' }).trim();
if (!firebaseBin) throw new Error('Firebase CLI is required. Install it and run firebase login.');
const firebaseRequire = createRequire(realpathSync(firebaseBin));
const firebaseAuth = firebaseRequire('../auth');
const scopes = firebaseRequire('../scopes');
const account = firebaseAuth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Run firebase login --reauth before backup.');
const { access_token: accessToken } = await firebaseAuth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
if (!accessToken) throw new Error('Firebase CLI did not provide an access token.');
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

const bucketsResponse = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`, { headers });
if (!bucketsResponse.ok) throw new Error(`Could not list backup buckets (${bucketsResponse.status}): ${await bucketsResponse.text()}`);
const buckets = (await bucketsResponse.json()).items ?? [];
// Firestore export only accepts US multi-region or us-central* buckets for this database.
// The default Firebase Storage bucket may live in a different region.
const compatible = buckets.filter((item) => /^US(?:-CENTRAL\d*)?$/i.test(item.location ?? ''));
const bucket = compatible.find((item) => item.name.startsWith('gcf-sources-'))
  ?? compatible.find((item) => item.name === `${projectId}.appspot.com`)
  ?? compatible[0];
if (!bucket?.name) throw new Error('No Firestore-export-compatible US/US-Central bucket is available.');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputUriPrefix = `gs://${bucket.name}/firestore-backups/payment-rollout-${stamp}`;
const exportResponse = await fetch(
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default):exportDocuments`,
  { method: 'POST', headers, body: JSON.stringify({ outputUriPrefix }) },
);
if (!exportResponse.ok) throw new Error(`Could not start Firestore backup (${exportResponse.status}): ${await exportResponse.text()}`);
const operation = await exportResponse.json();
if (!operation.name) throw new Error('Firestore did not return a backup operation.');
console.log(`Backup started: ${outputUriPrefix}`);

for (let attempt = 0; attempt < 120; attempt++) {
  const statusResponse = await fetch(`https://firestore.googleapis.com/v1/${operation.name}`, { headers });
  if (!statusResponse.ok) throw new Error(`Could not check backup (${statusResponse.status}): ${await statusResponse.text()}`);
  const status = await statusResponse.json();
  if (status.done) {
    if (status.error) throw new Error(`Firestore backup failed: ${JSON.stringify(status.error)}`);
    console.log(`Backup completed: ${outputUriPrefix}`);
    process.exit(0);
  }
  await setTimeout(5000);
}
throw new Error(`Backup is still running after 10 minutes: ${operation.name}`);
