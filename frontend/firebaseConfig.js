// SCRUM-44: Firebase client SDK initialization
//
// Auth init is platform-branched:
//   - Native (iOS/Android): initializeAuth() + getReactNativePersistence(AsyncStorage)
//     so the user stays signed in across app restarts without an iOS warning.
//   - Web: getAuth() — the web SDK uses the browser's built-in persistence
//     (IndexedDB) automatically. getReactNativePersistence does not exist
//     on the web SDK build and crashes the bundle if imported unconditionally.

import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "alchemyai-2ff0a.firebaseapp.com",
  projectId: "alchemyai-2ff0a",
  storageBucket: "alchemyai-2ff0a.firebasestorage.app",
  messagingSenderId: "977152295004",
  appId: "1:977152295004:web:80004d2cd5a1dcaab3a699"
};

const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(app);
export const storage = getStorage(app);
