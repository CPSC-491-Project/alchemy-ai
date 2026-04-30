// frontend/src/services/vibeSearchService.js
// SCRUM-210 — searchByVibe: POST /api/vibe-search (Gemini-powered, public)
//
// One-shot natural-language cocktail discovery. Caller supplies a vibe
// string ("refreshing for a hot day", "fancy date night") and gets back
// 6–12 ranked drinks from the catalog, each with a one-line rationale.
//
// Error semantics mirror recommendFromIngredients (sibling service):
// THROWS on failure with a `kind` tag the UI uses to decide whether to
// offer a Retry button (network/serverError = retryable; badRequest =
// not retryable; notReady = retry-after-a-moment).

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * SCRUM-210 — Vibe Search → ranked drink picks with rationales.
 *
 * Each item in the returned array has shape:
 *   { id, name, thumbnail, category, alcoholic, glass, ingredientCount, rationale }
 *
 * @param {string} vibe   - User's natural-language vibe / mood / occasion.
 * @param {number} [limit=6] - Max number of results (server caps to 12).
 * @returns {Promise<Array>}
 * @throws  {Error}        - On invalid input, network failure, non-2xx.
 */
export async function searchByVibe(vibe, limit = 6) {
  if (!BACKEND_URL) {
    throw new Error(
      'Backend URL is not configured. Set EXPO_PUBLIC_BACKEND_URL in your .env file.'
    );
  }

  if (typeof vibe !== 'string' || vibe.trim().length === 0) {
    const e = new Error('Tell us a vibe to search for.');
    e.kind = 'client';
    throw e;
  }

  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/vibe-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe: vibe.trim(), limit }),
    });
  } catch (err) {
    const e = new Error(
      `Could not reach the backend. Check your WiFi and EXPO_PUBLIC_BACKEND_URL. (${err.message})`
    );
    e.kind = 'network';
    throw e;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    if (res.status === 503) {
      // Catalog not ready (boot race). Encourage retry-in-a-moment.
      const e = new Error(body.error || 'The cocktail catalog is warming up. Please try again in a moment.');
      e.kind = 'notReady';
      e.status = 503;
      throw e;
    }
    if (res.status >= 400 && res.status < 500) {
      // 4xx = bad input. Surface backend message; not retryable as-is.
      const e = new Error(body.error || 'That vibe could not be processed.');
      e.kind = 'badRequest';
      e.status = res.status;
      throw e;
    }
    // 5xx = server / upstream (Gemini) problem. Retryable.
    const e = new Error(
      body.error || `Vibe search failed (HTTP ${res.status}). Please try again.`
    );
    e.kind = 'serverError';
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  // Backend returns { results: [...] }. Be defensive in case the shape
  // ever changes — accept a wrapped or raw array.
  return Array.isArray(data) ? data : data.results ?? [];
}
