// SCRUM-186: Ingredient matcher.
//
// Turns raw OCR text into a ranked list of CocktailDB ingredient candidates
// with confidence scores. Pure, deterministic, no I/O.
//
// Pipeline:
//   1. Brand pass (SCRUM-218): scan the raw text for known liquor brand
//      names and emit high-confidence candidates for those.
//   2. Normalize text (lowercase, strip punctuation/numbers).
//   3. Tokenize into words, drop stopwords and very short tokens.
//   4. Generate 1-, 2-, and 3-word n-grams from the remaining tokens.
//   5. For each n-gram, find the closest vocabulary entry via normalized
//      string distance (Levenshtein / max length).
//   6. Keep matches above a confidence threshold, dedupe by canonical name,
//      sort by confidence descending. Brand and n-gram results are merged
//      in this final dedupe step (best confidence wins per canonical name).
//
// Why n-grams: multi-word ingredients like "lime juice", "simple syrup",
// and "angostura bitters" don't match from a single token. A 1-gram pass
// alone would never find "lime juice" when the OCR reads "Lime Juice".
//
// Why Levenshtein over max-length (not raw edit distance): "Sirup" (5 chars,
// 1 edit from "syrup") and "Angustora" (9 chars, 1 edit from "Angostura")
// both have the same raw distance of 1, but the shorter string's similarity
// is proportionally lower. Normalizing by length lets us use a single
// threshold that works for both short and long ingredient names.
//
// Why a separate brand pass (SCRUM-218): bottles like Grey Goose, Patrón,
// and Bombay Sapphire don't print the category word ("vodka", "tequila",
// "gin") on the label, so OCR + n-gram matching alone returns nothing for
// them. The brand pass closes that gap with a hand-curated map. See
// data/brandToIngredient.js for the data and rationale.

const levenshtein = require('fast-levenshtein');

const { INGREDIENTS: STATIC_VOCAB, CATEGORY_BY_NAME } = require('../data/ingredientVocabulary');
const { STOPWORDS } = require('../data/stopwords');
const { matchBrands } = require('../data/brandToIngredient');

// ── Tuning knobs ───────────────────────────────────────────────────────────
const MIN_TOKEN_LEN = 3;       // drop 1-2 char tokens ("a", "in", "ml" after stopword pass)
const MAX_NGRAM = 3;           // consider 1-, 2-, 3-word n-grams
const MIN_CONFIDENCE = 0.65;   // below this = discard
const SHORT_NGRAM_PENALTY_LEN = 4; // 1-grams shorter than this get a confidence ceiling
const SHORT_NGRAM_CEILING = 0.85;  // ...because "rum" matches "rum" 1.0 but is too generic

// ── Modifier words (SCRUM-218) ─────────────────────────────────────────────
// Words that appear in multi-word vocab entries as descriptors rather than
// as the distinguishing head noun. The word-level matcher (below) skips
// these when picking out which vocab-entry words count as evidence.
//
// Why this exists: without the filter, a single OCR token "DRY" scores 0.95
// against "Dry vermouth" via word-level matching (the word "dry" matches
// "dry" perfectly, then × 0.95 penalty). That's a false positive — a "DRY"
// token alone is not evidence that the bottle contains vermouth; it's a
// modifier that could equally describe Dry gin, Dry whisky, etc. Same class
// of bug for "WHITE" → White rum/wine, "DARK" → Dark rum, "RED" → Red wine,
// "SWEET" → Sweet vermouth, "SPICED" → Spiced rum.
//
// After filtering: "Dry vermouth" reduces to ["vermouth"] for word-level
// purposes. OCR token "DRY" alone → no high-confidence match. OCR token
// "VERMOUTH" → still matches (head noun preserved). OCR phrase "DRY
// VERMOUTH" → still matches at 1.0 via the full-phrase path, which is
// untouched by this filter.
//
// What's NOT in here: words that are themselves distinguishing in their
// vocab entry (lime, lemon, orange, ginger, mint, coconut, etc.) and words
// that are vocab heads on their own (juice, water, syrup, beer, wine, milk,
// cream — these stay because they ARE the ingredient in many entries).
const MODIFIER_WORDS = new Set([
  // Colors
  'white', 'dark', 'red', 'blue', 'gold', 'green', 'black', 'pink', 'rose',
  // Tastes / styles
  'dry', 'sweet', 'sour', 'bitter',
  // Temperature / state
  'hot', 'cold', 'fresh',
  // Generic qualifiers
  'spiced', 'light', 'heavy', 'extra', 'aged',
  // Note: 'premium' is already in stopwords.js so it never reaches here,
  // but listing it would be harmless.
]);

// ── Normalization ──────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '')
    .toLowerCase()
    // strip non-letter, non-space — keeps apostrophes out too (cleaner matches)
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Tokenization ───────────────────────────────────────────────────────────
function tokenize(rawText) {
  const norm = normalize(rawText);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((t) => t.length >= MIN_TOKEN_LEN)
    .filter((t) => !STOPWORDS.has(t));
}

// ── N-gram generation ──────────────────────────────────────────────────────
function ngrams(tokens, maxN) {
  const out = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      out.push({
        text: tokens.slice(i, i + n).join(' '),
        n,
        sourceTokens: tokens.slice(i, i + n),
      });
    }
  }
  return out;
}

// ── Scoring ────────────────────────────────────────────────────────────────
// Similarity = 1 - (edit distance / max length). Already handled by
// fast-levenshtein-then-normalize. We additionally give a small bonus for
// exact word-level overlap so "Lime juice" → "Lime juice" beats "Lime" alone.
function similarity(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  const dist = levenshtein.get(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

// Scoring against a vocab entry considers two paths:
//   (a) full-phrase similarity — "lime juice" vs "Lime juice" = 1.0
//   (b) word-level similarity for multi-word entries — single OCR token
//       "Angustora" should find "Angostura bitters" via its "angostura" word.
// We take the max, but lightly penalize word-level so exact full-phrase
// matches still win ties.
//
// SCRUM-218: word-level matching now skips MODIFIER_WORDS so that an OCR
// token like "DRY" cannot score 0.95 against "Dry vermouth" via the modifier
// alone. The full-phrase path (a) is untouched, so "DRY VERMOUTH" as a
// 2-gram still matches at 1.0.
const WORD_LEVEL_PENALTY = 0.95;
const WORD_LEVEL_MIN_WORD_LEN = 4; // ignore filler words ("de", "of") inside entries

function similarityToVocabEntry(ngramText, vocabEntry) {
  const fullSim = similarity(ngramText, vocabEntry);

  const words = normalize(vocabEntry)
    .split(' ')
    .filter((w) => w.length >= WORD_LEVEL_MIN_WORD_LEN)
    .filter((w) => !MODIFIER_WORDS.has(w)); // SCRUM-218
  if (words.length <= 1) return fullSim;

  let bestWord = 0;
  for (const w of words) {
    const s = similarity(ngramText, w);
    if (s > bestWord) bestWord = s;
  }
  return Math.max(fullSim, bestWord * WORD_LEVEL_PENALTY);
}

// For each vocabulary entry, find the best-scoring n-gram.
// For each n-gram, find the best-scoring vocabulary entry.
// Return the union of both, deduped by vocabulary name, keeping the highest score.
function scoreAgainstVocabulary(ngramsList, vocabulary) {
  const best = new Map(); // canonical name -> { name, confidence, sourceTokens, category }

  for (const ng of ngramsList) {
    let bestVocab = null;
    let bestScore = 0;
    for (const vocabName of vocabulary) {
      const s = similarityToVocabEntry(ng.text, vocabName);
      if (s > bestScore) {
        bestScore = s;
        bestVocab = vocabName;
      }
    }
    if (!bestVocab) continue;

    // Penalize very short 1-grams — "rum" matches "Rum" at 1.0, but a
    // 3-letter match is evidence-light. Cap their confidence so a clean
    // "Tanqueray Gin" -> "Gin" match (3 chars) doesn't dominate real
    // multi-word hits.
    let confidence = bestScore;
    if (ng.n === 1 && ng.text.length < SHORT_NGRAM_PENALTY_LEN) {
      confidence = Math.min(confidence, SHORT_NGRAM_CEILING);
    }

    if (confidence < MIN_CONFIDENCE) continue;

    const key = bestVocab.toLowerCase();
    const existing = best.get(key);
    if (!existing || confidence > existing.confidence) {
      best.set(key, {
        name: bestVocab,
        confidence: Math.round(confidence * 100) / 100,
        sourceTokens: ng.sourceTokens,
        category: CATEGORY_BY_NAME[key] || null,
      });
    }
  }

  return Array.from(best.values()).sort((a, b) => b.confidence - a.confidence);
}

// SCRUM-218: merge brand-pass and n-gram results. Same canonical name in
// both → keep the entry with higher confidence. The n-gram pass already
// dedupes within itself; this is a second-level dedupe across the two
// sources. Final output is sorted by confidence descending.
function mergeCandidates(...lists) {
  const best = new Map();
  for (const list of lists) {
    for (const c of list) {
      const key = c.name.toLowerCase();
      const existing = best.get(key);
      if (!existing || c.confidence > existing.confidence) {
        best.set(key, c);
      }
    }
  }
  return Array.from(best.values()).sort((a, b) => b.confidence - a.confidence);
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Match ingredients from raw OCR text.
 * @param {string} rawText - Raw OCR output from GCV.
 * @param {string[]} [vocabulary] - Canonical ingredient names. Defaults to static fallback.
 * @returns {Array<{ name: string, confidence: number, sourceTokens: string[], category: string|null }>}
 */
function matchIngredients(rawText, vocabulary = STATIC_VOCAB) {
  if (!rawText || typeof rawText !== 'string') return [];
  if (!Array.isArray(vocabulary) || vocabulary.length === 0) return [];

  // SCRUM-218: brand pass first. Catches brand-forward bottles ("GREY GOOSE",
  // "PATRON SILVER") that the n-gram matcher alone can't find because the
  // category word isn't on the label. Cheap (single string scan, no
  // Levenshtein), so always-on with no flag.
  const brandHits = matchBrands(rawText);

  const tokens = tokenize(rawText);
  const ngramHits = tokens.length === 0
    ? []
    : scoreAgainstVocabulary(ngrams(tokens, MAX_NGRAM), vocabulary);

  return mergeCandidates(brandHits, ngramHits);
}

module.exports = {
  matchIngredients,
  // Exported for unit testing individual pipeline stages:
  _internal: {
    normalize,
    tokenize,
    ngrams,
    similarity,
    MIN_CONFIDENCE,
    MODIFIER_WORDS,
  },
};
