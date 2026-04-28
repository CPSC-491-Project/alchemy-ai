// SCRUM-199: /api/recommendations route.
//
// Thin HTTP wrapper around recommendationEngine.recommendDrinks. All
// algorithmic logic lives in the engine; this file only translates
// HTTP request/response and error shape.
//
// Auth: NONE for now — recommendations work for guests. Add verifyToken
// here if SCRUM-202 introduces per-user history or rate limiting.
//
// Request:  POST /api/recommendations
//   Body:     { ingredients: string[1..8], limit?: number }
//
// Response (200):
//   {
//     recommendations: [
//       {
//         id, name, thumbnail, category, alcoholic,
//         matchPercentage, matchedCount, ingredientCount,
//         missingIngredients: string[]
//       },
//       ...
//     ]
//   }
//
// Error responses:
//   400 — invalid ingredients (non-array, empty, >8 items, all-empty strings)
//   500 — upstream CocktailDB failure

const express = require('express');
const router = express.Router();

const { recommendDrinks } = require('../services/recommendationEngine');

router.post('/', async (req, res) => {
  const { ingredients, limit } = req.body || {};

  // Light input typing here; all the real validation is in the engine,
  // which throws Error objects with .status set.
  try {
    const recommendations = await recommendDrinks(ingredients, {
      limit: typeof limit === 'number' ? limit : undefined,
    });
    return res.json({ recommendations });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('Recommendations error:', err);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

module.exports = router;
