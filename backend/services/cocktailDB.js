// SCRUM-111: CocktailDB API service wrapper
// Public API — no auth required
// Docs: https://www.thecocktaildb.com/api.php

const BASE_URL = "https://www.thecocktaildb.com/api/json/v1/1";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CocktailDB request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Filter cocktails by ingredient name — returns { drinks: [...] | null }
async function searchByIngredient(ingredient) {
  const url = `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`;
  return fetchJSON(url);
}

// Full cocktail details by ID — returns { drinks: [detail] | null }
async function lookupById(id) {
  const url = `${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`;
  return fetchJSON(url);
}

// Search cocktails by name — returns { drinks: [...] | null }
async function searchByName(name) {
  const url = `${BASE_URL}/search.php?s=${encodeURIComponent(name)}`;
  return fetchJSON(url);
}

module.exports = { searchByIngredient, lookupById, searchByName };
