import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SFVGA Combined',
  slug: 'sfvga-combined',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icons/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'sfvga-combined',
  splash: {
    backgroundColor: '#F7F5F2',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'org.sfvga.app.merge',
  },
  android: {
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/images/icons/adaptive-icon.png',
      backgroundColor: '#F7F5F2',
    },
    package: 'org.sfvga.app.merge',
  },
  web: {
    bundler: 'metro',
    name: 'SFVGA',
    shortName: 'SFVGA',
    lang: 'en',
    scope: '/',
    themeColor: '#7D3038',
    backgroundColor: '#F7F5F2',
    display: 'standalone',
    startUrl: '/',
    orientation: 'portrait',
  },
  plugins: [
    'expo-font',
    [
      'expo-camera',
      {
        cameraPermission: 'SFVGA needs camera access to scan event tickets.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#E8890C',
      },
    ],
  ],
  extra: {},
});
