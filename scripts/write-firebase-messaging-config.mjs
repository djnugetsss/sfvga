import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  throw new Error(`Web push configuration needs EXPO_PUBLIC_FIREBASE_${missing.join(', EXPO_PUBLIC_FIREBASE_')}`);
}

const output = resolve(fileURLToPath(new URL('..', import.meta.url)), 'apps/mobile/public/firebase-messaging-config.js');
writeFileSync(output, `self.SFVGA_FIREBASE_CONFIG = ${JSON.stringify(config)};\n`);
console.log('Generated public web push configuration from environment variables.');
