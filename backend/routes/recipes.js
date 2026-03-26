// SCRUM-114: Recipe routes — GET /api/recipes/search
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { searchByIngredient } = require("../services/cocktailDB");

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

module.exports = router;
