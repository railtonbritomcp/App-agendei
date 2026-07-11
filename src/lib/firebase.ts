import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-domain.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id-12345',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-bucket.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:123456'
};

// Ensure all config values are present
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.warn(`Missing Firebase configuration: ${key}. Ensure VITE_FIREBASE_${key.toUpperCase()} is set.`);
  }
});

const app = initializeApp(firebaseConfig);

// Enable robust offline persistence so writes queue up and sync automatically
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
