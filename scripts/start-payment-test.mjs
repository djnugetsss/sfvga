import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, cpSync, existsSync, symlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectId = 'demo-sfvga-payment-ui';
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Use Node 22: fnm exec --using 22 pnpm test:payments:ui');
if (spawnSync('java', ['-version'], { stdio: 'ignore' }).status !== 0) throw new Error('Java is required for the Firebase emulators. Add a Java 21 installation to PATH and retry.');
const runtime = join(root, '.payment-test', 'functions');
// Generated local runtime copies no production .env or secret files.
mkdirSync(runtime, { recursive: true });
const built = spawnSync('pnpm', ['--filter', '@sfvga/functions', 'build'], { cwd: root, stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
cpSync(join(root, 'functions', 'lib'), join(runtime, 'lib'), { recursive: true });
const pkg = JSON.parse(readFileSync(join(root, 'functions', 'package.json'), 'utf8'));
writeFileSync(join(runtime, 'package.json'), JSON.stringify({ ...pkg, name: 'sfvga-payment-test-runtime' }, null, 2));
writeFileSync(join(runtime, '.secret.local'), 'QR_SIGNING_KEY=local-payment-test-secret-not-for-production\n');
if (!existsSync(join(runtime, 'node_modules'))) symlinkSync(join(root, 'functions', 'node_modules'), join(runtime, 'node_modules'), 'junction');
// Firebase resolves pnpm dependency links relative to the generated source directory.
if (!existsSync(join(root, '.payment-test', 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(root, '.payment-test', 'node_modules'), 'junction');
const children = [];
let stopping = false;
function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('exit', stop);
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
  children.push(child);
  child.on('exit', (code) => { if (!stopping) { stop(); process.exitCode = code ?? 1; } });
  return child;
}
const emulatorEnv = { ...process.env, SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9198' };
start('firebase', ['emulators:start', '--only', 'auth,firestore,functions,storage', '--project', projectId, '--config', 'firebase.payment-test.json'], { env: emulatorEnv });
let ready = false;
for (let attempt = 0; attempt < 120 && !stopping; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:5101/demo-sfvga-payment-ui/us-central1/auth_getAdminAccess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}' });
    if (response.status === 401) { ready = true; break; }
  } catch { /* emulator is starting */ }
  await setTimeout(1000);
}
if (!ready) { stop(); throw new Error('Payment emulators did not become ready. Check Java and port availability.'); }
const seed = spawnSync(process.execPath, ['scripts/seed-payment-test.mjs'], { cwd: root, env: emulatorEnv, stdio: 'inherit' });
if (seed.status !== 0) { stop(); process.exitCode = 1; }
else {
  const env = { ...process.env, NEXT_PUBLIC_MEMBER_WEB_ORIGIN: 'http://localhost:8082', EXPO_PUBLIC_ADMIN_WEB_URL: 'http://localhost:3002',
    EXPO_PUBLIC_PAYMENT_TEST_MODE: 'true', NEXT_PUBLIC_PAYMENT_TEST_MODE: 'true',
    EXPO_PUBLIC_EMULATOR_HOST: '127.0.0.1', NEXT_PUBLIC_EMULATOR_HOST: '127.0.0.1' };
  for (const prefix of ['EXPO_PUBLIC', 'NEXT_PUBLIC']) {
    Object.assign(env, { [`${prefix}_FIREBASE_PROJECT_ID`]: projectId, [`${prefix}_FIREBASE_API_KEY`]: 'demo-payment-api-key',
      [`${prefix}_FIREBASE_AUTH_DOMAIN`]: `${projectId}.firebaseapp.com`, [`${prefix}_FIREBASE_STORAGE_BUCKET`]: `${projectId}.appspot.com`,
      [`${prefix}_FIREBASE_APP_ID`]: '1:123456789:web:payment-test', [`${prefix}_FIREBASE_MESSAGING_SENDER_ID`]: '123456789' });
  }
  start(process.execPath, [join(root, 'apps/admin-web/node_modules/next/dist/bin/next'), 'dev', '--port', '3002'], { cwd: join(root, 'apps/admin-web'), env });
  start(process.execPath, [join(root, 'apps/mobile/node_modules/expo/bin/cli'), 'start', '--web', '--offline', '--port', '8082'], { cwd: join(root, 'apps/mobile'), env });
  console.log('\nPAYMENT TEST APP: http://localhost:8082\nChoose “Use test member” or “Use test organizer”. No production data or real payments.\n');
}
