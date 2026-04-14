// SCRUM-130: CocktailDB proxy routes — search, lookup, random, filter
const express = require('express');
const router = express.Router();

const COCKTAILDB_BASE = 'https://www.thecocktaildb.com/api/json/v1/1';

// ─── Helper: normalize a raw CocktailDB drink object ─────────────────────────
// Extracts parallel ingredient/measure fields into a clean array
function normalizeDrink(drink) {
  if (!drink) return null;
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name    = drink[`strIngredient${i}`];
    const measure = drink[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: measure?.trim() || '' });
    }
  }
  return {
    idDrink:      drink.idDrink,
    strDrink:     drink.strDrink,
    strCategory:  drink.strCategory,
    strAlcoholic: drink.strAlcoholic,
    strGlass:     drink.strGlass,
    strInstructions: drink.strInstructions,
    strDrinkThumb:   drink.strDrinkThumb,
    ingredients,
  };
}

// GET /api/cocktails/random
router.get('/random', async (req, res) => {
  try {
    const response = await fetch(`${COCKTAILDB_BASE}/random.php`);
    const data = await response.json();
    const drink = data.drinks?.[0] || null;
    if (!drink) return res.status(404).json({ error: 'No cocktail returned' });
    res.json(normalizeDrink(drink));
  } catch (err) {
    console.error('CocktailDB random error:', err);
    res.status(500).json({ error: 'Failed to fetch random cocktail' });
  }
});

// GET /api/cocktails/search?q=margarita
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
  try {
    const response = await fetch(`${COCKTAILDB_BASE}/search.php?s=${encodeURIComponent(q)}`);
    const data = await response.json();
    const drinks = (data.drinks || []).map(normalizeDrink);
    res.json(drinks);
  } catch (err) {
    console.error('CocktailDB search error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
  }
});

// GET /api/cocktails/filter?ingredient=Vodka
router.get('/filter', async (req, res) => {
  const { ingredient } = req.query;
  if (!ingredient) return res.status(400).json({ error: 'Query parameter ingredient is required' });
  try {
    const response = await fetch(
      `${COCKTAILDB_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`
    );
    const data = await response.json();
    // Filter endpoint returns partial records (no instructions/ingredients)
    const drinks = (data.drinks || []).map((d) => ({
      idDrink:      d.idDrink,
      strDrink:     d.strDrink,
      strDrinkThumb: d.strDrinkThumb,
    }));
    res.json(drinks);
  } catch (err) {
    console.error('CocktailDB filter error:', err);
    res.status(500).json({ error: 'Failed to filter from CocktailDB' });
  }
});

// GET /api/cocktails/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`${COCKTAILDB_BASE}/lookup.php?i=${id}`);
    const data = await response.json();
    const drink = data.drinks?.[0] || null;
    if (!drink) return res.status(404).json({ error: 'Cocktail not found' });
    res.json(normalizeDrink(drink));
  } catch (err) {
    console.error('CocktailDB lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
  }
});

module.exports = router;
