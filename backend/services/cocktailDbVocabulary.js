// SCRUM-186: CocktailDB ingredient vocabulary service.
//
// Maintains the authoritative list of ingredient names used by the matcher.
// Prefers the full CocktailDB list (`list.php?i=list`, ~500 entries),
// cached in Firestore with a 24h TTL. Falls back to the static ~180-item
// vocabulary when the cache is stale and the network is unreachable.
//
// Usage:
//
//   const { getVocabulary } = require('./cocktailDbVocabulary');
//   const vocab = await getVocabulary();      // returns string[]
//   const candidates = matchIngredients(ocrText, vocab);
//
// Design notes:
//   - The matcher accepts the vocabulary as a parameter. This service
//     just produces a string[] — it does NOT wrap or call the matcher.
//     That separation keeps the matcher a pure function.
//   - Firestore writes are best-effort. If caching fails, we still
//     return the fresh list so callers don't stall.
//   - In-process memoization avoids re-hitting Firestore on every call.

const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FIRESTORE_DOC = 'config/cocktailDbVocabulary';

const { INGREDIENTS: STATIC_VOCAB } = require('../data/ingredientVocabulary');

// In-process cache. Reset on server restart, which is fine — Firestore
// still has the 24h cache behind it.
let memo = { vocab: null, fetchedAt: 0 };

function isFresh(ts) {
  return ts && Date.now() - ts < CACHE_TTL_MS;
}

// Lazy-require firebase-admin so that environments without Firebase
// credentials (unit tests, local dev without GCP) can still import this
// module without throwing. Mirrors the pattern used by visionService
// (SCRUM-187, upcoming).
function getFirestore() {
  try {
    const admin = require('../firebase-admin');
    return admin.firestore();
  } catch (_err) {
    return null;
  }
}

async function readFirestoreCache() {
  const db = getFirestore();
  if (!db) return null;
  try {
    const snap = await db.doc(FIRESTORE_DOC).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!Array.isArray(data.vocab) || !data.fetchedAt) return null;
    return { vocab: data.vocab, fetchedAt: data.fetchedAt };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vocabulary] Firestore read failed:', err.message);
    return null;
  }
}

async function writeFirestoreCache(vocab) {
  const db = getFirestore();
  if (!db) return;
  try {
    await db.doc(FIRESTORE_DOC).set({ vocab, fetchedAt: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vocabulary] Firestore write failed:', err.message);
  }
}

async function fetchFromCocktailDb() {
  const res = await fetch(`${BASE_URL}/list.php?i=list`);
  if (!res.ok) throw new Error(`CocktailDB list.php returned ${res.status}`);
  const data = await res.json();
  const drinks = data.drinks || [];
  return drinks
    .map((d) => (d.strIngredient1 || '').trim())
    .filter((s) => s.length > 0);
}

/**
 * Get the best available ingredient vocabulary.
 * Preference order: in-process memo → Firestore cache → CocktailDB live →
 * static fallback.
 *
 * Always returns a non-empty string[] — worst case, the static list.
 */
async function getVocabulary() {
  // 1. In-process memo
  if (memo.vocab && isFresh(memo.fetchedAt)) {
    return memo.vocab;
  }

  // 2. Firestore cache
  const cached = await readFirestoreCache();
  if (cached && isFresh(cached.fetchedAt)) {
    memo = cached;
    return cached.vocab;
  }

  // 3. Live fetch
  try {
    const vocab = await fetchFromCocktailDb();
    if (vocab.length > 0) {
      const fetchedAt = Date.now();
      memo = { vocab, fetchedAt };
      // Best-effort cache write; don't await to avoid blocking the caller.
      writeFirestoreCache(vocab);
      return vocab;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vocabulary] live fetch failed, falling back to static:', err.message);
  }

  // 4. Static fallback
  return STATIC_VOCAB;
}

// Exposed for tests that want to reset memoization.
function _resetMemo() {
  memo = { vocab: null, fetchedAt: 0 };
}

module.exports = {
  getVocabulary,
  _resetMemo,
};
