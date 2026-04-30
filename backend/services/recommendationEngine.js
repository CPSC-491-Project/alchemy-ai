// SCRUM-209: Recommendation engine — catalog-backed.
//
// Given a list of user ingredients (the Mixer Space contents), returns a
// ranked array of cocktails the user can make (or nearly make).
//
// Algorithm:
//   1. Normalize input (uses normalize() from ingredientMatcher to stay
//      consistent with the OCR pipeline — same canonicalization rules).
//   2. Pull all drinks from the in-memory cocktailCatalog.
//   3. Score each: matchedCount = drink ingredients ∩ user ingredients
//      (case- and punctuation-insensitive, with Levenshtein tolerance for
//      minor variants); matchPercentage = matchedCount / totalIngredients.
//   4. Drop drinks with zero matches (the catalog has ~600 drinks; only
//      ones containing at least one user ingredient are useful results).
//   5. Filter matchPercentage >= MIN_MATCH_PERCENTAGE.
//   6. Sort by matchedCount desc, matchPercentage desc as tiebreaker.
//   7. Return top `limit` results.
//
// The previous architecture (filter.php → lookup.php → score) is gone.
// It hit a CocktailDB rate limit on single-ingredient queries: ~150
// parallel lookup.php calls returned HTTP 200 + {drinks: null} for most
// of them, so a "vodka" query returned 1 drink instead of 100+. Loading
// the full catalog up-front (see cocktailCatalog.js) sidesteps that
// entirely and removes the CANDIDATE_POOL tuning knob.

const levenshtein = require('fast-levenshtein');
const cocktailCatalog = require('./cocktailCatalog');
const { _internal } = require('./ingredientMatcher');
const { normalize } = _internal;

// ── Tuning knobs ───────────────────────────────────────────────────────────
const MAX_INGREDIENTS = 8;            // SCRUM-202 mixer cap
const MIN_MATCH_PERCENTAGE = 0;       // SCRUM-209: no default threshold (sort + limit do the trimming)
const DEFAULT_LIMIT = 6;              // results returned to client by default
const FUZZY_SIMILARITY_THRESHOLD = 0.9; // for Levenshtein-based ingredient match

// ── Helpers ────────────────────────────────────────────────────────────────

// Normalized similarity in [0..1]. 1.0 = identical, 0.0 = totally different.
function similarity(a, b) {
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 0;
  return 1 - levenshtein.get(a, b) / max;
}

// Does this drink ingredient match any of the user's ingredients?
// Exact normalized match is the fast path; Levenshtein fallback handles
// minor spelling variants.
function ingredientIsInUserSet(drinkIngredient, normalizedUserSet) {
  const norm = normalize(drinkIngredient);
  if (!norm) return false;
  if (normalizedUserSet.has(norm)) return true;
  for (const userIng of normalizedUserSet) {
    if (similarity(norm, userIng) >= FUZZY_SIMILARITY_THRESHOLD) return true;
  }
  return false;
}

// Score a single drink against the normalized user ingredient set.
function scoreDrink(drink, normalizedUserSet) {
  const drinkIngredients = (drink.ingredients ?? []).map((ing) => ing.name);
  const ingredientCount = drinkIngredients.length;
  if (ingredientCount === 0) return null; // skip drinks with no ingredient data

  const matched = [];
  const missing = [];
  for (const name of drinkIngredients) {
    if (ingredientIsInUserSet(name, normalizedUserSet)) {
      matched.push(name);
    } else {
      missing.push(name);
    }
  }

  const matchedCount = matched.length;
  const matchPercentage = matchedCount / ingredientCount;

  return {
    id: drink.id,
    name: drink.name,
    thumbnail: drink.thumb,            // remap to consumer-expected field name
    category: drink.category,
    alcoholic: drink.alcoholic,
    matchPercentage: Number(matchPercentage.toFixed(3)),
    matchedCount,
    ingredientCount,
    missingIngredients: missing,
  };
}

// ── Public: rank pre-fetched drinks against user ingredients ──────────────
//
// Pure function. No I/O. Used internally by recommendDrinks and directly
// by tests that want to verify scoring logic without setting up the catalog.
function rankDrinks(userIngredients, drinks, opts = {}) {
  const { limit = DEFAULT_LIMIT, minMatchPercentage = MIN_MATCH_PERCENTAGE } = opts;
  const normalizedUserSet = new Set(
    userIngredients.map(normalize).filter(Boolean)
  );

  return drinks
    .map((d) => scoreDrink(d, normalizedUserSet))
    .filter((r) => r !== null)
    // SCRUM-209 (catalog migration): when scoring against the full ~600
    // drink catalog, most drinks share zero ingredients with the user's
    // mixer. Drop them so the limit isn't burned on irrelevant results.
    // The previous filter.php-based pipeline got this for free because
    // candidates were already pre-filtered to drinks containing >=1
    // user ingredient.
    .filter((r) => r.matchedCount > 0)
    .filter((r) => r.matchPercentage >= minMatchPercentage)
    // SCRUM-209: rank primarily by matchedCount (drinks that use MORE of
    // the user's ingredients first), tiebreak by matchPercentage.
    // Previously the priority was reversed, which caused 1-ingredient drinks
    // ("Vodka neat" at 100% coverage) to outrank 3-ingredient drinks that
    // actually used 2 of the user's 2 ingredients (Kamikaze at 67%). Users
    // perceived this as "weak matches first" — exactly opposite of intent.
    .sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) {
        return b.matchedCount - a.matchedCount;
      }
      return b.matchPercentage - a.matchPercentage;
    })
    .slice(0, limit);
}

// ── Public: full pipeline, reads from the in-memory catalog ───────────────
//
// `async` is preserved for caller compatibility (the route awaits it) and
// to keep the door open for future I/O (e.g. logging recommend events to
// Firestore for personalization). The function body itself is I/O-free.
//
// Throws:
//   - status: 400 on invalid input (validation)
//   - status: 503 if the catalog hasn't loaded yet (boot race)
async function recommendDrinks(ingredients, opts = {}) {
  if (!Array.isArray(ingredients)) {
    throw Object.assign(new Error('ingredients must be an array'), { status: 400 });
  }
  const cleaned = [
    ...new Set(
      ingredients
        .filter((i) => typeof i === 'string')
        .map((i) => i.trim())
        .filter(Boolean)
    ),
  ];
  if (cleaned.length === 0) {
    throw Object.assign(
      new Error('ingredients must contain at least one non-empty string'),
      { status: 400 }
    );
  }
  if (cleaned.length > MAX_INGREDIENTS) {
    throw Object.assign(
      new Error(`ingredients must contain at most ${MAX_INGREDIENTS} items`),
      { status: 400 }
    );
  }

  const drinks = cocktailCatalog.getDrinks();
  if (drinks.length === 0) {
    // Boot race: server is up but the initial catalog load hasn't completed
    // (or it failed). 503 + retry messaging is the honest answer.
    throw Object.assign(
      new Error('Cocktail catalog is not ready yet. Please try again in a moment.'),
      { status: 503 }
    );
  }

  return rankDrinks(cleaned, drinks, opts);
}

module.exports = {
  recommendDrinks,
  // Exported for direct testing without setting up the catalog:
  _internal: {
    rankDrinks,
    scoreDrink,
    ingredientIsInUserSet,
    similarity,
    MAX_INGREDIENTS,
    MIN_MATCH_PERCENTAGE,
    DEFAULT_LIMIT,
  },
};
