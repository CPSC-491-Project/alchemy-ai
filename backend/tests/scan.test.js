// SCRUM-187: Tests for the /api/scan route.
//
// Tests the auth guards, input validation, and the mock-mode happy path
// (GCV → matcher → response). Live GCV is NOT exercised here — it requires
// credentials and a network call.
//
// To force MOCK mode and skip Firestore deterministically, we:
//   1. Unset GCV_CREDENTIALS_BASE64 and GOOGLE_APPLICATION_CREDENTIALS
//      in beforeAll.
//   2. Set SCAN_DISABLE_FIRESTORE_CACHE=true so the vocabulary service
//      bypasses Firestore (which otherwise tries to contact GCP and
//      hangs on machines with firebase-admin installed but no project ID).
//   3. Call visionService._resetForTests() so credential detection reruns.

const request = require('supertest');

// The Firebase Auth middleware calls Google servers to verify a malformed
// token. On machines with firebase-admin installed, this can take several
// seconds to reject. Give the test suite enough headroom to not timeout.
jest.setTimeout(15000);

describe('Scan route — public endpoint (SCRUM-196)', () => {
  let app;

  beforeAll(() => {
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.SCAN_DISABLE_FIRESTORE_CACHE = 'true';

    // Stub the CocktailDB fetch so the vocabulary service doesn't try
    // to reach the network during the no-auth smoke test below.
    jest.resetModules();
    jest.doMock('../services/cocktailDbVocabulary', () => {
      // eslint-disable-next-line global-require
      const { INGREDIENTS } = require('../data/ingredientVocabulary');
      return {
        getVocabulary: async () => INGREDIENTS,
        _resetMemo: () => {},
      };
    });

    // eslint-disable-next-line global-require
    app = require('../app');
  });

  afterAll(() => {
    jest.dontMock('../services/cocktailDbVocabulary');
    jest.resetModules();
  });

  test('POST /api/scan with no Authorization header is NOT rejected with 401/403', async () => {
    // Use a too-short imageBase64 so we get a deterministic 400 instead
    // of triggering the full pipeline. The point is: the request is no
    // longer blocked by auth.
    const res = await request(app).post('/api/scan').send({ imageBase64: 'x' });
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/scan ignores Authorization header (does not reject malformed tokens)', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ imageBase64: 'x' });
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// The rest of the tests exercise the route's mock-mode happy path. Since
// SCRUM-196 made /api/scan public, no auth stubbing is needed.
// ──────────────────────────────────────────────────────────────────────────

describe('Scan route — mock mode happy path', () => {
  let app;
  let visionService;

  beforeAll(() => {
    // Make sure no GCV creds leak in from a local .env.
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.SCAN_DISABLE_FIRESTORE_CACHE = 'true';

    // Force the fresh require paths — clear cache first so our stub gets picked up.
    jest.resetModules();

    // Stub the live CocktailDB fetch so the vocabulary service falls back
    // to the static list without any network attempt. (Tests on machines
    // without internet shouldn't hang waiting for CocktailDB either.)
    jest.doMock('../services/cocktailDbVocabulary', () => {
      // eslint-disable-next-line global-require
      const { INGREDIENTS } = require('../data/ingredientVocabulary');
      return {
        getVocabulary: async () => INGREDIENTS,
        _resetMemo: () => {},
      };
    });

    // eslint-disable-next-line global-require
    visionService = require('../services/visionService');
    visionService._resetForTests();

    // eslint-disable-next-line global-require
    app = require('../app');
  });

  afterAll(() => {
    jest.dontMock('../services/cocktailDbVocabulary');
    jest.resetModules();
  });

  test('returns 400 when imageBase64 is missing', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer stubbed')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/imageBase64/);
  });

  test('returns 400 when imageBase64 is not a string', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer stubbed')
      .send({ imageBase64: 12345 });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when imageBase64 is implausibly short', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer stubbed')
      .send({ imageBase64: 'abc' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 200 with mock OCR text and matched candidates', async () => {
    // Payload large enough to pass the length check. Contents don't matter
    // in mock mode — the service ignores the image.
    const fakePayload = 'A'.repeat(200);
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer stubbed')
      .send({ imageBase64: fakePayload });

    expect(res.statusCode).toBe(200);
    expect(res.body.mode).toBe('mock');
    expect(typeof res.body.rawOcrText).toBe('string');
    expect(res.body.rawOcrText.length).toBeGreaterThan(0);

    // The canned mock OCR is a Tanqueray London Dry Gin label — the matcher
    // should surface "Gin" as one of the candidates.
    expect(Array.isArray(res.body.candidates)).toBe(true);
    const names = res.body.candidates.map((c) => c.name);
    expect(names).toContain('Gin');
  });

  test('each candidate has name, confidence, sourceTokens, and category', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer stubbed')
      .send({ imageBase64: 'A'.repeat(200) });

    expect(res.statusCode).toBe(200);
    for (const c of res.body.candidates) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.confidence).toBe('number');
      expect(c.confidence).toBeGreaterThanOrEqual(0.65);
      expect(Array.isArray(c.sourceTokens)).toBe(true);
      // category can be null if the vocabulary came from the live CocktailDB
      // fetch (no category map). In mock mode with the static fallback, it
      // should be a category string.
      expect(c.category === null || typeof c.category === 'string').toBe(true);
    }
  });
});

describe('visionService — mock mode fallback', () => {
  let visionService;

  beforeAll(() => {
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    jest.resetModules();
    // eslint-disable-next-line global-require
    visionService = require('../services/visionService');
    visionService._resetForTests();
  });

  test('reports mock mode when no credentials are configured', () => {
    expect(visionService.getMode()).toBe('mock');
  });

  test('detectText returns the canned mock OCR text', async () => {
    const { text, mode } = await visionService.detectText('ignored');
    expect(mode).toBe('mock');
    expect(text).toBe(visionService.MOCK_OCR_TEXT);
  });
});

// ── SCRUM-218 ─────────────────────────────────────────────────────────────
// Tests for the LABEL_DETECTION addition to visionService and the
// scan-route integration that pipes both OCR text and labels into the
// matcher.

describe('visionService — SCRUM-218 LABEL_DETECTION', () => {
  let visionService;

  beforeAll(() => {
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    jest.resetModules();
    // eslint-disable-next-line global-require
    visionService = require('../services/visionService');
    visionService._resetForTests();
  });

  test('analyze() returns text, labels, and mode in mock mode', async () => {
    const result = await visionService.analyze('ignored');
    expect(result.mode).toBe('mock');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(Array.isArray(result.labels)).toBe(true);
    expect(result.labels.length).toBeGreaterThan(0);
  });

  test('analyze() mock labels include the canned ingredient label ("Gin")', async () => {
    // Sanity check on the mock data — the demo flow needs at least one
    // matchable label so the route's label-pipe-through actually fires.
    const { labels } = await visionService.analyze('ignored');
    expect(labels).toContain('Gin');
  });

  test('exposes LABEL_CONFIDENCE_THRESHOLD as a constant', () => {
    // Other modules (or future tuning) might reference this; locking it
    // here also guards against an accidental edit that drops the floor.
    expect(typeof visionService.LABEL_CONFIDENCE_THRESHOLD).toBe('number');
    expect(visionService.LABEL_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(visionService.LABEL_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
  });

  test('detectText still works as a backward-compatible OCR-only wrapper', async () => {
    // detectText is retained for any caller that wants OCR-only output
    // (and for the original SCRUM-187 test above). It must still return
    // the same shape it did pre-SCRUM-218.
    const result = await visionService.detectText('ignored');
    expect(result.mode).toBe('mock');
    expect(typeof result.text).toBe('string');
    expect(result.labels).toBeUndefined(); // wrapper drops labels by design
  });
});

describe('Scan route — SCRUM-218 label integration', () => {
  let app;
  let visionService;

  beforeAll(() => {
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.SCAN_DISABLE_FIRESTORE_CACHE = 'true';

    jest.resetModules();
    jest.doMock('../services/cocktailDbVocabulary', () => {
      // eslint-disable-next-line global-require
      const { INGREDIENTS } = require('../data/ingredientVocabulary');
      return {
        getVocabulary: async () => INGREDIENTS,
        _resetMemo: () => {},
      };
    });

    // eslint-disable-next-line global-require
    visionService = require('../services/visionService');
    visionService._resetForTests();

    // eslint-disable-next-line global-require
    app = require('../app');
  });

  afterAll(() => {
    jest.dontMock('../services/cocktailDbVocabulary');
    jest.resetModules();
  });

  test('response includes a labels array', async () => {
    // The frontend can ignore this field, but it's useful for debugging
    // and for any future UI that wants to display "we also saw: Bottle,
    // Liquor, …".
    const res = await request(app)
      .post('/api/scan')
      .send({ imageBase64: 'A'.repeat(200) });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(res.body.labels.length).toBeGreaterThan(0);
  });

  test('labels are piped through the matcher (mock "Gin" label → Gin candidate)', async () => {
    // The mock OCR already says "TANQUERAY LONDON DRY GIN" so Gin would
    // match anyway. What we're verifying here is that the labels pipeline
    // is wired correctly — by checking the response includes labels at
    // all and that the mock label "Gin" appears in the labels list.
    // This is the closest we can get to verifying label-pipe-through
    // without a fixture image and a mocked GCV client.
    const res = await request(app)
      .post('/api/scan')
      .send({ imageBase64: 'A'.repeat(200) });

    expect(res.statusCode).toBe(200);
    expect(res.body.labels).toContain('Gin');
    const candidateNames = res.body.candidates.map((c) => c.name);
    expect(candidateNames).toContain('Gin');
  });
});
