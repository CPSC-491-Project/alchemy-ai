// frontend/src/services/cabinetService.js
// SCRUM-75 — Frontend: Wire Ingredient Cabinet screen to backend API
// SCRUM-147 — Frontend: Integrate Ingredient Cabinet with Backend API
// Assigned to: Mohamed Alqubaisi
//
// Exposes three clean async functions consumed by CabinetScreen.js:
//   getCabinet()            → GET    /api/cabinet
//   addIngredient(data)     → POST   /api/cabinet
//   removeIngredient(id)    → DELETE /api/cabinet/:id
//
// Auth: retrieves Firebase ID token and attaches as Bearer header.
// Follows the same pattern as recommendationsService.js (SCRUM-74).

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Validate BASE_URL at module load time so misconfiguration is caught immediately
if (!BASE_URL) {
  console.error(
    '[cabinetService] Missing EXPO_PUBLIC_BACKEND_URL — ' +
    'ensure this variable is set in your .env file before running the app.'
  );
}

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
  } catch (err) {
    console.error('[cabinetService] getAuthToken error:', err.message);
    return null;
  }
}

/**
 * GET /api/cabinet
 * Returns the authenticated user's full ingredient list.
 * Response: Array of { id, name, category, quantity, unit, dateAdded }
 *
 * Returns [] on auth failure, missing BASE_URL, or any network/API error
 * so CabinetScreen never enters a hard error state on load.
 */
export async function getCabinet() {
  if (!BASE_URL) {
    console.error('[cabinetService] getCabinet: BASE_URL is not configured.');
    return [];
  }

  const token = await getAuthToken();
  if (!token) return [];

  console.log('[cabinetService] Fetching cabinet');

  try {
    const res = await fetch(`${BASE_URL}/api/cabinet`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        `GET /api/cabinet failed with status ${res.status}` +
        (body.error ? `: ${body.error}` : '')
      );
    }

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
  if (!BASE_URL) {
    console.error('[cabinetService] addIngredient: BASE_URL is not configured.');
    throw new Error(
      '[cabinetService] Cannot add ingredient: EXPO_PUBLIC_BACKEND_URL is not set.'
    );
  }

  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  console.log('[cabinetService] Adding ingredient', ingredient);

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
    throw new Error(
      `Failed to add ingredient: ${body.error || res.status}`
    );
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
  if (!BASE_URL) {
    console.error('[cabinetService] removeIngredient: BASE_URL is not configured.');
    throw new Error(
      '[cabinetService] Cannot remove ingredient: EXPO_PUBLIC_BACKEND_URL is not set.'
    );
  }

  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  console.log('[cabinetService] Removing ingredient', id);

  const res = await fetch(`${BASE_URL}/api/cabinet/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return true;
  if (res.status === 404) throw new Error('Ingredient not found in cabinet');

  const body = await res.json().catch(() => ({}));
  throw new Error(
    `Failed to remove ingredient: ${body.error || res.status}`
  );
}