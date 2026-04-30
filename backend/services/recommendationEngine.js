// SCRUM-199: Recommendation engine.
//
// Given a list of user ingredients (the Mixer Space contents), returns a
// ranked array of cocktails the user can make (or nearly make).
//
// Algorithm:
//   1. Normalize input (uses normalize() from ingredientMatcher to stay
//      consistent with the OCR pipeline — same canonicalization rules).
//   2. Promise.all of cocktailService.filterByIngredient() per input.
//   3. Aggregate by frequency: drinkId → appearance count.
//   4. Take top CANDIDATE_POOL by appearance count, fetch full details
//      via cocktailService.getCocktailById() in parallel.
//   5. Score each: matchedCount = drink ingredients ∩ user ingredients
//      (case- and punctuation-insensitive, with Levenshtein tolerance for
//      minor variants); matchPercentage = matchedCount / totalIngredients.
//   6. Filter matchPercentage >= MIN_MATCH_PERCENTAGE.
//   7. Sort by matchPercentage desc, matchedCount desc as tiebreaker.
//   8. Return top `limit` results (default DEFAULT_LIMIT).
//
// Why the two-pass design (filter → lookup): filter.php returns minimal
// payloads (no ingredient lists) but is cheap. lookup.php returns full
// drink details but costs one round-trip per drink. By pre-ranking with
// filter.php and only fetching full details for the top CANDIDATE_POOL,
// we keep CocktailDB calls bounded at userIngredients + CANDIDATE_POOL.

const levenshtein = require('fast-levenshtein');
const cocktailService = require('./cocktailService');
const { _internal } = require('./ingredientMatcher');
const { normalize } = _internal;

// ── Tuning knobs ───────────────────────────────────────────────────────────
const MAX_INGREDIENTS = 8;            // SCRUM-202 mixer cap
const CANDIDATE_POOL = 600;           // SCRUM-209: effectively uncapped. CocktailDB has ~600 drinks total, so 600 means "score every drink that contains at least one user ingredient." Per-query actual fetch is bounded by filter.php's union (~100 for single common ingredients, up to ~300 for 3-ingredient queries). Tradeoff: each candidate triggers one getCocktailById call; large pools can take 1–3 seconds wall-clock even with Promise.all parallelism, and may brush rate limits on CocktailDB's free tier under demo load. Dial back if latency or rate-limiting becomes an issue.
const MIN_MATCH_PERCENTAGE = 0;       // SCRUM-209: removed default threshold. Was 0.25 (originally 0.4). With 1 user ingredient, any threshold above 0 cuts out 5+-ingredient drinks (1/5 = 20%), which is most of the catalog. Sort by matchedCount keeps strong matches at the top, and the limit caps total output. Callers can still pass a minMatchPercentage option explicitly if they want stricter filtering.
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

// Score a single fully-fetched drink against the normalized user ingredient set.
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
// by tests that want to verify scoring logic without mocking the network.
function rankDrinks(userIngredients, drinks, opts = {}) {
  const { limit = DEFAULT_LIMIT, minMatchPercentage = MIN_MATCH_PERCENTAGE } = opts;
  const normalizedUserSet = new Set(
    userIngredients.map(normalize).filter(Boolean)
  );

  return drinks
    .map((d) => scoreDrink(d, normalizedUserSet))
    .filter((r) => r !== null)
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

// ── Public: full pipeline, hits CocktailDB ────────────────────────────────
//
// Throws on cap violation or on upstream CocktailDB failures. The route
// catches and translates to HTTP 400/500 — keeping the engine throw-based
// makes it composable for non-HTTP callers (e.g. future scheduled jobs).
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

  // Step 1: filter.php per ingredient. Per-ingredient failures (404, empty
  // results, etc.) are absorbed so one bad ingredient name doesn't kill
  // the whole request. Upstream-wide failures (e.g. CocktailDB down) are
  // not caught here and propagate up to the route's 500 handler.
  const filterResults = await Promise.all(
    cleaned.map(async (ing) => {
      try {
        return await cocktailService.filterByIngredient(ing);
      } catch {
        return [];
      }
    })
  );

  // Step 2: aggregate appearance counts.
  const appearances = new Map(); // drinkId → count
  for (const drinks of filterResults) {
    for (const drink of drinks) {
      if (!drink?.id) continue;
      appearances.set(drink.id, (appearances.get(drink.id) ?? 0) + 1);
    }
  }
  if (appearances.size === 0) return [];

  // Step 3: pick top CANDIDATE_POOL by frequency, fetch full details.
  const topIds = [...appearances.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, CANDIDATE_POOL)
    .map(([id]) => id);

  const fullDrinks = await Promise.all(
    topIds.map((id) => cocktailService.getCocktailById(id))
  );

  // Step 4: score, filter, rank.
  return rankDrinks(cleaned, fullDrinks.filter(Boolean), opts);
}

module.exports = {
  recommendDrinks,
  // Exported for direct testing without mocking the network:
  _internal: {
    rankDrinks,
    scoreDrink,
    ingredientIsInUserSet,
    similarity,
    MAX_INGREDIENTS,
    CANDIDATE_POOL,
    MIN_MATCH_PERCENTAGE,
    DEFAULT_LIMIT,
  },
};
