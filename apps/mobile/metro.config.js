// Metro configuration.
// `unstable_enablePackageExports = false` and the `.cjs` source extension are required
// for the Firebase JS SDK (v11) to resolve correctly under Expo SDK 52 — otherwise the
// auth/firestore components fail to register at runtime. See Expo's Firebase JS setup guide.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
