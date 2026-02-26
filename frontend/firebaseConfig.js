import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAX7q_I51UxGDs5cCKjn_oZHW_QSm6k2x0",
  authDomain: "alchemyai-2ff0a.firebaseapp.com",
  projectId: "alchemyai-2ff0a",
  storageBucket: "alchemyai-2ff0a.firebasestorage.app",
  messagingSenderId: "977152295004",
  appId: "1:977152295004:web:80004d2cd5a1dcaab3a699"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);