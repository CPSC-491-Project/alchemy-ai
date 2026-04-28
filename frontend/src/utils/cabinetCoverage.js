// frontend/src/utils/cabinetCoverage.js
//
// SCRUM-204: Cabinet coverage util — compute matched/missing ingredients
// for a given cocktail against a user's cabinet.
//
// Pure, deterministic, no I/O. Safe to call from any screen or service.
// Used by the "Scan My Cabinet" button on Cocktail Detail (SCRUM-205, parent
// SCRUM-203).
//
// Matching pipeline for each drink ingredient:
//   1. Normalize text (lowercase, strip non-letters, collapse whitespace).
//   2. Apply synonym map → canonical form.
//   3. Strip qualifiers ("light", "dark", "fresh", "juice", ...).
//   4. Look for exact normalized match in user's cabinet.
//   5. Fall back to Levenshtein similarity ≥ FUZZY_THRESHOLD for minor
//      spelling variants (typos, accent loss, etc.).
//
// Normalization rules deliberately mirror backend/services/ingredientMatcher.js
// (SCRUM-186) and recommendationEngine.js (SCRUM-199), so server-side
// recommendations and client-side cabinet scans agree on what counts as
// "the same ingredient". When the substitution engine eventually graduates
// to backend (per SCRUM-203 follow-up note), these rules port cleanly.

// Same threshold as backend recommendationEngine.FUZZY_SIMILARITY_THRESHOLD.
const FUZZY_THRESHOLD = 0.9;

// Common bar-staple synonym map. The KEY is what the user might type or what
// CocktailDB lists; the VALUE is the canonical form used for comparison.
// Both sides of a comparison get run through this, so "Lime juice" and "Lime"
// both reduce to "lime" and match.
const SYNONYMS = {
  'lime juice': 'lime',
  'lemon juice': 'lemon',
  'fresh lime juice': 'lime',
  'fresh lemon juice': 'lemon',
  'sugar syrup': 'simple syrup',
  'gomme syrup': 'simple syrup',
  'soda water': 'club soda',
  'sparkling water': 'club soda',
  // Cointreau is technically a brand of triple sec; in a generous cabinet-scan
  // context, having Cointreau should satisfy a "triple sec" requirement.
  cointreau: 'triple sec',
  angostura: 'angostura bitters',
};

// Qualifier tokens stripped before matching. "Light rum" → "rum"; "fresh mint"
// → "mint". Conservative list — anything that distinguishes ingredients in a
// way that matters for cocktails (e.g. "spiced", "coconut") is NOT here.
const QUALIFIERS = new Set([
  'light',
  'dark',
  'aged',
  'white',
  'gold',
  'fresh',
  'whole',
  'dried',
  'ground',
]);

/**
 * Reduce a raw ingredient name to its canonical form for comparison.
 * Lowercase, strip punctuation/digits, apply synonym map, drop qualifiers.
 *
 * @param {*} input - Any value; non-strings coerce, nullish becomes ''.
 * @returns {string} The canonical lowercase form (may be '').
 */
export function normalizeIngredient(input) {
  if (input == null) return '';
  const s = String(input)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  // Synonym lookup on the full normalized phrase first ("lime juice" → "lime").
  if (SYNONYMS[s]) return SYNONYMS[s];

  // Drop qualifier tokens. "light rum" → "rum", "aged dark rum" → "rum".
  const stripped = s
    .split(' ')
    .filter((t) => !QUALIFIERS.has(t))
    .join(' ');

  // After stripping, run the synonym map again in case the result is itself
  // a known synonym ("fresh lime juice" → "lime juice" → "lime").
  return SYNONYMS[stripped] || stripped || s;
}

// Iterative Levenshtein with two rolling rows. Inlined to avoid pulling
// fast-levenshtein onto the frontend bundle for one util.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Normalized similarity in [0..1]. 1.0 = identical, 0.0 = totally different.
function similarity(a, b) {
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 0;
  return 1 - levenshtein(a, b) / max;
}

// Cabinet items (from cabinetService.getCabinet) come as
//   { id, name, category, quantity, unit, dateAdded }
// Drink ingredients (from cocktailService.getCocktailById) usually come as
//   { name, measure }
// Either side may also be a plain string in tests/edge-cases — be defensive.
function getName(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && typeof item.name === 'string') {
    return item.name;
  }
  return '';
}

/**
 * Compare a user's cabinet against a drink's ingredient list.
 *
 * Pure function — no network, no Firestore, no React state. The caller is
 * responsible for fetching `cabinetItems` (via cabinetService.getCabinet)
 * and `drinkIngredients` (via cocktailService.getCocktailById) before
 * invoking.
 *
 * @param {Array<{name: string}>|string[]} cabinetItems
 *   The user's cabinet, as returned by getCabinet().
 * @param {Array<{name: string}>|string[]} drinkIngredients
 *   The drink's ingredients, as returned by getCocktailById().
 * @returns {{
 *   matched: Array<{ drinkIngredient: string, cabinetItem: any }>,
 *   missing: string[],
 *   matchedCount: number,
 *   ingredientCount: number,
 *   matchPercentage: number,
 * }}
 *   - `matched[].drinkIngredient` keeps the drink's original casing for UI
 *      display ("Light rum", not "rum").
 *   - `matched[].cabinetItem` is the original cabinet entry untouched, so
 *      the UI can read .category / .quantity / .id off it.
 *   - `missing` is drink ingredient names in their original casing.
 *   - `matchPercentage` is rounded to 3 decimals, in [0..1].
 */
export function compareCabinetToDrink(cabinetItems, drinkIngredients) {
  const cabinet = Array.isArray(cabinetItems) ? cabinetItems : [];
  const drink = Array.isArray(drinkIngredients) ? drinkIngredients : [];

  // Pre-normalize cabinet for fast lookup. Keep the original entry alongside
  // the canonical form so we can return it intact (UI may want category etc.)
  const cabinetNormalized = cabinet
    .map((item) => ({
      canonical: normalizeIngredient(getName(item)),
      original: item,
    }))
    .filter((c) => c.canonical);

  const matched = [];
  const missing = [];

  for (const ing of drink) {
    const drinkName = getName(ing);
    if (!drinkName) continue;
    const drinkCanonical = normalizeIngredient(drinkName);
    if (!drinkCanonical) continue;

    // Fast path: exact canonical match.
    let hit = cabinetNormalized.find((c) => c.canonical === drinkCanonical);

    // Fuzzy fallback: Levenshtein similarity ≥ threshold for typos /
    // minor variants ("Angustora bitters" → "Angostura bitters").
    if (!hit) {
      hit = cabinetNormalized.find(
        (c) => similarity(c.canonical, drinkCanonical) >= FUZZY_THRESHOLD,
      );
    }

    if (hit) {
      matched.push({ drinkIngredient: drinkName, cabinetItem: hit.original });
    } else {
      missing.push(drinkName);
    }
  }

  const ingredientCount = matched.length + missing.length;
  const matchPercentage =
    ingredientCount === 0
      ? 0
      : Number((matched.length / ingredientCount).toFixed(3));

  return {
    matched,
    missing,
    matchedCount: matched.length,
    ingredientCount,
    matchPercentage,
  };
}

// Exported for unit testing internals; not part of the public API.
export const _internal = { levenshtein, similarity, FUZZY_THRESHOLD };
