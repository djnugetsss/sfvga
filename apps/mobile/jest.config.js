module.exports = {
  preset: 'jest-expo',
  // pnpm stores package sources under node_modules/.pnpm before linking them into
  // node_modules. Allow Jest to traverse that store, then transform the same Expo/
  // React Native packages recommended by the jest-expo preset.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sfvga/.*)',
  ],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
