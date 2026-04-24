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

describe('Scan route — auth guards', () => {
  let app;

  beforeAll(() => {
    delete process.env.GCV_CREDENTIALS_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.SCAN_DISABLE_FIRESTORE_CACHE = 'true';
    jest.resetModules();
    // eslint-disable-next-line global-require
    app = require('../app');
  });

  test('POST /api/scan with no token returns 401', async () => {
    const res = await request(app).post('/api/scan').send({ imageBase64: 'x' });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/scan with malformed token returns 403', async () => {
    const res = await request(app)
      .post('/api/scan')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ imageBase64: 'x' });
    expect(res.statusCode).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// The rest of the tests exercise the route WITHOUT going through the real
// Firebase auth middleware. We stub verifyToken to attach a fake user and
// continue, then re-require app.js so the stub takes effect.
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

    // Stub verifyToken so we don't need a real Firebase token.
    jest.doMock('../middleware/verifyToken', () => (req, _res, next) => {
      req.user = { uid: 'test-user-uid' };
      next();
    });

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
    jest.dontMock('../middleware/verifyToken');
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
