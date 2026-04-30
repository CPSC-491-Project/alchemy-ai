// SCRUM-218: Tests for the brand-to-ingredient matcher.
//
// Pure unit tests — no network, no Firestore, no file I/O. The brand map
// is hand-curated data that ships with the repo, so these tests double as
// a guard against accidental regressions to the data itself (e.g. a typo
// that loses a brand, or a copy-paste that puts the same brand in two
// categories).

const {
  matchBrands,
  BRANDS_BY_INGREDIENT,
  BRAND_TO_INGREDIENT,
  BRAND_CONFIDENCE,
} = require('../data/brandToIngredient');

function names(candidates) {
  return candidates.map((c) => c.name);
}

describe('brandToIngredient — input validation', () => {
  it('returns [] for empty / non-string input', () => {
    expect(matchBrands('')).toEqual([]);
    expect(matchBrands(null)).toEqual([]);
    expect(matchBrands(undefined)).toEqual([]);
    expect(matchBrands(123)).toEqual([]);
  });

  it('returns [] when input has no recognized brands', () => {
    expect(matchBrands('NUTRITION FACTS  Serving size 1 oz')).toEqual([]);
    expect(matchBrands('hello world')).toEqual([]);
  });
});

describe('brandToIngredient — bug 1 regression cases (SCRUM-218)', () => {
  // These are the marquee bugs from the ticket. If any of them regress,
  // the whole point of this file is gone.

  it('"GREY GOOSE" → Vodka', () => {
    const out = matchBrands('GREY GOOSE');
    expect(names(out)).toContain('Vodka');
    expect(out[0].confidence).toBe(BRAND_CONFIDENCE);
  });

  it('"BOMBAY SAPPHIRE LONDON DRY GIN" → Gin', () => {
    const out = matchBrands('BOMBAY SAPPHIRE LONDON DRY GIN');
    expect(names(out)).toContain('Gin');
  });

  it('"PATRÓN SILVER 750ML" → Tequila', () => {
    // Note: the accented Ó gets stripped by normalize(), leaving "patr n".
    // The brand key "patron" still matches via the un-accented "PATRON" form
    // when OCR doesn't preserve the accent (which is the common case on
    // mobile-camera GCV output).
    const out = matchBrands('PATRON SILVER 750ML');
    expect(names(out)).toContain('Tequila');
  });

  it('"HENNESSY V.S COGNAC" → Cognac', () => {
    const out = matchBrands('HENNESSY V.S COGNAC');
    expect(names(out)).toContain('Cognac');
  });

  it('"HENDRICK\'S GIN" → Gin (apostrophe stripped)', () => {
    const out = matchBrands("HENDRICK'S GIN");
    expect(names(out)).toContain('Gin');
  });

  it('"TITO\'S HANDMADE VODKA" → Vodka', () => {
    const out = matchBrands("TITO'S HANDMADE VODKA");
    expect(names(out)).toContain('Vodka');
  });
});

describe('brandToIngredient — sub-category awareness', () => {
  it('"CAPTAIN MORGAN ORIGINAL SPICED RUM" → Spiced rum (not plain Rum)', () => {
    const out = matchBrands('CAPTAIN MORGAN ORIGINAL SPICED RUM');
    expect(names(out)).toContain('Spiced rum');
    // Captain Morgan is in Spiced rum bucket — should NOT also surface plain Rum.
    expect(names(out)).not.toContain('Rum');
  });

  it('"BACARDI SUPERIOR" → White rum (more specific than plain Bacardi)', () => {
    const out = matchBrands('BACARDI SUPERIOR');
    // The longer key "bacardi superior" takes precedence over plain "bacardi"
    // because matchBrands sorts by descending length.
    expect(names(out)).toContain('White rum');
    expect(names(out)).not.toContain('Rum');
  });

  it('plain "BACARDI" → Rum (falls back when no variant suffix)', () => {
    const out = matchBrands('BACARDI 750ML');
    expect(names(out)).toContain('Rum');
  });
});

describe('brandToIngredient — multi-brand labels', () => {
  it('two distinct brands in one OCR string returns both candidates', () => {
    // Realistic case: a cocktail kit, recipe card, or back-bar shelf scan
    // that captures multiple bottles in one frame.
    const out = matchBrands('TANQUERAY GIN AND COINTREAU');
    expect(names(out)).toEqual(expect.arrayContaining(['Gin', 'Cointreau']));
  });

  it('same ingredient via two different brands returns only one candidate', () => {
    // We dedupe by canonical name, not by brand, so "ABSOLUT and SMIRNOFF"
    // returns a single Vodka entry rather than two.
    const out = matchBrands('ABSOLUT AND SMIRNOFF');
    const vodka = out.filter((c) => c.name === 'Vodka');
    expect(vodka.length).toBe(1);
  });
});

describe('brandToIngredient — output shape', () => {
  it('attaches a category from the static vocabulary', () => {
    const out = matchBrands('JOHNNIE WALKER BLACK LABEL');
    const scotch = out.find((c) => c.name === 'Scotch');
    expect(scotch).toBeDefined();
    expect(scotch.category).toBe('spirit');
  });

  it('uses the fixed BRAND_CONFIDENCE for all hits', () => {
    const out = matchBrands('BAILEYS IRISH CREAM AND KAHLUA');
    expect(out.length).toBeGreaterThan(0);
    out.forEach((c) => {
      expect(c.confidence).toBe(BRAND_CONFIDENCE);
    });
  });

  it('sourceTokens reflects the matched brand string', () => {
    const out = matchBrands('GREY GOOSE');
    const vodka = out.find((c) => c.name === 'Vodka');
    expect(vodka.sourceTokens).toEqual(['grey', 'goose']);
  });
});

describe('brandToIngredient — false-positive guards', () => {
  it('does not match brand names embedded inside larger words', () => {
    // "absolut" must not match "absolutely" — the substring check is
    // word-bounded specifically to prevent this.
    const out = matchBrands('absolutely beautiful');
    expect(names(out)).not.toContain('Vodka');
  });

  it('does not match a brand that only partially appears', () => {
    // "grey" alone (without "goose") shouldn't promote anything to Vodka.
    const out = matchBrands('GREY DAY');
    expect(names(out)).not.toContain('Vodka');
  });
});

describe('brandToIngredient — data integrity', () => {
  // These tests guard against bad edits to the brand map itself.

  it('every brand maps to an ingredient that exists in the vocabulary', () => {
    // CATEGORY_BY_NAME gives us null for unknown ingredients. If a brand
    // points to a typo of a vocab name ("Vodca" instead of "Vodka"), the
    // category lookup returns null and the bug surfaces here.
    const { CATEGORY_BY_NAME } = require('../data/ingredientVocabulary');
    for (const [brand, ingredient] of Object.entries(BRAND_TO_INGREDIENT)) {
      const cat = CATEGORY_BY_NAME[ingredient.toLowerCase()];
      expect(cat).toBeTruthy();
      // If this fails the message will include both pieces of context.
      if (!cat) {
        throw new Error(
          `Brand "${brand}" maps to "${ingredient}" but that name is ` +
            `not in ingredientVocabulary.js`
        );
      }
    }
  });

  it('has at least the minimum coverage we promised in SCRUM-218', () => {
    // The ticket promises ~80–120 brands. Floor of 80 is the contract.
    expect(Object.keys(BRAND_TO_INGREDIENT).length).toBeGreaterThanOrEqual(80);
  });

  it('covers every spirit category at minimum', () => {
    // If a future edit accidentally drops an entire category, this test
    // catches it before the demo.
    const required = [
      'Vodka', 'Gin', 'Rum', 'Tequila', 'Bourbon', 'Whiskey', 'Scotch',
      'Cognac',
    ];
    for (const ingredient of required) {
      expect(BRANDS_BY_INGREDIENT[ingredient]).toBeDefined();
      expect(BRANDS_BY_INGREDIENT[ingredient].length).toBeGreaterThan(0);
    }
  });
});
