// SCRUM-44: Firestore user profile creation on login
// SCRUM-131: Fixed — now calls GET /api/me (backend) instead of writing
//            directly to Firestore. Backend owns profile creation on first login.
//            Removed cabinet:[] array field — cabinet lives in Firestore subcollection
//            per SCRUM-70 schema (users/{uid}/cabinet/{ingredientId}).

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!API_BASE_URL) {
  console.error(
    '[userService] EXPO_PUBLIC_BACKEND_URL is not set. ' +
      'Copy frontend/.env.example to frontend/.env and fill in the value.'
  );
}

/**
 * Fetches the authenticated user's profile from the backend (GET /api/me).
 *
 * On first login the backend returns a structured default profile rather
 * than a 404, so the frontend never needs to handle a missing-document case.
 * Profile document creation is fully owned by the backend (profile.js /
 * SCRUM-52) — this service never writes to Firestore directly.
 *
 * @param {string} idToken  Firebase ID token from userCredential.user.getIdToken()
 * @returns {Promise<object>} Profile object: { uid, email, displayName, preferences }
 * @throws  Will throw if the network request fails or the backend returns non-2xx.
 */
export async function fetchUserProfile(idToken) {
  if (!idToken) {
    throw new Error('[userService] fetchUserProfile called without an idToken.');
  }

  const response = await fetch(`${API_BASE_URL}/api/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `[userService] GET /api/me failed — ${response.status}: ${errorText}`
    );
  }

  const profile = await response.json();
  return profile;
}

/**
 * Updates the authenticated user's preferences via PUT /api/me/preferences.
 *
 * Accepts a partial preferences object — the backend merges it into the
 * existing Firestore document so unrelated fields are never overwritten.
 *
 * @param {string} idToken      Firebase ID token
 * @param {object} preferences  Partial preferences payload (spirit types, likes, dislikes, dietary flags)
 * @returns {Promise<object>}   Full updated profile object returned by the backend
 * @throws  Will throw if the network request fails or the backend returns non-2xx.
 */
export async function updateUserPreferences(idToken, preferences) {
  if (!idToken) {
    throw new Error('[userService] updateUserPreferences called without an idToken.');
  }

  const response = await fetch(`${API_BASE_URL}/api/me/preferences`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `[userService] PUT /api/me/preferences failed — ${response.status}: ${errorText}`
    );
  }

  const updatedProfile = await response.json();
  return updatedProfile;
}
