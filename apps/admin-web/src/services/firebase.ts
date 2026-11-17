import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const paymentTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true';
const emulatorHost = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
const connected = new WeakSet<object>();
function connectOnce<T extends object>(service: T, connect: () => void): T {
  if (paymentTestMode && !connected.has(service)) { connect(); connected.add(service); }
  return service;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
};

function assertFirebaseConfig(): void {
  if (paymentTestMode && !firebaseConfig.projectId?.startsWith('demo-')) throw new Error('Payment test mode requires an isolated demo-* project.');
  const missing = Object.entries(requiredFirebaseEnv)
    .filter(([, value]) => !value || value.startsWith('REPLACE_WITH_'))
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Set ${missing.join(', ')} in apps/admin-web/.env.local and restart Next.js.`,
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertFirebaseConfig();
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  return connectOnce(auth, () => connectAuthEmulator(auth, `http://${emulatorHost}:9198`, { disableWarnings: true }));
}

export function getFirestoreDb(): Firestore {
  const db = getFirestore(getFirebaseApp());
  return connectOnce(db, () => connectFirestoreEmulator(db, emulatorHost, 8180));
}

export function getFirebaseFunctions(): Functions {
  const functions = getFunctions(getFirebaseApp());
  return connectOnce(functions, () => connectFunctionsEmulator(functions, emulatorHost, 5101));
}

export function getFirebaseStorage(): FirebaseStorage {
  const storage = getStorage(getFirebaseApp());
  return connectOnce(storage, () => connectStorageEmulator(storage, emulatorHost, 9298));
}
