// SCRUM-63: Cocktail proxy routes — forwards requests to TheCocktailDB
const express = require('express');
const router = express.Router();
// fetch is globally available in Node 18 — no import needed

const COCKTAILDB_BASE = 'https://www.thecocktaildb.com/api/json/v1/1';

// GET /api/cocktails/search?q=margarita
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
  try {
    const response = await fetch(`${COCKTAILDB_BASE}/search.php?s=${encodeURIComponent(q)}`);
    const data = await response.json();
    res.json(data.drinks || []);
  } catch (err) {
    console.error('CocktailDB search error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
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
    res.json(drink);
  } catch (err) {
    console.error('CocktailDB lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
  }
});

module.exports = router;
