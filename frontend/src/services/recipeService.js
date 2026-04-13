// frontend/src/services/recipeService.js
// SCRUM-132 — Frontend: Wire RecipeDetailScreen to GET /api/recipes/:id
// SCRUM-133 — Frontend: Add substitution section — wire to GET /api/recipes/:id/substitutions
// Assigned to: Allisa Warren
//
// NOTE: These calls depend on Ethan's backend PRs (SCRUM-116, SCRUM-117) merging to develop.
//       Both are currently In Review, blocked on SCRUM-121 critical fixes.
//       This service layer is ready — it will activate the moment those PRs merge.
//
// Follows the same auth token pattern as recommendationsService.js (SCRUM-74)
// and cabinetService.js (SCRUM-75).

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * GET /api/recipes/:id
 * Fetches full cocktail detail for a given CocktailDB drinkId.
 * Returns the full normalized cocktail object:
 *   { idDrink, strDrink, strInstructions, strDrinkThumb,
 *     ingredients: [{ name, measure }], strCategory, strAlcoholic }
 *
 * @param {string} drinkId - CocktailDB drinkId (e.g. "11007")
 * @returns {Object|null} cocktail detail, or null on failure
 */
export async function getRecipeById(drinkId) {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/recipes/${drinkId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /api/recipes/${drinkId} returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[recipeService] getRecipeById error:', err.message);
    return null;
  }
}

/**
 * GET /api/recipes/:id/substitutions
 * Cross-references a recipe's ingredient list against the user's cabinet
 * and returns substitution options for any missing ingredients.
 *
 * Response shape:
 *   [
 *     {
 *       ingredient: string,      // the missing ingredient name
 *       substitutes: string[],   // at least one alternative
 *     },
 *     ...
 *   ]
 *
 * Returns an empty array if all ingredients are in the cabinet,
 * or on auth failure / network error.
 *
 * @param {string} drinkId - CocktailDB drinkId
 * @returns {Array} array of { ingredient, substitutes } objects
 */
export async function getSubstitutions(drinkId) {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch(`${BASE_URL}/api/recipes/${drinkId}/substitutions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET /api/recipes/${drinkId}/substitutions returned ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[recipeService] getSubstitutions error:', err.message);
    return [];
  }
}
