// frontend/src/services/favoritesService.js
// SCRUM-217 — Favorites Persistence & Sync
//
// Mirrors cabinetService.js auth pattern:
//   getFavorites()                  → GET    /api/favorites
//   addFavorite(cocktailId, data)   → POST   /api/favorites
//   removeFavorite(cocktailId)      → DELETE /api/favorites/:cocktailId

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.error('[favoritesService] getAuthToken error:', err.message);
    return null;
  }
}

/**
 * GET /api/favorites
 * Returns the authenticated user's saved favorites.
 * Returns [] on auth failure or any network/API error.
 */
export async function getFavorites() {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const res = await fetch(`${BASE_URL}/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[favoritesService] getFavorites error:', err.message);
    return [];
  }
}

/**
 * POST /api/favorites
 * Saves a cocktail to the user's favorites.
 * @param {string} cocktailId  - The cocktail's canonical ID.
 * @param {Object} cocktailData - Additional cocktail fields to persist.
 */
export async function addFavorite(cocktailId, cocktailData) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE_URL}/api/favorites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cocktailId, ...cocktailData }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to add favorite: ${body.error || res.status}`);
  }
  return res.json();
}

/**
 * DELETE /api/favorites/:cocktailId
 * Removes a cocktail from the user's favorites.
 * @param {string} cocktailId - The cocktail's canonical ID.
 */
export async function removeFavorite(cocktailId) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE_URL}/api/favorites/${cocktailId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return true;
  if (res.status === 404) throw new Error('Favorite not found');

  const body = await res.json().catch(() => ({}));
  throw new Error(`Failed to remove favorite: ${body.error || res.status}`);
}
