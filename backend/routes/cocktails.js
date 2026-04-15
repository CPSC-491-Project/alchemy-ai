// SCRUM-130: CocktailDB proxy routes — search, lookup, random, filter
const express = require('express');
const router = express.Router();
const { searchCocktails, getCocktailById, getRandomCocktail, filterByIngredient } = require('../services/cocktailService');

// GET /api/recipes/random
router.get('/random', async (req, res) => {
  try {
    const drink = await getRandomCocktail();
    if (!drink) return res.status(404).json({ error: 'No cocktail returned' });
    res.json(drink);
  } catch (err) {
    console.error('CocktailDB random error:', err);
    res.status(500).json({ error: 'Failed to fetch random cocktail' });
  }
});

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

// GET /api/recipes/filter?ingredient=Vodka
router.get('/filter', async (req, res) => {
  const { ingredient } = req.query;
  if (!ingredient) return res.status(400).json({ error: 'Query parameter ingredient is required' });
  try {
    const drinks = await filterByIngredient(ingredient);
    res.json(drinks);
  } catch (err) {
    console.error('CocktailDB filter error:', err);
    res.status(500).json({ error: 'Failed to filter from CocktailDB' });
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
