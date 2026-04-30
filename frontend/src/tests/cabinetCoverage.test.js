// SCRUM-204: Unit tests for cabinet coverage util.
//
// Pure tests against the util only — no React, no RNTL, no network. Runs as
// part of `npm test` in frontend/.
//
// Coverage maps to SCRUM-204 acceptance criteria:
//   - exact match, case mismatch, qualifier mismatch, synonym match,
//     fuzzy/typo match, empty cabinet, drink with no ingredients.

import {
  normalizeIngredient,
  compareCabinetToDrink,
  _internal,
} from '../utils/cabinetCoverage';

describe('normalizeIngredient', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalizeIngredient('  RUM  ')).toBe('rum');
  });

  it('strips punctuation and digits', () => {
    expect(normalizeIngredient('rum,')).toBe('rum');
    expect(normalizeIngredient('100% agave tequila')).toBe('agave tequila');
  });

  it('strips qualifier tokens', () => {
    expect(normalizeIngredient('Light rum')).toBe('rum');
    expect(normalizeIngredient('Fresh mint')).toBe('mint');
    expect(normalizeIngredient('Aged dark rum')).toBe('rum');
    expect(normalizeIngredient('White rum')).toBe('rum');
  });

  it('applies the synonym map', () => {
    expect(normalizeIngredient('Lime juice')).toBe('lime');
    expect(normalizeIngredient('Lemon juice')).toBe('lemon');
    expect(normalizeIngredient('Sugar syrup')).toBe('simple syrup');
    expect(normalizeIngredient('Cointreau')).toBe('triple sec');
    expect(normalizeIngredient('Soda water')).toBe('club soda');
  });

  it('chains qualifier-strip → synonym ("Fresh lime juice" → "lime")', () => {
    expect(normalizeIngredient('Fresh lime juice')).toBe('lime');
  });

  it('handles empty / nullish / non-string input gracefully', () => {
    expect(normalizeIngredient('')).toBe('');
    expect(normalizeIngredient(null)).toBe('');
    expect(normalizeIngredient(undefined)).toBe('');
    expect(normalizeIngredient(123)).toBe('');
    expect(normalizeIngredient('   ')).toBe('');
  });
});

describe('compareCabinetToDrink — basic matching', () => {
  it('exact normalized match → 100%', () => {
    const cabinet = [
      { id: '1', name: 'Vodka' },
      { id: '2', name: 'Tonic Water' },
    ];
    const drink = [{ name: 'Vodka' }, { name: 'Tonic Water' }];
    const r = compareCabinetToDrink(cabinet, drink);
    expect(r.matchedCount).toBe(2);
    expect(r.missing).toEqual([]);
    expect(r.matchPercentage).toBe(1);
  });

  it('case mismatch — GIN matches gin', () => {
    expect(
      compareCabinetToDrink([{ name: 'GIN' }], [{ name: 'gin' }]).matchedCount,
    ).toBe(1);
  });

  it('qualifier mismatch — Light rum matches Rum', () => {
    expect(
      compareCabinetToDrink([{ name: 'Rum' }], [{ name: 'Light rum' }])
        .matchedCount,
    ).toBe(1);
  });

  it('synonym match — Lime juice (drink) matches Lime (cabinet)', () => {
    expect(
      compareCabinetToDrink([{ name: 'Lime' }], [{ name: 'Lime juice' }])
        .matchedCount,
    ).toBe(1);
  });

  it('synonym match in the other direction — Cointreau matches Triple sec', () => {
    expect(
      compareCabinetToDrink(
        [{ name: 'Cointreau' }],
        [{ name: 'Triple sec' }],
      ).matchedCount,
    ).toBe(1);
  });

  it('fuzzy match — minor spelling variants (single-edit typo)', () => {
    // "Angostura bittrs" vs "Angostura bitters" — Levenshtein distance 1,
    // max length 17 → similarity ≈ 0.94 ≥ FUZZY_THRESHOLD (0.9).
    // (Two-edit typos like "Angustora" don't clear 0.9 — by design;
    //  matches backend recommendationEngine's FUZZY_SIMILARITY_THRESHOLD.)
    expect(
      compareCabinetToDrink(
        [{ name: 'Angostura bittrs' }],
        [{ name: 'Angostura bitters' }],
      ).matchedCount,
    ).toBe(1);
  });
});

describe('compareCabinetToDrink — partial / boundary cases', () => {
  it('partial match returns matched and missing arrays', () => {
    const cabinet = [{ name: 'Tequila' }, { name: 'Lime' }];
    const drink = [
      { name: 'Tequila' },
      { name: 'Lime juice' },
      { name: 'Triple sec' },
      { name: 'Salt' },
    ];
    const r = compareCabinetToDrink(cabinet, drink);
    expect(r.matchedCount).toBe(2);
    expect(r.missing).toEqual(['Triple sec', 'Salt']);
    expect(r.ingredientCount).toBe(4);
    expect(r.matchPercentage).toBe(0.5);
  });

  it('preserves the original cabinet item reference (with category/quantity)', () => {
    const cabinet = [
      {
        id: 'abc',
        name: 'Light rum',
        category: 'spirit',
        quantity: 1,
        unit: 'bottle',
      },
    ];
    const drink = [{ name: 'Rum' }];
    const r = compareCabinetToDrink(cabinet, drink);
    expect(r.matched[0].cabinetItem).toEqual(cabinet[0]);
    expect(r.matched[0].drinkIngredient).toBe('Rum');
  });

  it('preserves original casing in the missing array', () => {
    const r = compareCabinetToDrink([], [{ name: 'Triple Sec' }]);
    expect(r.missing).toEqual(['Triple Sec']);
  });

  it('empty cabinet → all ingredients missing, percentage 0', () => {
    const drink = [{ name: 'Rum' }, { name: 'Lime' }];
    const r = compareCabinetToDrink([], drink);
    expect(r.matchedCount).toBe(0);
    expect(r.missing).toEqual(['Rum', 'Lime']);
    expect(r.matchPercentage).toBe(0);
  });

  it('drink with no ingredients → empty result (no division by zero)', () => {
    const r = compareCabinetToDrink([{ name: 'Rum' }], []);
    expect(r.matchedCount).toBe(0);
    expect(r.ingredientCount).toBe(0);
    expect(r.matchPercentage).toBe(0);
  });

  it('accepts plain string arrays on either side', () => {
    expect(compareCabinetToDrink(['Rum'], ['Rum']).matchedCount).toBe(1);
    expect(compareCabinetToDrink([{ name: 'Rum' }], ['Rum']).matchedCount).toBe(
      1,
    );
  });

  it('skips empty / unnamed entries on either side without crashing', () => {
    const cabinet = [{ name: 'Rum' }, { name: '' }, null, { foo: 'bar' }];
    const drink = [{ name: 'Rum' }, { name: '' }, null];
    const r = compareCabinetToDrink(cabinet, drink);
    expect(r.matchedCount).toBe(1);
    expect(r.ingredientCount).toBe(1);
  });

  it('non-array inputs return safe empty result', () => {
    const r = compareCabinetToDrink(null, undefined);
    expect(r.matchedCount).toBe(0);
    expect(r.ingredientCount).toBe(0);
    expect(r.matchPercentage).toBe(0);
  });
});

describe('_internal Levenshtein / similarity', () => {
  it('similarity is 1.0 for identical strings', () => {
    expect(_internal.similarity('rum', 'rum')).toBe(1);
  });

  it('similarity is 0 for empty strings', () => {
    expect(_internal.similarity('', 'rum')).toBe(0);
  });

  it('one-char edit on a long string scores ≥ 0.9 (clears fuzzy threshold)', () => {
    // 17-char string, 1 edit → similarity ≈ 0.94.
    expect(
      _internal.similarity('angostura bitters', 'angostura bittrs'),
    ).toBeGreaterThanOrEqual(0.9);
  });

  it('two-edit typos on a short word do NOT clear 0.9 (matches backend behavior)', () => {
    // "angostura" vs "angustora" = 2 substitutions on 9 chars → ≈0.78.
    // Documented to lock the threshold expectation.
    expect(_internal.similarity('angostura', 'angustora')).toBeLessThan(0.9);
  });

  it('totally different strings score low', () => {
    expect(_internal.similarity('rum', 'gin')).toBeLessThan(0.5);
  });
});
