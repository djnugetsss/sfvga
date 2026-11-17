#!/usr/bin/env node
/**
 * Materialize pnpm workspace packages into functions/node_modules as real directories
 * (not junctions) so `firebase deploy` uploads runnable CommonJS, not TypeScript sources.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'functions');
const packages = ['shared-types', 'shared-validation', 'qr-crypto'];

// TypeScript does not remove JavaScript emitted for deleted source files.
// Always rebuild Functions from a clean output directory so retired endpoints
// (for example, the former payment functions) cannot be deployed accidentally.
rmSync(join(functionsDir, 'lib'), { recursive: true, force: true });

const tscPath = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

function buildTypeScriptProject(cwd) {
  const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.json'], {
    cwd,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const name of packages) {
  buildTypeScriptProject(join(root, 'packages', name));
}

const targetRoot = join(functionsDir, 'node_modules', '@sfvga');
mkdirSync(targetRoot, { recursive: true });

for (const name of packages) {
  const src = join(root, 'packages', name);
  const dest = join(targetRoot, name);
  const dist = join(src, 'dist');
  if (!existsSync(dist)) {
    console.error(`Missing ${dist} — build failed.`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const packageJson = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
  packageJson.main = './dist/index.js';
  packageJson.types = './dist/index.d.ts';
  packageJson.exports = {
    '.': { types: './dist/index.d.ts', require: './dist/index.js', default: './dist/index.js' },
  };
  writeFileSync(join(dest, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  cpSync(dist, join(dest, 'dist'), { recursive: true });
  console.log(`Packed @sfvga/${name} → functions/node_modules/@sfvga/${name}`);
}

console.log('Workspace packages ready for Cloud Functions deploy.');
