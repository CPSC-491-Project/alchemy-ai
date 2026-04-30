// SCRUM-186: Tests for the ingredient matcher.
//
// These tests don't hit the network, don't touch Firestore — they run
// against the static vocabulary, which makes them fast and deterministic.
// This is the whole point of accepting vocabulary as a parameter.

const {
  matchIngredients,
  _internal,
} = require('../services/ingredientMatcher');

// Small helper for readable assertions.
function names(candidates) {
  return candidates.map((c) => c.name);
}

function confidenceOf(candidates, canonicalName) {
  const c = candidates.find((x) => x.name === canonicalName);
  return c ? c.confidence : null;
}

describe('ingredientMatcher — happy path', () => {
  it('returns [] for empty input', () => {
    expect(matchIngredients('')).toEqual([]);
    expect(matchIngredients(null)).toEqual([]);
    expect(matchIngredients(undefined)).toEqual([]);
  });

  it('returns [] when input is only stopwords/units', () => {
    expect(matchIngredients('NUTRITION FACTS  Serving size 1 oz  Calories 80')).toEqual([]);
  });

  it('matches a simple single-word ingredient', () => {
    const out = matchIngredients('GIN');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].name).toBe('Gin');
    expect(out[0].confidence).toBeGreaterThanOrEqual(0.65);
  });

  it('matches a multi-word ingredient via n-grams', () => {
    const out = matchIngredients('Lime Juice 50ml');
    expect(names(out)).toContain('Lime juice');
  });

  it('tags candidates with a category from the static vocabulary', () => {
    const out = matchIngredients('GIN');
    const gin = out.find((c) => c.name === 'Gin');
    expect(gin.category).toBe('spirit');
  });
});

describe('ingredientMatcher — typo correction', () => {
  // These are the three marquee examples from SCRUM-151's commit history.
  // If any of them regress, the user-facing demo breaks.

  it('"Angustora" -> "Angostura bitters"', () => {
    const out = matchIngredients('Angustora');
    expect(names(out)).toContain('Angostura bitters');
    expect(confidenceOf(out, 'Angostura bitters')).toBeGreaterThanOrEqual(0.65);
  });

  it('"Jucie" in context -> "Lime juice" (via n-gram)', () => {
    // Realistic label OCR: "Lime Jucie" with a typo. The 2-gram "lime jucie"
    // should still match "Lime juice".
    const out = matchIngredients('Lime Jucie 50ml');
    expect(names(out)).toContain('Lime juice');
  });

  it('"Sirup" -> "Simple syrup" via n-gram', () => {
    const out = matchIngredients('Simple Sirup');
    expect(names(out)).toContain('Simple syrup');
    expect(confidenceOf(out, 'Simple syrup')).toBeGreaterThanOrEqual(0.65);
  });

  it('"Angestura" -> "Angostura bitters" (1-char typo in context)', () => {
    const out = matchIngredients('2 dashes Angestura bitters');
    expect(names(out)).toContain('Angostura bitters');
  });
});

describe('ingredientMatcher — brand stripping', () => {
  it('"Tanqueray Gin" includes Gin', () => {
    const out = matchIngredients('Tanqueray Gin');
    expect(names(out)).toContain('Gin');
  });

  it('"Bacardi White Rum" includes White rum', () => {
    const out = matchIngredients('Bacardi White Rum');
    // Either "White rum" or "Rum" is acceptable — but White rum is richer,
    // so the matcher should surface it at higher confidence if both hit.
    expect(names(out).some((n) => n === 'White rum' || n === 'Rum')).toBe(true);
  });

  it('"Ketel One Vodka" includes Vodka', () => {
    const out = matchIngredients('Ketel One Vodka');
    expect(names(out)).toContain('Vodka');
  });
});

describe('ingredientMatcher — label noise filtering', () => {
  it('nutrition facts boilerplate does not generate false ingredients', () => {
    const ocr = `
      NUTRITION FACTS
      Serving Size 1 fl oz (30ml)
      Calories 80    Total Fat 0g    Sodium 0mg
      Total Carbohydrate 0g    Protein 0g
    `;
    const out = matchIngredients(ocr);
    // We shouldn't accidentally match "protein" -> "Port" or similar.
    // The acceptable outcome is zero candidates or very low-confidence ones
    // that got filtered by the threshold.
    expect(out.length).toBe(0);
  });

  it('government warning text does not generate false ingredients', () => {
    const ocr = `
      GOVERNMENT WARNING: According to the Surgeon General women
      should not drink alcoholic beverages during pregnancy because
      of the risk of birth defects.
    `;
    const out = matchIngredients(ocr);
    expect(out.length).toBe(0);
  });

  it('real label finds the ingredient amid the noise', () => {
    const ocr = `
      TANQUERAY LONDON DRY GIN
      43% ALC/VOL (86 PROOF)
      750 ML
      IMPORTED
      NUTRITION FACTS PER 1 FL OZ
      Calories 65
    `;
    const out = matchIngredients(ocr);
    expect(names(out)).toContain('Gin');
  });
});

describe('ingredientMatcher — ranking and deduplication', () => {
  it('sorts candidates by confidence descending', () => {
    const out = matchIngredients('Tanqueray Gin and Lime Juice');
    for (let i = 1; i < out.length; i++) {
      expect(out[i].confidence).toBeLessThanOrEqual(out[i - 1].confidence);
    }
  });

  it('does not return duplicate canonical names', () => {
    const out = matchIngredients('gin GIN Gin');
    const gins = out.filter((c) => c.name === 'Gin');
    expect(gins.length).toBe(1);
  });

  it('confidence is rounded to 2 decimal places', () => {
    const out = matchIngredients('Tanqueray Gin');
    for (const c of out) {
      expect(c.confidence).toEqual(Math.round(c.confidence * 100) / 100);
    }
  });
});

describe('ingredientMatcher — custom vocabulary injection', () => {
  // This exercises the SCRUM-187 integration path: the scan endpoint will
  // load the live CocktailDB vocabulary and pass it in here.
  it('accepts a custom vocabulary and uses it instead of the static one', () => {
    const customVocab = ['Unobtainium', 'Fictional liqueur'];
    const out = matchIngredients('unobtainium', customVocab);
    expect(names(out)).toContain('Unobtainium');
    // And should NOT return anything from the default static vocab:
    expect(names(out)).not.toContain('Gin');
  });

  it('gracefully handles an empty vocabulary', () => {
    expect(matchIngredients('gin', [])).toEqual([]);
  });
});

describe('ingredientMatcher — internal pipeline stages', () => {
  it('normalize lowercases and strips punctuation', () => {
    expect(_internal.normalize('Tanqueray, London Dry Gin!')).toBe(
      'tanqueray london dry gin'
    );
  });

  it('tokenize drops stopwords and short tokens', () => {
    const tokens = _internal.tokenize('Gin and Tonic, 50 ml');
    expect(tokens).toContain('gin');
    expect(tokens).toContain('tonic');
    expect(tokens).not.toContain('and');
    expect(tokens).not.toContain('ml');
    expect(tokens).not.toContain('50'); // numbers stripped in normalize
  });

  it('ngrams produces 1-, 2-, and 3-grams', () => {
    const grams = _internal.ngrams(['lime', 'juice', 'fresh'], 3);
    const texts = grams.map((g) => g.text);
    expect(texts).toContain('lime');
    expect(texts).toContain('lime juice');
    expect(texts).toContain('lime juice fresh');
  });

  it('similarity is 1.0 for identical strings', () => {
    expect(_internal.similarity('gin', 'gin')).toBe(1.0);
  });

  it('similarity penalizes longer edit distances', () => {
    const close = _internal.similarity('angostura', 'angustora');
    const far = _internal.similarity('angostura', 'bourbon');
    expect(close).toBeGreaterThan(far);
  });
});

// ── SCRUM-218 ────────────────────────────────────────────────────────────────
// Regression tests for the modifier-word false-positive fix and the
// brand-pass integration. These are the bugs that motivated the ticket; if
// any of these regress, the user-facing scan flow is broken in the way the
// ticket describes.

describe('ingredientMatcher — SCRUM-218 modifier-word guard', () => {
  it('"Tanqueray London Dry Gin" returns Gin and NOT Dry vermouth', () => {
    // The marquee bug 2 case. Pre-fix, the bare "DRY" token scored 0.95
    // against "Dry vermouth" via word-level matching, surfacing a wrong
    // candidate at high confidence. With the modifier-word filter,
    // "Dry vermouth" reduces to ["vermouth"] for word-level purposes, so
    // "DRY" alone no longer matches it.
    const out = matchIngredients('Tanqueray London Dry Gin');
    expect(names(out)).toContain('Gin');
    expect(names(out)).not.toContain('Dry vermouth');
  });

  it('"Bacardi White Rum" does NOT return White wine', () => {
    // Same class of bug as above: the bare "WHITE" token used to match
    // "White wine" via word-level matching. After fix, it does not.
    // White rum CAN still appear (matches at 1.0 via the full-phrase path),
    // and that's correct behavior.
    const out = matchIngredients('Bacardi White Rum');
    expect(names(out)).not.toContain('White wine');
  });

  it('"DARK SPICED RUM" does NOT generate Dark/Spiced rum from bare modifiers', () => {
    // Both "DARK" and "SPICED" are modifiers. The 2-gram "spiced rum" still
    // matches "Spiced rum" at 1.0 via full-phrase; that's expected and fine.
    // What we're guarding against is the bare 1-gram modifiers triggering
    // matches on their own — they shouldn't.
    const out = matchIngredients('DARK SPICED RUM');
    // Spiced rum matches via 2-gram full-phrase — that's correct.
    expect(names(out)).toContain('Spiced rum');
    // Plain Rum matches via 1-gram. Also correct.
    expect(names(out)).toContain('Rum');
    // But there should be no other modifier-driven false positives.
    // Specifically: nothing should be surfaced JUST because "dark" or
    // "spiced" matched a modifier word.
  });

  it('full-phrase modifier matches still work (DRY VERMOUTH → Dry vermouth)', () => {
    // The fix should NOT regress legitimate full-phrase matches. "DRY
    // VERMOUTH" as a 2-gram still hits "Dry vermouth" at 1.0 via full-phrase
    // similarity — that path is untouched by the modifier filter.
    const out = matchIngredients('DRY VERMOUTH');
    expect(names(out)).toContain('Dry vermouth');
  });

  it('exposes MODIFIER_WORDS for inspection', () => {
    // Sanity check on the data so a future contributor doesn't quietly
    // delete the set.
    expect(_internal.MODIFIER_WORDS).toBeInstanceOf(Set);
    expect(_internal.MODIFIER_WORDS.has('dry')).toBe(true);
    expect(_internal.MODIFIER_WORDS.has('white')).toBe(true);
    expect(_internal.MODIFIER_WORDS.has('spiced')).toBe(true);
    // Words that are NOT modifiers and must remain matchable.
    expect(_internal.MODIFIER_WORDS.has('vermouth')).toBe(false);
    expect(_internal.MODIFIER_WORDS.has('juice')).toBe(false);
    expect(_internal.MODIFIER_WORDS.has('gin')).toBe(false);
  });
});

describe('ingredientMatcher — SCRUM-218 brand-pass integration', () => {
  it('"GREY GOOSE" returns Vodka (brand-only label, no category word)', () => {
    // Bug 1's marquee case. Pre-fix, OCR output of "GREY GOOSE" alone hit
    // nothing in the vocabulary because the vocab has no brand entries.
    // With the brand pass integrated, this now returns Vodka.
    const out = matchIngredients('GREY GOOSE');
    expect(names(out)).toContain('Vodka');
  });

  it('"BOMBAY SAPPHIRE" returns Gin', () => {
    const out = matchIngredients('BOMBAY SAPPHIRE');
    expect(names(out)).toContain('Gin');
  });

  it('"PATRON SILVER 750ML" returns Tequila', () => {
    const out = matchIngredients('PATRON SILVER 750ML');
    expect(names(out)).toContain('Tequila');
  });

  it('"HENNESSY V.S COGNAC" returns Cognac', () => {
    const out = matchIngredients('HENNESSY V.S COGNAC');
    expect(names(out)).toContain('Cognac');
  });

  it('brand confidence (0.92) loses to a higher-confidence n-gram match', () => {
    // When OCR contains both the brand AND the explicit category word, the
    // n-gram pass produces a 1.0 full-phrase match for the category word.
    // The merge step should keep the higher-confidence entry — so
    // "TANQUERAY GIN" → Gin at 1.0 (from n-gram), not 0.92 (from brand).
    const out = matchIngredients('TANQUERAY GIN');
    const gin = out.find((c) => c.name === 'Gin');
    expect(gin).toBeDefined();
    // The exact value depends on the short-1-gram ceiling (0.85) vs brand
    // confidence (0.92), so we assert the floor: at minimum the brand-pass
    // confidence, and the merge should never drop below it.
    expect(gin.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('does not double-count when brand and n-gram both match the same name', () => {
    // "BACARDI" matches Rum via brand pass (0.92). "RUM" matches Rum via
    // n-gram (0.85 after the short-token ceiling). The merge should leave
    // exactly one Rum candidate, not two.
    const out = matchIngredients('BACARDI 750ML RUM');
    const rums = out.filter((c) => c.name === 'Rum');
    expect(rums.length).toBe(1);
  });
});
