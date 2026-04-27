// frontend/src/services/scanService.js
// SCRUM-188 — Frontend service for image-based ingredient scanning.
//
// Exposes one async function consumed by ScanScreen.js:
//   scanImage(base64) → { rawOcrText, candidates, mode }
//
// Auth: attaches Firebase ID token as Bearer header IF a user is signed in.
// Scan is available to guests — backend treats /api/scan as a public route
// (SCRUM-196). Token is still passed when available so future server-side
// logic (rate limits per user, scan history) has the option to use it.
//
// Network considerations:
//   - POST body can be several megabytes (base64 JPEG). Backend accepts
//     up to 15mb (SCRUM-187). Anything larger and we get a 413.
//   - Phone → laptop over WiFi can be flaky. We surface errors with
//     enough detail for the user to understand "try again" vs.
//     "the backend is unreachable".

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[scanService] Missing EXPO_PUBLIC_BACKEND_URL — ' +
      'set it in your .env file to your backend URL (e.g. http://192.168.x.x:5000).'
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
    // eslint-disable-next-line no-console
    console.error('[scanService] getAuthToken error:', err.message);
    return null;
  }
}

/**
 * POST /api/scan
 *
 * @param {string} imageBase64 - Raw base64 string (no data: URI prefix).
 * @returns {Promise<{ rawOcrText: string, candidates: Array, mode: string }>}
 *
 * Throws a descriptive Error on any failure so ScanScreen can transition
 * to its error state with a meaningful message. The string contents of
 * .message are surfaced to the user — keep them human-readable.
 */
export async function scanImage(imageBase64) {
  if (!BASE_URL) {
    throw new Error(
      'Backend URL is not configured. Set EXPO_PUBLIC_BACKEND_URL in your .env file.'
    );
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('No image provided.');
  }

  const token = await getAuthToken();

  // eslint-disable-next-line no-console
  console.log('[scanService] Scanning image', {
    bytes: imageBase64.length,
    authed: Boolean(token),
  });

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ imageBase64 }),
    });
  } catch (err) {
    // Network / DNS / timeout. Most common cause on physical phone:
    // BASE_URL is localhost or a stale LAN IP.
    throw new Error(
      `Could not reach the backend. Check your WiFi and EXPO_PUBLIC_BACKEND_URL. (${err.message})`
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      throw new Error('Your session expired. Please sign in again.');
    }
    if (res.status === 400) {
      throw new Error(body.error || 'That image could not be processed.');
    }
    if (res.status === 413) {
      throw new Error('That photo is too large. Please try a smaller image.');
    }
    throw new Error(
      body.error || `Scan failed (HTTP ${res.status}). Please try again.`
    );
  }

  const data = await res.json();
  return {
    rawOcrText: data.rawOcrText || '',
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    mode: data.mode || 'unknown',
  };
}

// ── Cabinet category mapping ──────────────────────────────────────────────
//
// The /api/cabinet endpoint accepts only three categories:
//   'spirit' | 'mixer' | 'garnish'
//
// SCRUM-186 vocabulary uses 10 finer-grained categories. This map collapses
// them down for the cabinet write. Users can edit the category afterward in
// the Cabinet UI if they disagree with our default.
const CABINET_CATEGORY_MAP = {
  spirit: 'spirit',
  liqueur: 'spirit',     // alcoholic
  wine_beer: 'spirit',   // alcoholic
  mixer: 'mixer',
  juice: 'mixer',
  syrup: 'mixer',
  bitters: 'mixer',
  dairy: 'mixer',
  fruit: 'garnish',
  other: 'mixer',        // default — most "other" items in our vocab are mixers
};

function toCabinetCategory(scanCategory) {
  return CABINET_CATEGORY_MAP[scanCategory] || 'mixer';
}

/**
 * Batch-add a list of confirmed scan candidates to the user's Cabinet.
 *
 * Loops over the existing single-add helper instead of doing a bulk POST so we
 * benefit from the existing error handling, auth, and BASE_URL guard. Per-item
 * failures don't abort the batch — the caller gets an aggregate result they
 * can render in the Done state.
 *
 * @param {Array<{name: string, category?: string|null}>} candidates
 * @returns {Promise<{ added: Array, failed: Array<{name, error}> }>}
 */
export async function addConfirmedIngredients(candidates) {
  // Lazy import to avoid a circular dep at module load time. cabinetService
  // and scanService are sibling modules; they don't import each other except
  // through this one function.
  // eslint-disable-next-line global-require
  const { addIngredient } = require('./cabinetService');

  const added = [];
  const failed = [];

  for (const c of candidates) {
    try {
      const created = await addIngredient({
        name: c.name,
        category: toCabinetCategory(c.category),
      });
      added.push(created);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[scanService] addIngredient failed for', c.name, err.message);
      failed.push({ name: c.name, error: err.message });
    }
  }

  return { added, failed };
}
