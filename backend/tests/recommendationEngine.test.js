// SCRUM-199: Tests for the recommendation engine.
//
// Mocks cocktailService so the engine is exercised without hitting the
// network. Each test sets up a small, controlled CocktailDB world and
// asserts engine behavior against it.
//
// Pattern: jest.mock('../services/cocktailService') replaces both
// filterByIngredient and getCocktailById with auto-mock fns; we set
// .mockResolvedValue / .mockImplementation per test.

jest.mock('../services/cocktailService');

const cocktailService = require('../services/cocktailService');
const { recommendDrinks, _internal } = require('../services/recommendationEngine');
const { rankDrinks } = _internal;

// ── Fixtures ───────────────────────────────────────────────────────────────
// Minimal drink shape matching cocktailService.normalizeDrink output.
const drink = (id, name, ingredients, extra = {}) => ({
  id,
  name,
  thumb: `https://example.com/${id}.jpg`,
  category: 'Cocktail',
  alcoholic: 'Alcoholic',
  glass: 'Glass',
  instructions: '',
  ingredients: ingredients.map((n) => ({ name: n, measure: '' })),
  ...extra,
});

// Drinks that appear in fixtures across multiple tests.
const KAMIKAZE = drink('11600', 'Kamikaze', ['Vodka', 'Triple sec', 'Lime juice']);
const COSMO = drink('11106', 'Cosmopolitan', ['Vodka', 'Triple sec', 'Lime juice', 'Cranberry juice']);
const VODKA_MARTINI = drink('11086', 'Vodka Martini', ['Vodka', 'Dry Vermouth', 'Olive']);
const MOJITO = drink('11000', 'Mojito', ['Light rum', 'Lime', 'Sugar', 'Mint', 'Soda water']);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 1: 1 ingredient input → returns drinks containing it
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — single ingredient', () => {
  it('returns drinks that contain the ingredient', async () => {
    cocktailService.filterByIngredient.mockResolvedValue([
      { id: '11600' }, { id: '11086' },
    ]);
    cocktailService.getCocktailById.mockImplementation(async (id) => {
      if (id === '11600') return KAMIKAZE;
      if (id === '11086') return VODKA_MARTINI;
      return null;
    });

    // With one ingredient against 3-ingredient drinks, matchPercentage = 1/3 = 0.33,
    // which is below the default 0.4 threshold. So default-threshold output is [];
    // dropping the threshold to 0 verifies the candidates were retrieved and scored.
    const all = await recommendDrinks(['vodka'], { minMatchPercentage: 0 });
    const names = all.map((d) => d.name);
    expect(names).toContain('Kamikaze');
    expect(names).toContain('Vodka Martini');

    const out = await recommendDrinks(['vodka']);
    expect(out).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 2: 3 ingredients with full overlap → top result uses all 3
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — full-overlap ranking', () => {
  it('ranks the 3-of-3 drink first', async () => {
    // filterByIngredient called once per input ingredient.
    cocktailService.filterByIngredient.mockImplementation(async (ing) => {
      const lower = ing.toLowerCase();
      if (lower === 'vodka') return [{ id: '11600' }, { id: '11106' }, { id: '11086' }];
      if (lower === 'lime juice') return [{ id: '11600' }, { id: '11106' }];
      if (lower === 'triple sec') return [{ id: '11600' }, { id: '11106' }];
      return [];
    });
    cocktailService.getCocktailById.mockImplementation(async (id) => {
      if (id === '11600') return KAMIKAZE;
      if (id === '11106') return COSMO;
      if (id === '11086') return VODKA_MARTINI;
      return null;
    });

    const out = await recommendDrinks(['vodka', 'lime juice', 'triple sec']);

    expect(out.length).toBeGreaterThan(0);
    expect(out[0].name).toBe('Kamikaze');
    expect(out[0].matchedCount).toBe(3);
    expect(out[0].ingredientCount).toBe(3);
    expect(out[0].matchPercentage).toBe(1);
    expect(out[0].missingIngredients).toEqual([]);

    // Cosmo should rank second: 3/4 = 0.75
    const cosmo = out.find((d) => d.name === 'Cosmopolitan');
    expect(cosmo).toBeDefined();
    expect(cosmo.matchedCount).toBe(3);
    expect(cosmo.ingredientCount).toBe(4);
    expect(cosmo.missingIngredients).toEqual(['Cranberry juice']);
  });

  it('returns the documented response shape', async () => {
    cocktailService.filterByIngredient.mockResolvedValue([{ id: '11600' }]);
    cocktailService.getCocktailById.mockResolvedValue(KAMIKAZE);

    const out = await recommendDrinks(['vodka', 'lime juice', 'triple sec']);
    const result = out[0];

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        thumbnail: expect.any(String),
        matchPercentage: expect.any(Number),
        matchedCount: expect.any(Number),
        ingredientCount: expect.any(Number),
        missingIngredients: expect.any(Array),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 3: Empty / invalid input → throws 400-status error
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — input validation', () => {
  it('throws 400 on non-array input', async () => {
    await expect(recommendDrinks('vodka')).rejects.toMatchObject({ status: 400 });
    await expect(recommendDrinks(null)).rejects.toMatchObject({ status: 400 });
    await expect(recommendDrinks(undefined)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 on empty array', async () => {
    await expect(recommendDrinks([])).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 on array of only empty strings', async () => {
    await expect(recommendDrinks(['', '   ', null])).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when over the 8-ingredient cap', async () => {
    const nine = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    await expect(recommendDrinks(nine)).rejects.toMatchObject({ status: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 4: matchPercentage < 0.4 → filtered out
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — low-match filter', () => {
  it('drops drinks below the 0.4 match threshold', async () => {
    // Mojito = 5 ingredients, user has 1 (lime → matches Lime). 1/5 = 0.2 < 0.4.
    cocktailService.filterByIngredient.mockResolvedValueOnce([{ id: '11000' }]);
    cocktailService.getCocktailById.mockResolvedValueOnce(MOJITO);

    const out = await recommendDrinks(['lime']);
    expect(out.find((d) => d.name === 'Mojito')).toBeUndefined();
  });

  it('keeps drinks at or above the 0.4 match threshold', async () => {
    // Kamikaze = 3 ingredients, user has 2 (vodka, lime juice). 2/3 ≈ 0.67 ≥ 0.4.
    cocktailService.filterByIngredient.mockImplementation(async (ing) => {
      const lower = ing.toLowerCase();
      if (lower === 'vodka' || lower === 'lime juice') return [{ id: '11600' }];
      return [];
    });
    cocktailService.getCocktailById.mockResolvedValue(KAMIKAZE);

    const out = await recommendDrinks(['vodka', 'lime juice']);
    expect(out.find((d) => d.name === 'Kamikaze')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 5: Tie-breaking — equal match%, ranked by matchedCount desc
// ─────────────────────────────────────────────────────────────────────────
describe('rankDrinks — tiebreaker', () => {
  it('ranks by matchedCount when matchPercentage ties', () => {
    // Two drinks at exactly 0.5 matchPercentage but different matchedCounts.
    // Two-ingredient drink with 1 match: 1/2 = 0.5
    // Six-ingredient drink with 3 matches: 3/6 = 0.5 → should rank higher
    const small = drink('A', 'Small Drink', ['Vodka', 'Soda']);
    const big = drink('B', 'Big Drink', ['Vodka', 'Lime juice', 'Triple sec', 'Sugar', 'Mint', 'Ice']);

    const ranked = rankDrinks(['vodka', 'lime juice', 'triple sec'], [small, big]);
    expect(ranked[0].name).toBe('Big Drink');
    expect(ranked[1].name).toBe('Small Drink');
    expect(ranked[0].matchPercentage).toBe(ranked[1].matchPercentage);
    expect(ranked[0].matchedCount).toBeGreaterThan(ranked[1].matchedCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 6: CocktailDB error → propagates
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — error propagation', () => {
  it('absorbs per-ingredient filter failures (one bad ingredient does not kill the request)', async () => {
    cocktailService.filterByIngredient.mockImplementation(async (ing) => {
      if (ing === 'unicorn tears') throw new Error('CocktailDB filter returned 404');
      // Vodka and lime juice both return Kamikaze → it appears twice in
      // the aggregation (and 2/3 = 0.67 ≥ 0.4, so it passes the threshold).
      return [{ id: '11600' }];
    });
    cocktailService.getCocktailById.mockResolvedValue(KAMIKAZE);

    // Should not throw — the bad ingredient is skipped, the good ones contribute.
    const out = await recommendDrinks(['vodka', 'lime juice', 'unicorn tears']);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].name).toBe('Kamikaze');
  });

  it('propagates a getCocktailById failure as an unhandled error', async () => {
    cocktailService.filterByIngredient.mockResolvedValue([{ id: '11600' }]);
    cocktailService.getCocktailById.mockRejectedValue(new Error('CocktailDB lookup returned 500'));

    await expect(recommendDrinks(['vodka', 'lime juice', 'triple sec'])).rejects.toThrow(
      /CocktailDB lookup/
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Bonus: limit option
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — limit option', () => {
  it('respects a custom limit', async () => {
    cocktailService.filterByIngredient.mockResolvedValue([
      { id: '11600' }, { id: '11106' },
    ]);
    cocktailService.getCocktailById.mockImplementation(async (id) => {
      if (id === '11600') return KAMIKAZE;
      if (id === '11106') return COSMO;
      return null;
    });

    const out = await recommendDrinks(['vodka', 'lime juice', 'triple sec'], { limit: 1 });
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('Kamikaze');
  });
});
