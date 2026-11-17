/** Read-only comparison of Firestore member profiles with Firebase Auth accounts. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';

const projectId = process.argv[2];
if (!projectId) throw new Error('Usage: node scripts/audit-orphan-members.mjs <firebase-project-id>');

const firebaseBin = execFileSync('sh', ['-lc', 'command -v firebase'], { encoding: 'utf8' }).trim();
if (!firebaseBin) throw new Error('Firebase CLI is required.');
const firebaseRequire = createRequire(realpathSync(firebaseBin));
const firebaseAuth = firebaseRequire('../auth');
const scopes = firebaseRequire('../scopes');
const account = firebaseAuth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Run firebase login --reauth before inventory.');
const { access_token: token } = await firebaseAuth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
if (!token) throw new Error('Firebase CLI did not provide an access token.');
const headers = { Authorization: `Bearer ${token}` };

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Inventory failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function listDocuments(collection) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await getJson(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return documents;
}

async function listAuthUserIds() {
  const ids = new Set();
  let pageToken = '';
  do {
    const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`);
    url.searchParams.set('maxResults', '1000');
    if (pageToken) url.searchParams.set('nextPageToken', pageToken);
    const page = await getJson(url);
    for (const user of page.users ?? []) ids.add(user.localId);
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return ids;
}

const [profiles, authIds, jobs] = await Promise.all([
  listDocuments('users'),
  listAuthUserIds(),
  listDocuments('accountDeletionJobs'),
]);
const jobByUid = new Map(jobs.map((job) => [job.name.split('/').at(-1), job.fields?.status?.stringValue]));
const orphans = profiles
  .filter((profile) => !authIds.has(profile.name.split('/').at(-1)))
  .map((profile) => ({
    uid: profile.name.split('/').at(-1),
    name: profile.fields?.displayName?.stringValue ?? 'Member',
    phoneLast4: profile.fields?.phone?.stringValue?.slice(-4) ?? '',
    deletionJobStatus: jobByUid.get(profile.name.split('/').at(-1)) ?? null,
  }));
console.log(JSON.stringify({ projectId, profileCount: profiles.length, authAccountCount: authIds.size, orphans }, null, 2));
