// SCRUM-146: CocktailDB service layer — extracted from routes/cocktails.js
const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

async function searchCocktails(query) {
  const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`CocktailDB search returned ${response.status}`);
  const data = await response.json();
  return data.drinks ?? [];
}

async function getCocktailById(id) {
  const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
  if (!response.ok) throw new Error(`CocktailDB lookup returned ${response.status}`);
  const data = await response.json();
  return data.drinks?.[0] ?? null;
}

module.exports = { searchCocktails, getCocktailById };
