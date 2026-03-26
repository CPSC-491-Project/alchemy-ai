// SCRUM-115: Recommendation routes — GET /api/recommendations
const express = require("express");
const router = express.Router();
const admin = require("../firebase-admin");
const verifyToken = require("../middleware/verifyToken");
const { searchByIngredient, lookupById } = require("../services/cocktailDB");

const db = admin.firestore();

// Extract ingredient names from a full CocktailDB drink detail object
function extractIngredients(drink) {
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const val = drink[`strIngredient${i}`];
    if (val && val.trim()) {
      ingredients.push(val.trim().toLowerCase());
    }
  }
  return ingredients;
}

// GET / — recommend cocktails ranked by how many cabinet ingredients match
router.get("/", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    // Fetch user's cabinet ingredients
    const snapshot = await db.collection("users").doc(uid).collection("cabinet").get();
    if (snapshot.empty) {
      return res.json([]);
    }

    const cabinetNames = snapshot.docs.map((doc) => doc.data().name.toLowerCase());

    // Search CocktailDB for each cabinet ingredient, collect unique drink IDs
    const searchResults = await Promise.all(
      cabinetNames.map((name) => searchByIngredient(name))
    );

    const drinkIds = new Set();
    for (const result of searchResults) {
      if (!result.drinks) continue;
      for (const drink of result.drinks) {
        drinkIds.add(drink.idDrink);
      }
    }

    if (drinkIds.size === 0) {
      return res.json([]);
    }

    // Look up full details for each drink to compute match scores
    const details = await Promise.all(
      [...drinkIds].map((id) => lookupById(id))
    );

    const scored = [];
    for (const result of details) {
      if (!result.drinks || !result.drinks[0]) continue;
      const drink = result.drinks[0];
      const drinkIngredients = extractIngredients(drink);
      const matched = drinkIngredients.filter((ing) => cabinetNames.includes(ing));
      const score = drinkIngredients.length > 0
        ? matched.length / drinkIngredients.length
        : 0;

      scored.push({
        idDrink: drink.idDrink,
        strDrink: drink.strDrink,
        strDrinkThumb: drink.strDrinkThumb,
        matchedIngredients: matched,
        totalIngredients: drinkIngredients.length,
        score,
      });
    }

    // Sort by score descending, return top 5
    scored.sort((a, b) => b.score - a.score);
    res.json(scored.slice(0, 5));
  } catch (err) {
    console.error("Error generating recommendations:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;
