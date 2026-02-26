import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export async function createOrUpdateUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // First time login — create profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      preferences: {
        tasteProfile: [],
        dislikedIngredients: [],
        privacySettings: { profileVisible: true },
      },
      cabinet: [],
      savedDrinks: [],
      drinkHistory: [],
    });
  } else {
    // Returning user — update last login
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
  }
}
