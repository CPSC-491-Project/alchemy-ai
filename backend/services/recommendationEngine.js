// SCRUM-199: Recommendation engine.
//
// Pure scoring logic. Takes a list of user ingredients (the "Mixer Space")
// and an array of candidate drinks with their full ingredient lists, and
// returns a ranked array of recommendations.
//
// No I/O — all network calls happen in routes/recommendations.js. Keeping
// the engine pure makes it trivial to unit test (SCRUM-202 follow-up).
//
// Scoring rationale:
//   - matchCount: how many user ingredients the drink uses. Primary signal.
//   - coverage:  matchCount / totalIngredients. Rewards drinks that use a
//                high % of what the user has (a 2-of-3 cocktail beats a
//                2-of-10 cocktail at the same matchCount).
//   - score:     0.7 * (matchCount / userIngredientCount)
//                + 0.3 * coverage
//                Weighted toward "uses lots of what I have" but not blind
//                to drinks that need a few extras.
//
// Tuning knobs are at the top so they're easy to adjust during testing.

// ── Tuning knobs ───────────────────────────────────────────────────────────
const MATCH_WEIGHT = 0.7;     // weight for "fraction of user ingredients used"
const COVERAGE_WEIGHT = 0.3;  // weight for "fraction of drink covered"

// ── Helpers ────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '').toLowerCase().trim();
}

// Case-insensitive set membership for ingredient name lookup.
function makeIngredientSet(ingredients) {
  return new Set(ingredients.map(normalize));
}

// ── Public: score a single drink against user ingredients ─────────────────
function scoreDrink(drink, userIngredientSet) {
  const drinkIngredients = (drink.ingredients ?? []).map((ing) => ing.name);
  const totalIngredients = drinkIngredients.length;

  if (totalIngredients === 0) {
    // Defensive: filter.php-only payloads don't include ingredient lists.
    // Caller is expected to pass full lookup.php data; if not, score is 0.
    return {
      ...drink,
      matchedIngredients: [],
      missingIngredients: [],
      matchCount: 0,
      totalIngredients: 0,
      coverage: 0,
      score: 0,
    };
  }

  const matched = [];
  const missing = [];

  for (const name of drinkIngredients) {
    if (userIngredientSet.has(normalize(name))) {
      matched.push(name);
    } else {
      missing.push(name);
    }
  }

  const matchCount = matched.length;
  const userCount = userIngredientSet.size || 1; // avoid div-by-zero
  const coverage = matchCount / totalIngredients;
  const useFrac = matchCount / userCount;
  const score = MATCH_WEIGHT * useFrac + COVERAGE_WEIGHT * coverage;

  return {
    id: drink.id,
    name: drink.name,
    thumb: drink.thumb,
    category: drink.category,
    alcoholic: drink.alcoholic,
    glass: drink.glass,
    matchedIngredients: matched,
    missingIngredients: missing,
    matchCount,
    totalIngredients,
    coverage: Number(coverage.toFixed(3)),
    score: Number(score.toFixed(3)),
  };
}

// ── Public: rank a list of drinks against user ingredients ────────────────
//
// `userIngredients` is a string[] from the client (Mixer Space contents).
// `drinks` is an array of normalized drink objects with full ingredient
// arrays (i.e. from cocktailService.getCocktailById, NOT filterByIngredient).
//
// Returns the array sorted by score desc, with drinks that match zero
// user ingredients filtered out.
function rankDrinks(userIngredients, drinks) {
  const userSet = makeIngredientSet(userIngredients);
  return drinks
    .map((d) => scoreDrink(d, userSet))
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreDrink, rankDrinks };
