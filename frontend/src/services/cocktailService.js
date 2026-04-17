// SCRUM-130: CocktailDB service layer
// All CocktailDB calls go through the backend proxy (never direct from frontend).
// Firestore caching is applied with a lazy-load pattern so the app degrades
// gracefully when Firebase credentials are absent.

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// ─── Lazy Firebase ────────────────────────────────────────────────────────────
// Import Firebase only when credentials are present to prevent silent crashes.
let _db = null;
function getDb() {
  if (_db) return _db;
  try {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_firebase_api_key_here') return null;
    const { db } = require('../../firebaseConfig');
    _db = db;
    return _db;
  } catch {
    return null;
  }
}

// ─── Firestore Cache Helpers ──────────────────────────────────────────────────
async function readCache(key) {
  try {
    const db = getDb();
    if (!db) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'cocktailCache', key));
    if (!snap.exists()) return null;
    const { data, cachedAt } = snap.data();
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null; // expired
    return data;
  } catch {
    return null;
  }
}

async function writeCache(key, data) {
  try {
    const db = getDb();
    if (!db) return;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'cocktailCache', key), { data, cachedAt: Date.now() });
  } catch {
    // Cache write failure is non-fatal
  }
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Search cocktails by name.
 * GET /api/recipes/search?q=<query>
 */
export async function searchCocktails(query) {
  if (!query?.trim()) return [];
  const cacheKey = `search_${query.trim().toLowerCase()}`;

  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${BACKEND_URL}/api/recipes/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();

  await writeCache(cacheKey, data);
  return data;
}

/**
 * Fetch full cocktail detail by CocktailDB ID.
 * GET /api/recipes/:id
 */
export async function getCocktailById(id) {
  const cacheKey = `detail_${id}`;

  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BACKEND_URL}/api/recipes/${id}`);
  if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
  const data = await res.json();

  await writeCache(cacheKey, data);
  return data;
}

/**
 * Get a random cocktail for discovery surfaces.
 * GET /api/recipes/random
 */
export async function getRandomCocktail() {
  const res = await fetch(`${BACKEND_URL}/api/recipes/random`);
  if (!res.ok) throw new Error(`Random fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Filter cocktails by a single ingredient.
 * Returns partial records (id, name, thumbnail) — use getCocktailById for full detail.
 * GET /api/recipes/filter?ingredient=<name>
 */
export async function filterByIngredient(ingredient) {
  if (!ingredient?.trim()) return [];
  const cacheKey = `filter_${ingredient.trim().toLowerCase()}`;

  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${BACKEND_URL}/api/recipes/filter?ingredient=${encodeURIComponent(ingredient.trim())}`
  );
  if (!res.ok) throw new Error(`Filter failed: ${res.status}`);
  const data = await res.json();

  await writeCache(cacheKey, data);
  return data;
}
