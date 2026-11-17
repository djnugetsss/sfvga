import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, connectAuthEmulator, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// getReactNativePersistence ships in the React Native bundle but is omitted from the
// web-focused type definitions, so we read it off the module with a precise cast.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
export const paymentTestMode = process.env.EXPO_PUBLIC_PAYMENT_TEST_MODE === 'true';
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  // Omit when Analytics is not enabled — your Firebase web config had no measurementId.
  ...(measurementId ? { measurementId } : {}),
};

const requiredFirebaseEnv = {
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
};

function assertFirebaseConfig(): void {
  if (paymentTestMode && !firebaseConfig.projectId?.startsWith('demo-')) {
    throw new Error('Payment test mode requires an isolated demo-* Firebase project.');
  }
  const missing = Object.entries(requiredFirebaseEnv)
    .filter(([, value]) => !value || value.startsWith('REPLACE_WITH_'))
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Set ${missing.join(', ')} in apps/mobile/.env.local and restart Expo.`,
    );
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    assertFirebaseConfig();
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (Platform.OS === 'web') {
      auth = getAuth(firebaseApp);
    } else {
      try {
        // Persist the auth session across app restarts via AsyncStorage (Firebase JS SDK
        // RN persistence). Without this, sessions default to in-memory and are lost on close.
        auth = initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        // initializeAuth throws if already initialized (e.g. Fast Refresh) — fall back.
        auth = getAuth(firebaseApp);
      }
    }
    if (paymentTestMode) connectAuthEmulator(auth, `http://${emulatorHost}:9198`, { disableWarnings: true });
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (paymentTestMode) connectFirestoreEmulator(db, emulatorHost, 8180);
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (paymentTestMode) connectStorageEmulator(storage, emulatorHost, 9298);
  }
  return storage;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
    if (paymentTestMode) connectFunctionsEmulator(functions, emulatorHost, 5101);
  }
  return functions;
}
