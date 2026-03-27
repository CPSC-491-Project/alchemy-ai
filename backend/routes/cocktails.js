// SCRUM: Cocktail routes — proxies TheCocktailDB through our server
const express = require('express');
const router = express.Router();

const COCKTAILDB = 'https://www.thecocktaildb.com/api/json/v1/1';

// GET /api/cocktails/search?q=margarita
router.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const response = await fetch(`${COCKTAILDB}/search.php?s=${encodeURIComponent(q)}`);
    const data = await response.json();
    res.json({ drinks: data.drinks || [] });
  } catch (err) {
    console.error('Cocktail search error:', err);
    res.status(500).json({ error: 'Failed to search cocktails' });
  }
});

// GET /api/cocktails/:id  — full detail for one cocktail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${COCKTAILDB}/lookup.php?i=${id}`);
    const data = await response.json();

    if (!data.drinks || data.drinks.length === 0) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }

    const drink = data.drinks[0];

    // Parse ingredients + measures into a clean array
    const ingredients = [];
    for (let i = 1; i <= 15; i++) {
      const ingredient = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure ? measure.trim() : '',
        });
      }
    }

    const cocktail = {
      id: drink.idDrink,
      name: drink.strDrink,
      category: drink.strCategory,
      alcoholic: drink.strAlcoholic,
      glass: drink.strGlass,
      instructions: drink.strInstructions,
      image: drink.strDrinkThumb,
      tags: drink.strTags ? drink.strTags.split(',').map((t) => t.trim()) : [],
      ingredients,
    };

    res.json(cocktail);
  } catch (err) {
    console.error('Cocktail detail error:', err);
    res.status(500).json({ error: 'Failed to fetch cocktail detail' });
  }
});

module.exports = router;
