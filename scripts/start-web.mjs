import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expoCli = join(repositoryRoot, 'apps', 'mobile', 'node_modules', 'expo', 'bin', 'cli');
const nextCli = join(repositoryRoot, 'apps', 'admin-web', 'node_modules', 'next', 'dist', 'bin', 'next');

for (const [name, cli] of [['Expo', expoCli], ['Next.js', nextCli]]) {
  if (!existsSync(cli)) {
    console.error(`${name} is not installed. Run pnpm install from the repository root first.`);
    process.exit(1);
  }
}

const clearMetroCache = process.argv.includes('--clear');
const children = [];
let shuttingDown = false;

function start(name, cli, args, cwd) {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`${name} stopped${signal ? ` (${signal})` : ` with code ${code ?? 0}`}.`);
    for (const runningChild of children) {
      if (runningChild !== child && !runningChild.killed) runningChild.kill();
    }
    process.exitCode = code ?? 1;
  });
}

function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
process.on('exit', stopAll);

console.log('Starting the SFVGA member app at http://localhost:8081');
console.log('Starting the embedded admin dashboard at http://localhost:3000');

start('Admin dashboard', nextCli, ['dev', '--port', '3000'], join(repositoryRoot, 'apps', 'admin-web'));
start(
  'Member app',
  expoCli,
  ['start', '--web', '--offline', '--port', '8081', ...(clearMetroCache ? ['--clear'] : [])],
  join(repositoryRoot, 'apps', 'mobile'),
);
