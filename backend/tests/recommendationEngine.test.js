// SCRUM-209: Tests for the recommendation engine (catalog-backed).
//
// Mocks cocktailCatalog so the engine is exercised against a controlled
// in-memory catalog. Each test sets up a small catalog and asserts engine
// behavior. rankDrinks tests bypass the catalog entirely (pure function).

jest.mock('../services/cocktailCatalog');

const cocktailCatalog = require('../services/cocktailCatalog');
const { recommendDrinks, _internal } = require('../services/recommendationEngine');
const { rankDrinks } = _internal;

// ── Fixtures ───────────────────────────────────────────────────────────────
// Minimal drink shape matching cocktailService.normalizeDrink output —
// same shape the catalog stores, since it normalizes via that function.
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

// Drinks that appear across multiple tests.
const KAMIKAZE     = drink('11600', 'Kamikaze',     ['Vodka', 'Triple sec', 'Lime juice']);
const COSMO        = drink('11106', 'Cosmopolitan', ['Vodka', 'Triple sec', 'Lime juice', 'Cranberry juice']);
const VODKA_MARTINI = drink('11086', 'Vodka Martini', ['Vodka', 'Dry Vermouth', 'Olive']);
const MOJITO       = drink('11000', 'Mojito',       ['Light rum', 'Lime', 'Sugar', 'Mint', 'Soda water']);
// Catalog noise: drinks with no overlap with vodka-based queries. The new
// architecture scores against the WHOLE catalog, so we need fixtures that
// confirm zero-overlap drinks are correctly excluded from results.
const MARGARITA    = drink('11007', 'Margarita',    ['Tequila', 'Triple sec', 'Lime juice', 'Salt']);
const MANHATTAN    = drink('11008', 'Manhattan',    ['Whiskey', 'Sweet Vermouth', 'Bitters']);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 1: 1 ingredient input → returns drinks containing it
// (and DOES NOT return drinks that don't)
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — single ingredient', () => {
  it('returns drinks that contain the ingredient', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE, VODKA_MARTINI]);

    const out = await recommendDrinks(['vodka']);
    const names = out.map((d) => d.name).sort();
    expect(names).toEqual(['Kamikaze', 'Vodka Martini']);
  });

  // SCRUM-209 (catalog migration) — regression test for the "vodka returns
  // only Belmont" bug. The previous filter.php → lookup.php pipeline
  // silently dropped most candidates due to CocktailDB rate limiting.
  // The new catalog-backed engine has no I/O at request time and must
  // surface every matching drink regardless of catalog size.
  it('does not silently drop matching drinks at scale', async () => {
    // 50 vodka-containing drinks + 50 non-vodka drinks. Limit is 12.
    const vodkaDrinks = Array.from({ length: 50 }, (_, i) =>
      drink(`v${i}`, `Vodka Drink ${i}`, ['Vodka', `Mixer ${i}`])
    );
    const nonVodkaDrinks = Array.from({ length: 50 }, (_, i) =>
      drink(`n${i}`, `Non Drink ${i}`, ['Gin', `Mixer ${i}`])
    );
    cocktailCatalog.getDrinks.mockReturnValue([...vodkaDrinks, ...nonVodkaDrinks]);

    const out = await recommendDrinks(['vodka'], { limit: 12 });
    expect(out.length).toBe(12); // not 1, not 3 — the full requested limit
    expect(out.every((d) => d.name.startsWith('Vodka Drink'))).toBe(true);
  });

  it('excludes drinks with zero ingredient overlap', async () => {
    // Margarita has Tequila/Triple sec/Lime/Salt — no vodka. Manhattan
    // has Whiskey/Vermouth/Bitters — no vodka. Catalog also contains a
    // valid match (Vodka Martini). User asks for vodka.
    cocktailCatalog.getDrinks.mockReturnValue([VODKA_MARTINI, MARGARITA, MANHATTAN]);

    const out = await recommendDrinks(['vodka']);
    expect(out.map((d) => d.name)).toEqual(['Vodka Martini']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 2: multi-ingredient overlap → ranking
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — full-overlap ranking', () => {
  it('ranks the 3-of-3 drink first', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE, COSMO, VODKA_MARTINI]);

    const out = await recommendDrinks(['vodka', 'lime juice', 'triple sec']);

    expect(out.length).toBeGreaterThan(0);
    expect(out[0].name).toBe('Kamikaze');
    expect(out[0].matchedCount).toBe(3);
    expect(out[0].ingredientCount).toBe(3);
    expect(out[0].matchPercentage).toBe(1);
    expect(out[0].missingIngredients).toEqual([]);

    // Cosmo: 3/4 = 0.75
    const cosmo = out.find((d) => d.name === 'Cosmopolitan');
    expect(cosmo).toBeDefined();
    expect(cosmo.matchedCount).toBe(3);
    expect(cosmo.ingredientCount).toBe(4);
    expect(cosmo.missingIngredients).toEqual(['Cranberry juice']);
  });

  it('returns the documented response shape', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE]);

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
// Scenario 3: input validation → 400
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — input validation', () => {
  beforeEach(() => {
    // Catalog is populated for these tests, so the 503 path doesn't fire
    // before validation runs.
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE]);
  });

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
// Scenario 4: catalog not ready → 503 (boot race)
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — catalog not ready', () => {
  it('throws 503 when the catalog is empty', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([]);
    await expect(recommendDrinks(['vodka'])).rejects.toMatchObject({ status: 503 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 5: minMatchPercentage option (default 0; respected when passed)
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — minMatchPercentage option', () => {
  it('returns low-coverage drinks by default (no threshold filter)', async () => {
    // Mojito: 1/5 = 0.2 coverage with just 'lime'. Default threshold = 0,
    // so it should still surface.
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO]);

    const out = await recommendDrinks(['lime']);
    expect(out.find((d) => d.name === 'Mojito')).toBeDefined();
  });

  it('filters drinks below the threshold when option is passed', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO]);

    const out = await recommendDrinks(['lime'], { minMatchPercentage: 0.25 });
    expect(out.find((d) => d.name === 'Mojito')).toBeUndefined();
  });

  it('keeps drinks at or above the threshold when option is passed', async () => {
    // Kamikaze: 2/3 ≈ 0.67 ≥ 0.25.
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE]);

    const out = await recommendDrinks(['vodka', 'lime juice'], { minMatchPercentage: 0.25 });
    expect(out.find((d) => d.name === 'Kamikaze')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 6: rankDrinks — primary sort (pure function, unchanged behavior)
// ─────────────────────────────────────────────────────────────────────────
describe('rankDrinks — primary sort', () => {
  it('ranks by matchedCount even when matchPercentage favors a smaller drink', () => {
    const small = drink('A', 'Small Drink', ['Vodka', 'Soda']);
    const big   = drink('B', 'Big Drink',   ['Vodka', 'Lime juice', 'Triple sec', 'Sugar', 'Mint', 'Ice']);

    const ranked = rankDrinks(['vodka', 'lime juice', 'triple sec'], [small, big]);
    expect(ranked[0].name).toBe('Big Drink');
    expect(ranked[1].name).toBe('Small Drink');
    expect(ranked[0].matchedCount).toBeGreaterThan(ranked[1].matchedCount);
  });

  // SCRUM-209 regression test (from the original sort-inversion fix).
  it('ranks a 2-of-3 drink above a 1-of-1 drink with the same user input', () => {
    const vodkaNeat = drink('VN', 'Vodka Neat', ['Vodka']);
    const kamikaze  = drink('KZ', 'Kamikaze',  ['Vodka', 'Lime juice', 'Triple sec']);

    const ranked = rankDrinks(['vodka', 'lime juice'], [vodkaNeat, kamikaze]);
    expect(ranked[0].name).toBe('Kamikaze');
    expect(ranked[0].matchedCount).toBe(2);
    expect(ranked[1].name).toBe('Vodka Neat');
    expect(ranked[1].matchedCount).toBe(1);
    expect(ranked[1].matchPercentage).toBeGreaterThan(ranked[0].matchPercentage);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario 7: limit option
// ─────────────────────────────────────────────────────────────────────────
describe('recommendDrinks — limit option', () => {
  it('respects a custom limit', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([KAMIKAZE, COSMO]);

    const out = await recommendDrinks(['vodka', 'lime juice', 'triple sec'], { limit: 1 });
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('Kamikaze');
  });
});
