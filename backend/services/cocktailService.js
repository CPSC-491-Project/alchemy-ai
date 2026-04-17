// SCRUM-146 + SCRUM-130 + SCRUM-172: CocktailDB service layer
const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

// ─── Helper: normalize a raw CocktailDB drink object ─────────────────────────
// SCRUM-172: added `alcoholic` and `glass` (used by CocktailDetailScreen badges)
// and ensured this normalizer is the single source of truth for shape across
// every endpoint (search, lookup, random, filter). The filter.php endpoint
// returns a minimal payload (idDrink, strDrink, strDrinkThumb) so the
// non-present fields become undefined — callers already handle that.
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
    alcoholic: drink.strAlcoholic,
    glass: drink.strGlass,
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
  // SCRUM-172: normalize filter output so shape matches search/lookup/random.
  // filter.php only returns idDrink/strDrink/strDrinkThumb; other fields will
  // be undefined on the normalized object — that's expected and handled by
  // consumers (SearchScreen only uses id/name/thumb/category for cards).
  return (data.drinks ?? []).map(normalizeDrink);
}

module.exports = { normalizeDrink, searchCocktails, getCocktailById, getRandomCocktail, filterByIngredient };
