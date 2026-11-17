/** Read-only inventory. Reuses the authenticated Firebase CLI session; never mutates data. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
const projectId = process.argv[2];
if (!projectId)
  throw new Error('Usage: node scripts/inventory-payment-rollout.mjs <firebase-project-id>');

const firebaseBin = execFileSync('sh', ['-lc', 'command -v firebase'], { encoding: 'utf8' }).trim();
if (!firebaseBin) throw new Error('Firebase CLI is required. Install it and run firebase login.');
const firebaseRequire = createRequire(realpathSync(firebaseBin));
const firebaseAuth = firebaseRequire('../auth');
const scopes = firebaseRequire('../scopes');
const account = firebaseAuth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Run firebase login --reauth before inventory.');
const { access_token: accessToken } = await firebaseAuth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
if (!accessToken) throw new Error('Firebase CLI did not provide an access token.');

function decode(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, nested]) => [key, decode(nested)]));
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  return undefined;
}

async function listDocuments(path) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Firestore inventory failed (${response.status}): ${await response.text()}`);
    const page = await response.json();
    documents.push(...(page.documents ?? []).map((document) => ({
      id: document.name.split('/').at(-1),
      data: Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, decode(value)])),
    })));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return documents;
}

const report = [];
for (const event of await listDocuments('events')) {
  const data = event.data;
  const prices = data.pricing ?? {};
  const priced =
    Object.values(prices).some((value) => typeof value === 'number' && value > 0) ||
    (prices.childRule?.price ?? 0) > 0;
  const regs = await listDocuments(`events/${encodeURIComponent(event.id)}/registrations`);
  const users = new Set();
  let duplicateAccounts = 0,
    historicalRegistrations = 0,
    historicalTickets = 0,
    workflowTickets = 0,
    historicalUnpaidWithoutTickets = 0;
  for (const reg of regs) {
    if (users.has(reg.data.userId)) duplicateAccounts++;
    users.add(reg.data.userId);
    const count = (await listDocuments(`events/${encodeURIComponent(event.id)}/registrations/${encodeURIComponent(reg.id)}/tickets`)).length;
    if (reg.data.workflowVersion !== 1) {
      historicalRegistrations++;
      historicalTickets += count;
      if (reg.data.paymentStatus === 'unpaid' && count === 0) historicalUnpaidWithoutTickets++;
    } else workflowTickets += count;
  }
  report.push({
    eventId: event.id,
    title: data.title,
    status: data.status,
    registrations: regs.length,
    historicalRegistrations,
    historicalTickets,
    workflowTickets,
    duplicateAccounts,
    historicalUnpaidWithoutTickets,
    needsPaymentSetup:
      priced && (!data.paymentUrl?.startsWith('https://') || !data.registrationDeadline),
  });
}
console.log(
  JSON.stringify({ projectId, generatedAt: new Date().toISOString(), events: report }, null, 2),
);
