// SCRUM-210: Vibe Search service.
//
// One-shot natural-language cocktail discovery. Given a user vibe string
// like "refreshing for a hot day" or "fancy date night", asks Google Gemini
// to pick `limit` drinks from the in-memory cocktail catalog and return
// `[{ id, rationale }]`. We then hydrate the ids back to full drinks from
// the catalog, drop any unknown ids defensively, dedupe, and cap to limit.
//
// Why this lives separately from recommendationEngine.js:
//   recommendationEngine is a deterministic ingredient-overlap matcher —
//   pure, tested, no I/O. Vibe Search is an LLM-driven semantic matcher.
//   Different inputs (free-text vs ingredient list), different output
//   shape (rationale per result), different failure modes (LLM down,
//   invalid JSON, hallucinated ids). Keeping them separate avoids
//   bloating the engine with provider-specific concerns and keeps each
//   module independently testable.

const cocktailCatalog = require('./cocktailCatalog');

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const MAX_VIBE_LENGTH = 300; // characters; longer prompts get truncated client-side anyway
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Prompt building ───────────────────────────────────────────────────────

// Compact each drink to the smallest payload that still lets the LLM make
// sensible vibe-based picks. id is essential (we hydrate by it). name is
// essential (the LLM needs to know what it's picking). ingredients/category/
// alcoholic/glass are the signal the model uses to match flavor profile,
// occasion, and complexity to the user's vibe. Other fields (instructions,
// thumb, full measurements) would inflate token count without improving
// match quality.
function compactDrink(drink) {
  const ingredientNames = (drink.ingredients ?? [])
    .map((i) => i.name)
    .filter(Boolean)
    .join(', ');
  return {
    id: drink.id,
    name: drink.name,
    ingredients: ingredientNames,
    category: drink.category || '',
    alcoholic: drink.alcoholic || '',
    glass: drink.glass || '',
  };
}

function buildPrompt(vibe, limit, catalog) {
  const compactCatalog = catalog.map(compactDrink);
  return [
    `You are a cocktail recommendation expert. Given a user's vibe/mood/occasion description and a catalog of cocktails, select exactly ${limit} drinks that best fit the vibe.`,
    '',
    'Rules:',
    '- Pick drinks from the catalog only. Never invent or modify drinks.',
    '- Return EXACTLY the requested count of distinct drinks (no duplicates).',
    '- Order results best-fit first.',
    '- Each rationale must be ONE short sentence (max ~15 words) explaining why the drink fits the vibe. No marketing fluff.',
    '- Use only the `id` field from the catalog as your identifier — never make up new ids.',
    '',
    `User vibe: ${vibe}`,
    '',
    'Catalog (JSON):',
    JSON.stringify(compactCatalog),
  ].join('\n');
}

// ── Gemini call ───────────────────────────────────────────────────────────

// Strict JSON schema mode. Gemini honours this and returns parseable JSON
// in the first candidate's text part. We still defensively try/catch the
// parse — schema mode has been observed to occasionally drop fields under
// load.
const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      rationale: { type: 'STRING' },
    },
    required: ['id', 'rationale'],
  },
};

async function callGemini({ prompt, model, apiKey }) {
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      // Low temperature: this is a structured ranking task, not creative
      // writing. Determinism > flair.
      temperature: 0.4,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Read the error body if we can, but don't choke on non-JSON 5xx pages.
    let detail;
    try {
      const j = await response.json();
      detail = j?.error?.message;
    } catch {
      // ignore
    }
    const err = new Error(
      `Gemini ${response.status}${detail ? `: ${detail}` : ''}`
    );
    err.status = 502;
    err.upstreamStatus = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    const err = new Error('Gemini returned an empty response');
    err.status = 502;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error('Gemini returned invalid JSON despite schema');
    err.status = 502;
    err.rawText = text;
    throw err;
  }

  if (!Array.isArray(parsed)) {
    const err = new Error('Gemini response was not an array');
    err.status = 502;
    throw err;
  }

  return parsed;
}

// ── Hydration ─────────────────────────────────────────────────────────────

// Convert [{ id, rationale }] from the LLM into the response payload by
// looking up each id in the catalog. Drops unknown ids (hallucinations),
// dedupes by id, and caps to limit.
function hydrate(llmPicks, catalog, limit) {
  const byId = new Map(catalog.map((d) => [String(d.id), d]));
  const seen = new Set();
  const results = [];

  for (const pick of llmPicks) {
    const rawId = pick?.id;
    const id = rawId !== undefined && rawId !== null ? String(rawId) : null;
    if (!id || seen.has(id)) continue;
    const drink = byId.get(id);
    if (!drink) continue; // unknown id — Gemini hallucinated or mistyped
    seen.add(id);
    results.push({
      id: drink.id,
      name: drink.name,
      thumbnail: drink.thumb,
      category: drink.category,
      alcoholic: drink.alcoholic,
      glass: drink.glass,
      ingredientCount: (drink.ingredients ?? []).length,
      rationale: typeof pick.rationale === 'string' ? pick.rationale.trim() : '',
    });
    if (results.length >= limit) break;
  }

  return results;
}

// ── Public: full pipeline ─────────────────────────────────────────────────

async function vibeSearch(vibe, opts = {}) {
  // ── Input validation ─────────────────────────────────────────────────
  if (typeof vibe !== 'string') {
    throw Object.assign(new Error('vibe must be a string'), { status: 400 });
  }
  const cleanedVibe = vibe.trim();
  if (cleanedVibe.length === 0) {
    throw Object.assign(new Error('vibe must not be empty'), { status: 400 });
  }
  if (cleanedVibe.length > MAX_VIBE_LENGTH) {
    throw Object.assign(
      new Error(`vibe must be at most ${MAX_VIBE_LENGTH} characters`),
      { status: 400 }
    );
  }

  const requestedLimit = typeof opts.limit === 'number' ? opts.limit : DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(requestedLimit)));

  // ── Catalog readiness ────────────────────────────────────────────────
  const catalog = cocktailCatalog.getDrinks();
  if (catalog.length === 0) {
    throw Object.assign(
      new Error('Cocktail catalog is not ready yet. Please try again in a moment.'),
      { status: 503 }
    );
  }

  // ── Provider config (allow injection for tests) ──────────────────────
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  const model = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  if (!apiKey) {
    throw Object.assign(
      new Error('GEMINI_API_KEY is not configured on the server'),
      { status: 500 }
    );
  }

  // ── LLM call + hydration ─────────────────────────────────────────────
  const prompt = buildPrompt(cleanedVibe, limit, catalog);
  const llmPicks = await callGemini({ prompt, model, apiKey });
  const results = hydrate(llmPicks, catalog, limit);

  if (results.length === 0) {
    // Either Gemini returned an empty array, or every id it returned was
    // unknown to the catalog. Both are a server-side problem from the
    // user's perspective — they typed a valid vibe and got nothing back.
    throw Object.assign(
      new Error('No matching drinks found for that vibe. Please try rephrasing.'),
      { status: 502 }
    );
  }

  return results;
}

module.exports = {
  vibeSearch,
  // Exported for direct testing without a live Gemini key:
  _internal: {
    DEFAULT_MODEL,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    MAX_VIBE_LENGTH,
    compactDrink,
    buildPrompt,
    callGemini,
    hydrate,
    RESPONSE_SCHEMA,
  },
};
