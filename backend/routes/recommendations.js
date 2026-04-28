// SCRUM-199: /api/recommendations route.
//
// Takes a list of user ingredients (the Mixer Space) and returns a ranked
// list of cocktails the user can make (or nearly make) with what they have.
//
// Auth: NONE for now — recommendations work for guests. Re-add verifyToken
// if per-user history or rate limiting is added in SCRUM-202.
//
// Request:  POST /api/recommendations
//   Body:     { ingredients: string[] }    // 1..MAX_INGREDIENTS items
//
// Response (200):
//   {
//     recommendations: [
//       {
//         id, name, thumb, category, alcoholic, glass,
//         matchedIngredients: string[],     // present in user's mixer
//         missingIngredients: string[],     // user is missing for this drink
//         matchCount: number,
//         totalIngredients: number,
//         coverage: number,                 // 0..1
//         score: number                     // 0..1
//       },
//       ...
//     ],
//     pool: number,                         // unique candidates considered
//     returned: number                      // how many made it into the response
//   }
//
// Error responses:
//   400 — missing/empty/oversized ingredients array
//   500 — upstream CocktailDB failure
//
// Algorithm:
//   1. Validate input.
//   2. For each user ingredient, hit filter.php?i= to get drinks containing it.
//      filter.php returns minimal payloads (id/name/thumb only).
//   3. Build a counter: drinkId -> how many user ingredients it appears under.
//      A drink appearing in 3 of the 3 filter calls is a stronger candidate
//      than one appearing in 1.
//   4. Take the top TOP_N candidates by appearance count, fetch full details
//      via lookup.php?i= so we have complete ingredient lists.
//   5. Hand off to recommendationEngine.rankDrinks for actual scoring.
//
// Why two passes (filter then lookup): the alternative is to call
// lookup.php for every drink in the union of filter results, which can
// be 100+ drinks for common ingredients. Pre-ranking by raw appearance
// count and only fetching full details for the top candidates keeps the
// total CocktailDB call count bounded (~userIngredients + TOP_N).

const express = require('express');
const router = express.Router();

const cocktailService = require('../services/cocktailService');
const { rankDrinks } = require('../services/recommendationEngine');

// ── Tuning knobs ───────────────────────────────────────────────────────────
const MAX_INGREDIENTS = 8;   // SCRUM-202 mixer cap; reject larger payloads
const TOP_N = 10;            // how many candidates we fetch full details for
const MAX_RESULTS = 10;      // how many ranked results we return to the client

// POST / — recommend drinks from a list of user ingredients.
router.post('/', async (req, res) => {
  const { ingredients } = req.body || {};

  // ── Input validation ────────────────────────────────────────────────────
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({
      error: 'ingredients must be an array of strings',
    });
  }
  if (ingredients.length === 0) {
    return res.status(400).json({
      error: 'ingredients must contain at least one item',
    });
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    return res.status(400).json({
      error: `ingredients must contain at most ${MAX_INGREDIENTS} items`,
    });
  }
  // De-dupe + drop empty strings on the way in. The client should be doing
  // this too but defensive normalization is cheap.
  const cleaned = [
    ...new Set(
      ingredients
        .filter((i) => typeof i === 'string')
        .map((i) => i.trim())
        .filter(Boolean)
    ),
  ];
  if (cleaned.length === 0) {
    return res.status(400).json({
      error: 'ingredients must contain at least one non-empty string',
    });
  }

  try {
    // ── Step 1: filter.php for each ingredient, collect candidates ────────
    // We tolerate per-ingredient failures: if "unicorn tears" returns nothing
    // or 404s, the others still contribute. Promise.allSettled lets one bad
    // ingredient not poison the whole request.
    const filterResults = await Promise.allSettled(
      cleaned.map((ing) => cocktailService.filterByIngredient(ing))
    );

    // Build drinkId -> { drink, appearances } map.
    // appearances = number of user ingredients this drink showed up under.
    const candidateMap = new Map();
    for (const result of filterResults) {
      if (result.status !== 'fulfilled') continue;
      for (const drink of result.value) {
        if (!drink?.id) continue;
        const existing = candidateMap.get(drink.id);
        if (existing) {
          existing.appearances += 1;
        } else {
          candidateMap.set(drink.id, { drink, appearances: 1 });
        }
      }
    }

    if (candidateMap.size === 0) {
      // No drink in TheCocktailDB uses any of these ingredients.
      return res.json({ recommendations: [], pool: 0, returned: 0 });
    }

    // ── Step 2: pick top TOP_N by appearance count, fetch full details ────
    const topCandidates = [...candidateMap.values()]
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, TOP_N);

    const fullDetails = await Promise.allSettled(
      topCandidates.map(({ drink }) => cocktailService.getCocktailById(drink.id))
    );

    const fullDrinks = fullDetails
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    // ── Step 3: score and rank ────────────────────────────────────────────
    const ranked = rankDrinks(cleaned, fullDrinks).slice(0, MAX_RESULTS);

    return res.json({
      recommendations: ranked,
      pool: candidateMap.size,
      returned: ranked.length,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Recommendations error:', err);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

module.exports = router;
