// frontend/src/services/recommendationsService.js
// SCRUM-74  — fetchRecommendations:        GET  /api/recommendations  (Cabinet-driven, auth required)
// SCRUM-200 — recommendFromIngredients:   POST /api/recommendations  (Mixer Space, public)
//
// The two functions intentionally have different error semantics:
//   - fetchRecommendations() is a passive carousel populator on HomeScreen.
//     A backend hiccup should not break the screen; it falls back to [] and
//     logs a warning.
//   - recommendFromIngredients() is driven by an explicit user action (the
//     "Recommend Me Drinks" button on the Create screen). The user wants to
//     know if it failed so they can retry or fix their input — this one
//     THROWS with descriptive messages the UI can surface.

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

/**
 * SCRUM-200 — Mixer Space → ranked drink recommendations.
 *
 * POSTs the user's selected ingredients (1..8) to /api/recommendations
 * and returns the ranked recommendation array.
 *
 * Each item in the returned array has shape:
 *   { id, name, thumbnail, category, alcoholic,
 *     matchPercentage, matchedCount, ingredientCount, missingIngredients }
 *
 * Unlike fetchRecommendations(), this function THROWS on failure so the
 * Create screen can show an Alert / retry CTA. The thrown Error.message
 * is meant to be human-readable and surfaced to the user directly.
 *
 * @param {string[]} ingredients - Ingredient names from the Mixer Space.
 * @param {number}   [limit=6]   - Max number of recommendations to return.
 * @returns {Promise<Array>}     - Ranked recommendations (possibly empty).
 * @throws  {Error}              - On invalid input, network failure, or non-2xx response.
 */
export async function recommendFromIngredients(ingredients, limit = 6) {
  if (!BACKEND_URL) {
    throw new Error(
      'Backend URL is not configured. Set EXPO_PUBLIC_BACKEND_URL in your .env file.'
    );
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    const e = new Error('At least one ingredient is required.');
    e.kind = 'client';
    throw e;
  }

  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, limit }),
    });
  } catch (err) {
    // SCRUM-202: tag network failures so the UI can offer a retry path
    // instead of treating them like a fatal/no-retry error.
    const e = new Error(
      `Could not reach the backend. Check your WiFi and EXPO_PUBLIC_BACKEND_URL. (${err.message})`
    );
    e.kind = 'network';
    throw e;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status >= 400 && res.status < 500) {
      // SCRUM-202: 4xx is a client problem (bad input). Forward the backend's
      // error message so the user can see what's wrong (e.g. "ingredients must
      // contain at most 8 items"). Tag as 'badRequest' so UI does not offer
      // a retry button — retrying with the same input will fail the same way.
      const e = new Error(body.error || 'Those ingredients could not be processed.');
      e.kind = 'badRequest';
      e.status = res.status;
      throw e;
    }
    // SCRUM-202: 5xx is a server problem. Backend message is usually too
    // technical for end users (e.g. "Failed to generate recommendations"),
    // so the UI substitutes a generic copy. Tag as 'serverError' so UI
    // offers a retry button — the same request might succeed on a transient
    // CocktailDB hiccup.
    const e = new Error(
      body.error || `Recommendations failed (HTTP ${res.status}). Please try again.`
    );
    e.kind = 'serverError';
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  // Backend returns { recommendations: [...] }. Be defensive in case the
  // shape ever changes — accept either a raw array or a wrapped one.
  return Array.isArray(data) ? data : data.recommendations ?? [];
}
