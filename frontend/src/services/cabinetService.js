// frontend/src/services/cabinetService.js
// SCRUM-75 — Frontend: Wire Ingredient Cabinet screen to backend API
// Assigned to: Allisa Warren
//
// Exposes three clean async functions consumed by CabinetScreen.js:
//   getCabinet()            → GET  /api/cabinet
//   addIngredient(data)     → POST /api/cabinet
//   removeIngredient(id)    → DELETE /api/cabinet/:id
//
// Auth: retrieves Firebase ID token and attaches as Bearer header.
// Follows the same pattern as recommendationsService.js (SCRUM-74).

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * Retrieve the current user's Firebase ID token.
 * Returns null if no user is signed in (guest mode).
 */
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
 * GET /api/cabinet
 * Returns the authenticated user's full ingredient list.
 * Response: Array of { id, name, category, quantity, unit, dateAdded }
 */
export async function getCabinet() {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch(`${BASE_URL}/api/cabinet`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET /api/cabinet returned ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[cabinetService] getCabinet error:', err.message);
    return [];
  }
}

/**
 * POST /api/cabinet
 * Adds a new ingredient to the user's cabinet.
 * @param {Object} ingredient - { name: string, category: string, quantity?: string, unit?: string }
 * Required fields: name, category ('spirit' | 'mixer' | 'garnish')
 * Returns the created ingredient object with its Firestore-generated id.
 */
export async function addIngredient(ingredient) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE_URL}/api/cabinet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ingredient),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `POST /api/cabinet returned ${res.status}`);
  }

  return res.json();
}

/**
 * DELETE /api/cabinet/:id
 * Removes a specific ingredient from the user's cabinet.
 * @param {string} id - Firestore document ID of the ingredient to remove.
 * Returns true on 204 success, throws on 404 or auth failure.
 */
export async function removeIngredient(id) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE_URL}/api/cabinet/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return true;
  if (res.status === 404) throw new Error('Ingredient not found in cabinet');
  throw new Error(`DELETE /api/cabinet/${id} returned ${res.status}`);
}
