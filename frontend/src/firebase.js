import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasEnv = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = hasEnv ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
let db = null;
if (app) {
  const useLongPolling = String(import.meta.env.VITE_FIRESTORE_LONG_POLLING || 'false').toLowerCase() === 'true';
  const useStreams = String(import.meta.env.VITE_FIRESTORE_USE_FETCH_STREAMS || 'false').toLowerCase() === 'true';
  db = (useLongPolling || useStreams)
    ? initializeFirestore(app, { experimentalForceLongPolling: useLongPolling, useFetchStreams: useStreams })
    : getFirestore(app);
}

export { app, auth, db };
export { firebaseConfig };
