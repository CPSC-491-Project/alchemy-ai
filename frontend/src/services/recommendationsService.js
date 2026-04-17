// frontend/src/services/recommendationsService.js
// SCRUM-74 — Wire HomeScreen carousel to GET /api/recommendations

import { getAuth } from 'firebase/auth';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * Fetches personalized cocktail recommendations for the authenticated user.
 * Calls GET /api/recommendations (SCRUM-115).
 *
 * Returns an array of cocktail objects, each with:
 *   { id, name, thumbnail, matchPercentage, missingIngredients, category, alcoholic }
 *
 * Falls back to an empty array if the backend is unreachable (SCRUM-115 not yet merged).
 */
export async function fetchRecommendations() {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[recommendationsService] No authenticated user — skipping fetch.');
      return [];
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`${BACKEND_URL}/api/recommendations`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[recommendationsService] ${response.status} from /api/recommendations`);
      return [];
    }

    const data = await response.json();

    // Normalize to a safe array regardless of backend shape
    return Array.isArray(data) ? data : data.recommendations ?? [];
  } catch (error) {
    console.error('[recommendationsService] Fetch failed — using empty fallback.', error.message);
    return [];
  }
}
