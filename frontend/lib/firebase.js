"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Firebase Web SDK (client-only). Safe to import from Client Components.
 * Add NEXT_PUBLIC_FIREBASE_* to .env.local / Vercel.
 *
 * Primary data/auth remains PostgreSQL + JWT API; use Firebase for Auth,
 * Storage (listing images), or Firestore features as you wire them.
 */

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
}

function isConfigComplete(config) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId
  );
}

let appSingleton;

/**
 * @returns {import("firebase/app").FirebaseApp | null}
 */
export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  const config = getFirebaseConfig();
  if (!isConfigComplete(config)) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(
        "[firebase] Missing NEXT_PUBLIC_FIREBASE_* env vars. Add them from Firebase Console → Project settings."
      );
    }
    return null;
  }
  if (!appSingleton) {
    appSingleton = getApps().length ? getApp() : initializeApp(config);
  }
  return appSingleton;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseStorage() {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}
