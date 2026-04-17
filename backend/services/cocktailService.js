// SCRUM-146 + SCRUM-130: CocktailDB service layer
const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

// ─── Helper: normalize a raw CocktailDB drink object ─────────────────────────
function normalizeDrink(drink) {
  if (!drink) return null;
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name = drink[`strIngredient${i}`];
    const measure = drink[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: measure?.trim() || '' });
    }
  }
  return {
    id: drink.idDrink,
    name: drink.strDrink,
    thumb: drink.strDrinkThumb,
    category: drink.strCategory,
    instructions: drink.strInstructions,
    ingredients,
  };
}

async function searchCocktails(query) {
  const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`CocktailDB search returned ${response.status}`);
  const data = await response.json();
  return (data.drinks ?? []).map(normalizeDrink);
}

async function getCocktailById(id) {
  const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
  if (!response.ok) throw new Error(`CocktailDB lookup returned ${response.status}`);
  const data = await response.json();
  return normalizeDrink(data.drinks?.[0]) ?? null;
}

async function getRandomCocktail() {
  const response = await fetch(`${BASE_URL}/random.php`);
  if (!response.ok) throw new Error(`CocktailDB random returned ${response.status}`);
  const data = await response.json();
  return normalizeDrink(data.drinks?.[0]) ?? null;
}

async function filterByIngredient(ingredient) {
  const response = await fetch(`${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`);
  if (!response.ok) throw new Error(`CocktailDB filter returned ${response.status}`);
  const data = await response.json();
  return data.drinks ?? [];
}

module.exports = { normalizeDrink, searchCocktails, getCocktailById, getRandomCocktail, filterByIngredient };
