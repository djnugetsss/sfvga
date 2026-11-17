#!/usr/bin/env node
/**
 * Build a self-contained Firebase Functions source directory.
 *
 * Google Cloud installs Functions dependencies with npm, which does not
 * understand pnpm's workspace:* protocol. The repository keeps its normal
 * workspace architecture while this script converts only the deploy artifact
 * to local file dependencies.
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'functions');
const deployDir = join(root, 'functions-deploy');
const workspacePackages = ['shared-types', 'shared-validation', 'qr-crypto'];
const tscPath = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const prepareResult = spawnSync(
  process.execPath,
  [join(root, 'scripts', 'prepare-functions-deps.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

if (prepareResult.status !== 0) {
  process.exit(prepareResult.status ?? 1);
}

const result = spawnSync(process.execPath, [tscPath, '-p', join(functionsDir, 'tsconfig.json')], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(join(deployDir, 'vendor'), { recursive: true });
writeFileSync(
  join(deployDir, '.gitkeep'),
  '# Generated Firebase Functions deployment files are written here.\n',
);
cpSync(join(functionsDir, 'lib'), join(deployDir, 'lib'), { recursive: true });

// Firebase analyzes exports locally before uploading, so it needs installed
// dependencies here. The deploy configuration ignores node_modules; Cloud
// Build installs the clean manifest below instead.
symlinkSync(join(functionsDir, 'node_modules'), join(deployDir, 'node_modules'), 'junction');

const functionsPackage = JSON.parse(readFileSync(join(functionsDir, 'package.json'), 'utf8'));
const deployPackage = {
  name: functionsPackage.name,
  version: functionsPackage.version,
  private: true,
  main: 'lib/index.js',
  engines: functionsPackage.engines,
  dependencies: { ...functionsPackage.dependencies },
};

for (const name of workspacePackages) {
  deployPackage.dependencies[`@sfvga/${name}`] = `file:vendor/${name}`;

  const packageDir = join(root, 'packages', name);
  const vendorDir = join(deployDir, 'vendor', name);
  const sourcePackage = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const dependencies = { ...(sourcePackage.dependencies ?? {}) };

  // All workspace packages are installed at the deploy root. Removing nested
  // workspace links prevents npm from attempting to resolve workspace:*.
  for (const dependencyName of Object.keys(dependencies)) {
    if (dependencyName.startsWith('@sfvga/')) {
      delete dependencies[dependencyName];
    }
  }

  mkdirSync(vendorDir, { recursive: true });
  writeFileSync(
    join(vendorDir, 'package.json'),
    `${JSON.stringify(
      {
        name: sourcePackage.name,
        version: sourcePackage.version,
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        dependencies,
      },
      null,
      2,
    )}\n`,
  );
  cpSync(join(packageDir, 'dist'), join(vendorDir, 'dist'), { recursive: true });
}

writeFileSync(join(deployDir, 'package.json'), `${JSON.stringify(deployPackage, null, 2)}\n`);
console.log('Firebase Functions deploy artifact is ready.');
