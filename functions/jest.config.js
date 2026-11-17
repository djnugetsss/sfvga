/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Resolve workspace packages from source so CI `pnpm --filter @sfvga/functions test`
  // works without a prior dist build.
  moduleNameMapper: {
    '^@sfvga/shared-validation$': '<rootDir>/../packages/shared-validation/src/index.ts',
    '^@sfvga/qr-crypto$': '<rootDir>/../packages/qr-crypto/src/index.ts',
    '^@sfvga/shared-types$': '<rootDir>/../packages/shared-types/src/index.ts',
  },
  // TODO: Phase 1 — point tests at the Firebase Emulator Suite (auth/firestore/functions)
  // per project structure §7 (run against a real local emulator, not mocked Firestore).
};
