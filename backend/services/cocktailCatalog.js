// SCRUM-209 (extended): in-memory cocktail catalog.
//
// On startup we fetch every drink CocktailDB exposes through its free-tier
// search.php?f=<letter> endpoint and store the result in a Map keyed by
// drinkId. The recommendation engine then scores against this catalog
// directly — no per-request CocktailDB calls, no rate-limit risk, no
// candidate-pool tuning.
//
// Why this exists:
//   The previous filter.php → lookup.php pipeline issued ~150 parallel
//   lookup.php calls for single-ingredient queries. CocktailDB's free
//   tier silently throttled most of them by returning HTTP 200 with
//   {drinks: null}, so the engine saw 1–3 valid drinks where it should
//   have seen 100+ ("vodka returns only Belmont"). Fetching the full
//   catalog up-front sidesteps the rate limit entirely and makes
//   recommend() effectively I/O-free at request time.
//
// Refresh strategy:
//   - Boot:     loadCatalog() runs once, awaited before app.listen().
//   - Interval: setInterval kicks off a background refresh every 24h.
//   - Manual:   POST /api/admin/refresh-catalog hits refreshCatalog().
//
// Failure modes:
//   - Boot load fails entirely → server still starts, but catalog stays
//     empty and the recommendation engine throws a 503 (caller retries).
//   - Per-letter search.php failure during a load → that letter's drinks
//     are skipped. We don't retry inline because the most common cause
//     (rate limit / transient 5xx) resolves on its own within minutes,
//     and the next interval refresh will pick them up.
//   - Background refresh fails after a successful initial load → previous
//     catalog stays in place. We log the failure and try again next tick.

const cocktailService = require('./cocktailService');

const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

// Module-level state. Mutated atomically — we build a new Map and swap
// it in only after a successful load, so readers never see a half-built
// catalog.
let catalog = new Map();         // drinkId → normalized drink
let lastRefreshedAt = null;      // ISO string of last successful refresh
let lastRefreshError = null;     // { message, at } of most recent failure
let refreshTimer = null;

// Internal: fetch every drink whose name starts with the given letter.
// search.php?f=<letter> is one of the few CocktailDB endpoints that
// returns FULL drink objects (including all 15 strIngredient slots),
// not the minimal id/name/thumb shape that filter.php returns. That's
// what lets us build a complete, score-able catalog with just 26 calls.
async function fetchByLetter(letter) {
  const response = await fetch(`${BASE_URL}/search.php?f=${letter}`);
  if (!response.ok) {
    throw new Error(`search.php?f=${letter} returned ${response.status}`);
  }
  const data = await response.json();
  return (data.drinks ?? []).map(cocktailService.normalizeDrink).filter(Boolean);
}

// Public: load the full catalog into memory.
//
// Atomic: we accumulate into a fresh Map and only replace the live
// `catalog` reference on success. Per-letter failures are absorbed and
// returned in the result (caller can log them) — they don't fail the
// whole load. Empty result, however, IS treated as a failure: we'd
// rather throw and keep the previous catalog than silently swap to []
// (which would 503 every recommend call).
async function loadCatalog() {
  const built = new Map();
  const errors = [];

  const results = await Promise.allSettled(LETTERS.map(fetchByLetter));
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      errors.push({ letter: LETTERS[i], error: r.reason?.message ?? String(r.reason) });
      return;
    }
    for (const drink of r.value) {
      // Dedupe by id. CocktailDB's per-letter results don't overlap in
      // practice, but defensive — a drink rename could theoretically put
      // the same id under two letters during a CocktailDB-side update.
      if (drink?.id && !built.has(drink.id)) {
        built.set(drink.id, drink);
      }
    }
  });

  if (built.size === 0) {
    const err = new Error('Catalog load failed: no drinks fetched');
    err.errors = errors;
    throw err;
  }

  catalog = built;
  lastRefreshedAt = new Date().toISOString();
  lastRefreshError = null;
  return { count: built.size, errors };
}

// Public: refresh the catalog. Differs from loadCatalog only in error
// handling — refresh() records the failure on `lastRefreshError` so the
// admin status endpoint can surface it, but still rethrows so the caller
// (admin route, interval handler) can decide whether to surface a 5xx
// or just log.
async function refreshCatalog() {
  try {
    return await loadCatalog();
  } catch (err) {
    lastRefreshError = { message: err.message, at: new Date().toISOString() };
    throw err;
  }
}

// Public: snapshot array of all drinks. Returns a fresh array per call
// so callers can't mutate the underlying Map. Cheap (~600 refs).
function getDrinks() {
  return [...catalog.values()];
}

// Public: status payload for the admin endpoint and health checks.
function getStatus() {
  return {
    ready: catalog.size > 0,
    count: catalog.size,
    lastRefreshedAt,
    lastRefreshError,
  };
}

// Public: kick off the background refresh interval. Returns a stop fn
// for graceful shutdown. Idempotent — calling twice replaces the timer
// rather than stacking two of them.
function startRefreshInterval(ms = DEFAULT_REFRESH_INTERVAL_MS) {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    refreshCatalog().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[cocktailCatalog] background refresh failed:', err.message);
    });
  }, ms);
  // .unref() lets the process exit if the timer is the only thing keeping
  // the event loop alive (relevant for tests; harmless in production where
  // express keeps the loop busy).
  if (refreshTimer.unref) refreshTimer.unref();
  return () => {
    clearInterval(refreshTimer);
    refreshTimer = null;
  };
}

module.exports = {
  loadCatalog,
  refreshCatalog,
  getDrinks,
  getStatus,
  startRefreshInterval,
  _internal: {
    DEFAULT_REFRESH_INTERVAL_MS,
    LETTERS,
    // Test-only: reset module state between tests.
    _reset: () => {
      catalog = new Map();
      lastRefreshedAt = null;
      lastRefreshError = null;
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    },
  },
};
