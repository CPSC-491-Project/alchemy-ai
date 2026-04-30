// SCRUM-210: Tests for the Vibe Search service.
//
// Mocks cocktailCatalog (so we control the universe of drinks) and the
// global fetch (so we control Gemini's response). Each test sets up a
// scenario and asserts the service's behavior. No live Gemini calls.

jest.mock('../services/cocktailCatalog');

const cocktailCatalog = require('../services/cocktailCatalog');
const { vibeSearch, _internal } = require('../services/vibeSearch');
const { compactDrink, buildPrompt, hydrate } = _internal;

// ── Fixtures ───────────────────────────────────────────────────────────────
const drink = (id, name, ingredients, extra = {}) => ({
  id,
  name,
  thumb: `https://example.com/${id}.jpg`,
  category: 'Cocktail',
  alcoholic: 'Alcoholic',
  glass: 'Highball',
  instructions: 'Mix.',
  ingredients: ingredients.map((n) => ({ name: n, measure: '1 oz' })),
  ...extra,
});

const MOJITO    = drink('11000', 'Mojito',       ['Light rum', 'Lime', 'Sugar', 'Mint', 'Soda water']);
const MARGARITA = drink('11007', 'Margarita',    ['Tequila', 'Triple sec', 'Lime juice', 'Salt']);
const NEGRONI   = drink('11008', 'Negroni',      ['Gin', 'Campari', 'Sweet Vermouth']);

// Build a fake Gemini API response wrapping a JSON-string body.
function geminiResponse(arrayPayload) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(arrayPayload) }] } },
      ],
    }),
  };
}

// Build a Gemini API error response.
function geminiErrorResponse(status, message = 'upstream error') {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = 'fake-test-key';
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
});

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers — no fetch, no catalog
// ─────────────────────────────────────────────────────────────────────────

describe('compactDrink', () => {
  it('strips down to the LLM-relevant fields and joins ingredients', () => {
    const c = compactDrink(MOJITO);
    expect(c).toEqual({
      id: '11000',
      name: 'Mojito',
      ingredients: 'Light rum, Lime, Sugar, Mint, Soda water',
      category: 'Cocktail',
      alcoholic: 'Alcoholic',
      glass: 'Highball',
    });
    // Should NOT carry instructions or measures.
    expect(c).not.toHaveProperty('instructions');
    expect(c).not.toHaveProperty('thumb');
  });
});

describe('buildPrompt', () => {
  it('includes the vibe, the limit, and the catalog as JSON', () => {
    const prompt = buildPrompt('refreshing summer drink', 6, [MOJITO, MARGARITA]);
    expect(prompt).toMatch(/refreshing summer drink/);
    expect(prompt).toMatch(/exactly 6 drinks/);
    expect(prompt).toMatch(/Mojito/);
    expect(prompt).toMatch(/Margarita/);
    // Sanity: catalog payload is valid JSON inside the prompt
    const jsonMatch = prompt.match(/\[\{.*\}\]/s);
    expect(jsonMatch).toBeTruthy();
    expect(() => JSON.parse(jsonMatch[0])).not.toThrow();
  });
});

describe('hydrate', () => {
  const catalog = [MOJITO, MARGARITA, NEGRONI];

  it('hydrates ids back to full drinks with rationales', () => {
    const picks = [
      { id: '11000', rationale: 'Cool and minty.' },
      { id: '11007', rationale: 'Bright and citrusy.' },
    ];
    const out = hydrate(picks, catalog, 6);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: '11000', name: 'Mojito', rationale: 'Cool and minty.' });
    expect(out[1]).toMatchObject({ id: '11007', name: 'Margarita', rationale: 'Bright and citrusy.' });
  });

  it('drops unknown (hallucinated) ids silently', () => {
    const picks = [
      { id: '11000', rationale: 'fits' },
      { id: '99999', rationale: 'does not exist' },
      { id: '11008', rationale: 'fits' },
    ];
    const out = hydrate(picks, catalog, 6);
    expect(out.map((d) => d.id)).toEqual(['11000', '11008']);
  });

  it('dedupes repeated ids', () => {
    const picks = [
      { id: '11000', rationale: 'first' },
      { id: '11000', rationale: 'duplicate' },
      { id: '11008', rationale: 'distinct' },
    ];
    const out = hydrate(picks, catalog, 6);
    expect(out).toHaveLength(2);
    expect(out[0].rationale).toBe('first'); // the first occurrence wins
  });

  it('caps to limit even if the LLM returns more', () => {
    const picks = [
      { id: '11000', rationale: 'a' },
      { id: '11007', rationale: 'b' },
      { id: '11008', rationale: 'c' },
    ];
    const out = hydrate(picks, catalog, 2);
    expect(out).toHaveLength(2);
  });

  it('coerces numeric ids and missing-rationale safely', () => {
    const numericIdDrink = { ...MOJITO, id: 11000 }; // numeric instead of string
    const picks = [
      { id: 11000, rationale: undefined },
      { id: '11007' /* no rationale at all */ },
    ];
    const out = hydrate(picks, [numericIdDrink, MARGARITA], 6);
    expect(out).toHaveLength(2);
    expect(out[0].rationale).toBe(''); // defaulted
    expect(out[1].rationale).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Full pipeline — mocks fetch + catalog
// ─────────────────────────────────────────────────────────────────────────

describe('vibeSearch — happy path', () => {
  it('calls Gemini, hydrates, and returns the documented shape', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO, MARGARITA, NEGRONI]);
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse([
        { id: '11000', rationale: 'Mint and lime — built for hot weather.' },
        { id: '11007', rationale: 'Bright citrus, classic patio drink.' },
      ])
    );

    const out = await vibeSearch('something refreshing for a hot day');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: '11000',
      name: 'Mojito',
      thumbnail: expect.any(String),
      rationale: 'Mint and lime — built for hot weather.',
    });
    // Sanity: fetch was hit exactly once with a Gemini-shaped URL.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/generativelanguage\.googleapis\.com/);
    expect(url).toMatch(/key=fake-test-key/);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toMatch(/something refreshing for a hot day/);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('respects a custom limit and clamps it to MAX_LIMIT', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO, MARGARITA, NEGRONI]);
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse([
        { id: '11000', rationale: 'a' },
        { id: '11007', rationale: 'b' },
        { id: '11008', rationale: 'c' },
      ])
    );

    // Way over MAX_LIMIT (12); should silently clamp.
    const out = await vibeSearch('anything', { limit: 999 });
    expect(out.length).toBeLessThanOrEqual(12);
    // Verify the prompt asks for the clamped count, not the raw 999.
    const promptText = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(promptText).toMatch(/exactly 12 drinks/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Validation paths
// ─────────────────────────────────────────────────────────────────────────

describe('vibeSearch — input validation', () => {
  beforeEach(() => {
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO]);
  });

  it('throws 400 on non-string vibe', async () => {
    await expect(vibeSearch(123)).rejects.toMatchObject({ status: 400 });
    await expect(vibeSearch(null)).rejects.toMatchObject({ status: 400 });
    await expect(vibeSearch(undefined)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 on empty/whitespace vibe', async () => {
    await expect(vibeSearch('')).rejects.toMatchObject({ status: 400 });
    await expect(vibeSearch('   ')).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 on overly long vibe', async () => {
    const longVibe = 'a'.repeat(301);
    await expect(vibeSearch(longVibe)).rejects.toMatchObject({ status: 400 });
  });
});

describe('vibeSearch — catalog readiness', () => {
  it('throws 503 when the catalog is empty', async () => {
    cocktailCatalog.getDrinks.mockReturnValue([]);
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 503 });
  });
});

describe('vibeSearch — provider config', () => {
  it('throws 500 when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO]);
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 500 });
  });

  it('accepts an injected apiKey/model for tests', async () => {
    delete process.env.GEMINI_API_KEY;
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO]);
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse([{ id: '11000', rationale: 'fits' }])
    );

    const out = await vibeSearch('anything', { apiKey: 'injected', model: 'gemini-test-model' });
    expect(out).toHaveLength(1);
    expect(global.fetch.mock.calls[0][0]).toMatch(/gemini-test-model/);
    expect(global.fetch.mock.calls[0][0]).toMatch(/key=injected/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Upstream error handling — the LLM's many failure modes
// ─────────────────────────────────────────────────────────────────────────

describe('vibeSearch — Gemini failures', () => {
  beforeEach(() => {
    cocktailCatalog.getDrinks.mockReturnValue([MOJITO, MARGARITA]);
  });

  it('throws 502 on Gemini non-2xx (rate limit, server error, etc.)', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiErrorResponse(429, 'rate limited'));
    await expect(vibeSearch('anything')).rejects.toMatchObject({
      status: 502,
      upstreamStatus: 429,
    });
  });

  it('throws 502 when Gemini response is missing the text part', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    });
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 502 });
  });

  it('throws 502 when Gemini returns invalid JSON despite schema mode', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'this is not json' }] } }],
      }),
    });
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 502 });
  });

  it('throws 502 when Gemini returns a non-array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"not": "array"}' }] } }],
      }),
    });
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 502 });
  });

  it('throws 502 when every id is hallucinated (no usable results)', async () => {
    // Gemini returns ids that aren't in the catalog. After hydration,
    // results is empty — that's a 502 from the user's perspective.
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse([
        { id: 'made-up-1', rationale: 'fake' },
        { id: 'made-up-2', rationale: 'fake' },
      ])
    );
    await expect(vibeSearch('anything')).rejects.toMatchObject({ status: 502 });
  });

  it('returns partial results when SOME ids are hallucinated', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse([
        { id: '11000', rationale: 'real' },
        { id: 'made-up', rationale: 'fake' },
        { id: '11007', rationale: 'real' },
      ])
    );
    const out = await vibeSearch('anything');
    expect(out.map((d) => d.id)).toEqual(['11000', '11007']);
  });
});
