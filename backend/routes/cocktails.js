// SCRUM-63: Cocktail proxy routes — forwards requests to TheCocktailDB
const express = require('express');
const router = express.Router();
const { searchCocktails, getCocktailById } = require('../services/cocktailService');

// GET /api/recipes/search?q=margarita
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
  try {
    const drinks = await searchCocktails(q);
    res.json(drinks);
  } catch (err) {
    console.error('CocktailDB search error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const drink = await getCocktailById(id);
    if (!drink) return res.status(404).json({ error: 'Cocktail not found' });
    res.json(drink);
  } catch (err) {
    console.error('CocktailDB lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch from CocktailDB' });
  }
});

module.exports = router;
