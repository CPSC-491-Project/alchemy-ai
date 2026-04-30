// SCRUM-218: Brand-name → canonical ingredient mapping.
//
// Solves the "vodka bottle isn't recognized" bug from SCRUM-151. The existing
// pipeline reads OCR text off a bottle (e.g. "GREY GOOSE", "PATRÓN SILVER",
// "BOMBAY SAPPHIRE") and feeds it through ingredientMatcher.js, whose
// vocabulary contains only generic CocktailDB names ("Vodka", "Gin",
// "Tequila") with zero brand entries. Result: brand-forward labels that
// don't print the category word return no candidates.
//
// This module supplies a curated brand → canonical-name map and a
// matchBrands() helper. Hits are returned in the same shape as
// ingredientMatcher's output so the route can merge results with a single
// dedupe pass.
//
// Confidence policy
// -----------------
// Brand hits get a fixed 0.92. Brands are highly specific — if OCR genuinely
// reads "TANQUERAY", we're confident this is gin. We don't go to 1.0 because
// (a) OCR misreads happen and (b) some brand strings are ambiguous outside
// the bar context ("patron" the loyalty program vs. "Patrón" the tequila).
// 0.92 also leaves headroom below an exact full-phrase OCR match (1.0).
//
// Coverage policy
// ---------------
// Mainstream brands only — roughly the top ~100 spirits and liqueurs anyone
// is likely to have on a home bar. We're not trying to cover every craft
// distillery; that's a long tail where false-positive risk outweighs the
// recognition gain. Exhaustive coverage belongs in a future image-
// classification model, not a hand-curated map.
//
// Maintenance
// -----------
// Keys must be lowercase and contain only letters + single spaces (matching
// the normalize() output below). The IIFE at the bottom validates this and
// throws on duplicates at module load — bad data fails fast, not at request
// time.

const { CATEGORY_BY_NAME } = require('./ingredientVocabulary');

// Each key is a canonical ingredient name from ingredientVocabulary.js.
// Each value is a list of brand strings already in normalized form.
//
// IMPORTANT: brand strings must be unique across the whole map. Two
// ingredients claiming the same brand is almost always a copy-paste bug.
// The build step at the bottom of this file throws if it sees one.
const BRANDS_BY_INGREDIENT = {
  // ── Spirits ──────────────────────────────────────────────────────────────
  'Vodka': [
    'absolut', 'tito', 'titos', 'grey goose', 'smirnoff', 'belvedere',
    'ketel one', 'stolichnaya', 'stoli', 'skyy', 'svedka', 'pinnacle',
    'reyka', 'effen', 'chopin', 'russian standard', 'crystal head',
    'ciroc', 'three olives',
  ],
  'Gin': [
    // 'hendrick' (singular) covers OCR of "HENDRICK'S" — the apostrophe
    // strip in normalize() leaves the trailing "s" as its own token.
    'tanqueray', 'bombay sapphire', 'hendrick', 'hendricks', 'beefeater',
    'gordons gin', 'plymouth gin', 'aviation gin', 'the botanist',
    'sipsmith', 'roku gin', 'nolets', 'fords gin', 'empress gin',
    'seagrams gin',
  ],
  'White rum': [
    'bacardi superior', 'don q', 'havana club blanco',
  ],
  'Dark rum': [
    'goslings black seal', 'myers rum',
  ],
  'Spiced rum': [
    'captain morgan', 'sailor jerry', 'kraken',
  ],
  'Rum': [
    'bacardi', 'havana club', 'mount gay', 'plantation rum', 'diplomatico',
    'flor de cana', 'el dorado', 'appleton estate', 'brugal', 'pyrat',
    'cruzan',
  ],
  'Tequila': [
    'patron', 'don julio', 'casamigos', 'jose cuervo', 'herradura',
    'espolon', 'tres generaciones', 'milagro', 'tromba', 'hornitos',
    'el jimador', 'el tesoro', 'fortaleza', 'tequila ocho',
  ],
  'Mezcal': [
    'del maguey', 'montelobos', 'ilegal mezcal', 'los amantes',
    'vida mezcal',
  ],
  'Bourbon': [
    'jim beam', 'makers mark', 'wild turkey', 'bulleit bourbon',
    'buffalo trace', 'woodford reserve', 'knob creek', 'four roses',
    'eagle rare', 'old forester', 'evan williams', 'elijah craig',
    'basil hayden', 'angels envy', 'jeffersons',
  ],
  'Rye whiskey': [
    'rittenhouse', 'sazerac rye', 'whistlepig', 'bulleit rye',
    'high west',
  ],
  'Whiskey': [
    'jack daniels', 'jameson', 'bushmills', 'tullamore dew',
    'redbreast', 'powers irish', 'crown royal',
  ],
  'Scotch': [
    'johnnie walker', 'macallan', 'glenlivet', 'glenfiddich', 'lagavulin',
    'laphroaig', 'ardbeg', 'talisker', 'highland park', 'balvenie',
    'oban', 'dalmore', 'chivas regal', 'dewars', 'famous grouse',
    'cutty sark', 'glenmorangie', 'monkey shoulder', 'compass box',
  ],
  'Cognac': [
    'hennessy', 'remy martin', 'martell', 'courvoisier', 'camus cognac',
  ],
  'Brandy': [
    'christian brothers', 'korbel brandy', 'paul masson',
  ],

  // ── Liqueurs ─────────────────────────────────────────────────────────────
  // Many liqueur entries in the vocabulary ARE the brand name (Cointreau,
  // Drambuie, Kahlua) — but OCR can still benefit from a brand-pass hit
  // because the existing matcher's word-level rule needs the OCR token to be
  // ≥4 chars AND in the vocab; brand-pass is more direct.
  'Cointreau': ['cointreau'],
  'Grand marnier': ['grand marnier'],
  'Triple sec': ['combier', 'gabriel boudier triple sec'],
  'Kahlua': ['kahlua'],
  'Baileys irish cream': ['baileys', 'baileys original'],
  'Amaretto': ['disaronno', 'lazzaroni amaretto'],
  'Chambord': ['chambord'],
  'Drambuie': ['drambuie'],
  'Galliano': ['galliano'],
  'Jagermeister': ['jagermeister', 'jager'],
  'Sambuca': ['romana sambuca', 'molinari sambuca'],
  'Southern comfort': ['southern comfort'],
  'Aperol': ['aperol'],
  'Campari': ['campari'],
  'St germain': ['st germain'],
  'Limoncello': ['limoncello', 'pallini limoncello'],
  'Fernet branca': ['fernet branca', 'fernet'],
  'Pimms': ['pimms'],
  'Midori melon liqueur': ['midori'],
  'Chartreuse': ['chartreuse'],
  'Benedictine': ['benedictine'],
  'Tia maria': ['tia maria'],
  'Malibu rum': ['malibu'],
  'Frangelico': ['frangelico'],

  // ── Vermouth ─────────────────────────────────────────────────────────────
  // Generic Martini/Cinzano without the dry/rosso variant on the label
  // falls back to plain Vermouth — better than guessing wrong between
  // dry and sweet.
  'Vermouth': ['martini rossi', 'cinzano', 'noilly prat'],
  'Dry vermouth': ['dolin dry', 'noilly prat dry'],
  'Sweet vermouth': ['carpano antica', 'cinzano rosso', 'martini rosso'],

  // ── Wine / sparkling ─────────────────────────────────────────────────────
  'Champagne': [
    'moet chandon', 'veuve clicquot', 'dom perignon', 'krug bollinger',
    'taittinger', 'pol roger', 'laurent perrier',
  ],
  'Prosecco': ['la marca prosecco', 'mionetto'],
};

// Confidence applied to all brand hits. See module-header for rationale.
const BRAND_CONFIDENCE = 0.92;

// ── Internal validation + flat lookup build ────────────────────────────────
// Runs once at module load. Throws on any malformed key OR duplicate brand
// across categories — both are bugs we want to catch in CI, not at runtime.
const VALID_KEY = /^[a-z]+( [a-z]+)*$/;

const BRAND_TO_INGREDIENT = (() => {
  const out = Object.create(null);
  for (const [ingredient, brands] of Object.entries(BRANDS_BY_INGREDIENT)) {
    for (const brand of brands) {
      if (!VALID_KEY.test(brand)) {
        throw new Error(
          `[brandToIngredient] Invalid brand key "${brand}" — must be ` +
            `lowercase letters and single spaces only (no digits, no apostrophes).`
        );
      }
      if (out[brand]) {
        throw new Error(
          `[brandToIngredient] Duplicate brand "${brand}" maps to both ` +
            `"${out[brand]}" and "${ingredient}"`
        );
      }
      out[brand] = ingredient;
    }
  }
  return out;
})();

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Normalize OCR text for brand matching. Mirrors ingredientMatcher.js's
 * normalize() exactly so brand keys (already in normalized form) compare
 * cleanly against OCR output.
 */
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find brand mentions in OCR text and return ingredient candidates.
 *
 * Matching strategy: word-bounded substring match on the normalized text.
 * "tito" matches "TITO'S HANDMADE VODKA" (normalized: "tito s handmade
 * vodka") because "tito" sits between word boundaries. "grey goose" matches
 * "FRENCH VODKA GREY GOOSE" because the two-word string appears as a
 * contiguous run.
 *
 * Sort order is undefined here — the route merges these with the regular
 * matcher's output and re-sorts by confidence descending, so order in
 * isolation doesn't matter.
 *
 * @param {string} rawText - Raw OCR output (any case, any punctuation).
 * @returns {Array<{name: string, confidence: number, sourceTokens: string[],
 *   category: string|null}>} Same shape as ingredientMatcher's output. One
 *   entry per unique canonical name; if multiple brands for the same
 *   ingredient appear in the text, the longer key wins (more specific).
 */
function matchBrands(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const normalized = normalize(rawText);
  if (!normalized) return [];

  // Pad with spaces so a leading/trailing brand still has word-boundary
  // context for the simple substring check below — saves us a regex per
  // brand on every call.
  //
  // `working` is a mutable copy that we scrub matched spans out of as we go,
  // so a longer brand match (e.g. "bacardi superior") prevents a shorter
  // overlapping key (plain "bacardi") from also firing. Without this, a
  // single bottle would surface both White rum AND Rum candidates.
  let working = ` ${normalized} `;

  // Iterate in descending key length so multi-word brands match before any
  // shorter prefix could (e.g. "bombay sapphire" before a hypothetical
  // "bombay" entry). Ties broken alphabetically for determinism.
  const sortedBrands = Object.keys(BRAND_TO_INGREDIENT).sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a.localeCompare(b);
  });

  const seen = new Set(); // canonical ingredient name (lowercase)
  const results = [];

  for (const brand of sortedBrands) {
    const needle = ` ${brand} `;
    if (!working.includes(needle)) continue;

    // Scrub every occurrence of this brand from the working text so
    // shorter overlapping keys can't re-match the same span. Replace with
    // a single space — preserves word-boundary structure for the keys we
    // haven't checked yet.
    while (working.includes(needle)) {
      working = working.replace(needle, ' ');
    }

    const ingredient = BRAND_TO_INGREDIENT[brand];
    const key = ingredient.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      name: ingredient,
      confidence: BRAND_CONFIDENCE,
      sourceTokens: brand.split(' '),
      category: CATEGORY_BY_NAME[key] || null,
    });
  }

  return results;
}

module.exports = {
  matchBrands,
  BRANDS_BY_INGREDIENT,
  BRAND_TO_INGREDIENT,
  BRAND_CONFIDENCE,
};
