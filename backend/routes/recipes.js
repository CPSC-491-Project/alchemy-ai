// SCRUM-114: Recipe routes — GET /api/recipes/search
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { searchByIngredient, lookupById } = require("../services/cocktailDB");

// GET /search — search cocktails by one or more ingredients
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { ingredients } = req.query;

    if (!ingredients) {
      return res.status(400).json({ error: "ingredients query param is required" });
    }

    const ingredientList = ingredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    if (ingredientList.length === 0) {
      return res.status(400).json({ error: "ingredients query param is required" });
    }

    const results = await Promise.all(
      ingredientList.map((ingredient) => searchByIngredient(ingredient))
    );

    const seen = new Set();
    const drinks = [];
    for (const result of results) {
      if (!result.drinks) continue;
      for (const drink of result.drinks) {
        if (!seen.has(drink.idDrink)) {
          seen.add(drink.idDrink);
          drinks.push(drink);
        }
      }
    }

    res.json(drinks);
  } catch (err) {
    console.error("Error searching recipes:", err);
    res.status(500).json({ error: "Failed to search recipes" });
  }
});

// SCRUM-117: GET /:id/substitutions — ingredient substitution suggestions (FR-5)
router.get("/:id/substitutions", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await lookupById(id);

    if (!result.drinks || !result.drinks[0]) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const drink = result.drinks[0];

    // Extract all non-null ingredients from the original drink
    const originalIngredients = [];
    for (let i = 1; i <= 15; i++) {
      const val = drink[`strIngredient${i}`];
      if (val && val.trim()) {
        originalIngredients.push(val.trim());
      }
    }

    // For each ingredient, find similar drinks and extract their ingredients
    const searchResults = await Promise.all(
      originalIngredients.map((ing) => searchByIngredient(ing))
    );

    // Collect candidate drink IDs from similar drinks (limit to keep API calls reasonable)
    const candidateIds = new Set();
    for (const sr of searchResults) {
      if (!sr.drinks) continue;
      for (const d of sr.drinks.slice(0, 5)) {
        if (d.idDrink !== id) candidateIds.add(d.idDrink);
      }
    }

    // Look up full details of candidate drinks
    const candidateDetails = await Promise.all(
      [...candidateIds].map((cid) => lookupById(cid))
    );

    // For each original ingredient, find alternatives used in similar drinks
    const originalSet = new Set(originalIngredients.map((i) => i.toLowerCase()));
    const substitutions = originalIngredients.map((ingredient) => {
      const altCounts = {};

      for (const cd of candidateDetails) {
        if (!cd.drinks || !cd.drinks[0]) continue;
        const candidate = cd.drinks[0];
        const candidateIngredients = [];
        for (let i = 1; i <= 15; i++) {
          const val = candidate[`strIngredient${i}`];
          if (val && val.trim()) candidateIngredients.push(val.trim());
        }

        // Check if this drink uses the same ingredient — if not, find what it uses instead
        const hasOriginal = candidateIngredients.some(
          (ci) => ci.toLowerCase() === ingredient.toLowerCase()
        );
        if (hasOriginal) continue;

        // Ingredients in the candidate that aren't in the original recipe are potential subs
        for (const ci of candidateIngredients) {
          if (!originalSet.has(ci.toLowerCase())) {
            altCounts[ci] = (altCounts[ci] || 0) + 1;
          }
        }
      }

      // Sort alternatives by frequency, take top 3
      const alternatives = Object.entries(altCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, frequency: count }));

      return { ingredient, alternatives };
    });

    res.json(substitutions);
  } catch (err) {
    console.error("Error fetching substitutions:", err);
    res.status(500).json({ error: "Failed to fetch substitutions" });
  }
});

// SCRUM-116: GET /:id — full recipe detail by CocktailDB ID (FR-25)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await lookupById(id);

    if (!result.drinks || !result.drinks[0]) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(result.drinks[0]);
  } catch (err) {
    console.error("Error fetching recipe detail:", err);
    res.status(500).json({ error: "Failed to fetch recipe detail" });
  }
});

module.exports = router;
