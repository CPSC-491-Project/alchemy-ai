// SCRUM-209 (extended): Tests for the cocktail catalog.
//
// Mocks global fetch so we don't hit CocktailDB. Verifies:
//   - loadCatalog dedupes by id and exposes drinks via getDrinks()
//   - per-letter failures are absorbed (returned as `errors`, not thrown)
//   - total failure throws and leaves the previous catalog in place
//   - status reporting (ready, count, lastRefreshedAt, lastRefreshError)

const cocktailCatalog = require('../services/cocktailCatalog');
const { _internal } = cocktailCatalog;

// Build a CocktailDB-shaped raw drink (pre-normalize). Ingredients up to 15 slots.
function rawDrink(idDrink, strDrink, ingredients) {
  const slots = {};
  ingredients.forEach((name, i) => {
    slots[`strIngredient${i + 1}`] = name;
    slots[`strMeasure${i + 1}`] = '1 oz';
  });
  return {
    idDrink,
    strDrink,
    strDrinkThumb: `https://example.com/${idDrink}.jpg`,
    strCategory: 'Cocktail',
    strAlcoholic: 'Alcoholic',
    strGlass: 'Highball',
    strInstructions: 'Mix.',
    ...slots,
  };
}

// fetch mock helper: per-letter response map. `null` value = throw.
function mockFetchByLetter(map) {
  global.fetch = jest.fn(async (url) => {
    const m = url.match(/search\.php\?f=([a-z])/);
    const letter = m ? m[1] : null;
    if (letter && Object.prototype.hasOwnProperty.call(map, letter)) {
      const drinks = map[letter];
      if (drinks === null) {
        return { ok: false, status: 503 };
      }
      return { ok: true, status: 200, json: async () => ({ drinks }) };
    }
    // letters not in the map → empty result (no drinks for that letter)
    return { ok: true, status: 200, json: async () => ({ drinks: null }) };
  });
}

beforeEach(() => {
  _internal._reset();
  jest.restoreAllMocks();
});

afterAll(() => {
  _internal._reset();
});

describe('cocktailCatalog.loadCatalog', () => {
  it('builds a Map from search.php and exposes drinks via getDrinks()', async () => {
    mockFetchByLetter({
      a: [rawDrink('1', 'Aviation', ['Gin', 'Maraschino'])],
      b: [rawDrink('2', 'Bee\'s Knees', ['Gin', 'Honey', 'Lemon'])],
    });

    const result = await cocktailCatalog.loadCatalog();
    expect(result.count).toBe(2);
    expect(result.errors).toEqual([]);

    const drinks = cocktailCatalog.getDrinks();
    expect(drinks.length).toBe(2);
    expect(drinks.map((d) => d.name).sort()).toEqual(["Aviation", "Bee's Knees"]);

    // Status reflects success.
    const status = cocktailCatalog.getStatus();
    expect(status.ready).toBe(true);
    expect(status.count).toBe(2);
    expect(status.lastRefreshedAt).toBeTruthy();
    expect(status.lastRefreshError).toBeNull();
  });

  it('dedupes drinks by id even if they appear under multiple letters', async () => {
    const cosmo = rawDrink('11106', 'Cosmopolitan', ['Vodka']);
    mockFetchByLetter({
      c: [cosmo],
      // intentionally same drink under another letter — defensive case
      d: [cosmo],
    });

    const result = await cocktailCatalog.loadCatalog();
    expect(result.count).toBe(1);
    expect(cocktailCatalog.getDrinks()).toHaveLength(1);
  });

  it('absorbs per-letter failures and continues with the rest', async () => {
    mockFetchByLetter({
      a: [rawDrink('1', 'Aviation', ['Gin'])],
      b: null, // 503 from CocktailDB
      c: [rawDrink('3', 'Caipirinha', ['Cachaça', 'Lime'])],
    });

    const result = await cocktailCatalog.loadCatalog();
    expect(result.count).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].letter).toBe('b');
  });

  it('throws if every letter fails (no drinks fetched)', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network unreachable');
    });

    await expect(cocktailCatalog.loadCatalog()).rejects.toThrow(/no drinks fetched/);
    expect(cocktailCatalog.getDrinks()).toEqual([]);
  });
});

describe('cocktailCatalog.refreshCatalog', () => {
  it('keeps the previous catalog if the refresh fails', async () => {
    // First load succeeds.
    mockFetchByLetter({ a: [rawDrink('1', 'Aviation', ['Gin'])] });
    await cocktailCatalog.loadCatalog();
    expect(cocktailCatalog.getDrinks()).toHaveLength(1);

    // Refresh fails entirely.
    global.fetch = jest.fn(async () => {
      throw new Error('network unreachable');
    });

    await expect(cocktailCatalog.refreshCatalog()).rejects.toThrow();

    // Previous catalog still in place.
    expect(cocktailCatalog.getDrinks()).toHaveLength(1);

    // Status records the error AND the previous successful refresh time.
    const status = cocktailCatalog.getStatus();
    expect(status.ready).toBe(true);
    expect(status.lastRefreshError).toBeTruthy();
    expect(status.lastRefreshError.message).toMatch(/no drinks fetched/);
  });

  it('records lastRefreshedAt on success', async () => {
    mockFetchByLetter({ a: [rawDrink('1', 'Aviation', ['Gin'])] });
    const before = Date.now();
    await cocktailCatalog.refreshCatalog();
    const status = cocktailCatalog.getStatus();
    expect(new Date(status.lastRefreshedAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(status.lastRefreshError).toBeNull();
  });
});

describe('cocktailCatalog.getStatus', () => {
  it('reports ready=false when the catalog is empty', () => {
    const status = cocktailCatalog.getStatus();
    expect(status.ready).toBe(false);
    expect(status.count).toBe(0);
  });
});
