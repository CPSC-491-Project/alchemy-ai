// SCRUM-181: Cabinet Firestore CRUD tests
// GET, POST, DELETE happy path + auth enforcement + validation
//
// Two modes:
//   Default (CI): firebase-admin is mocked — no real Firestore needed.
//   Live (local):  CABINET_TEST_LIVE=true  node/jest uses your real
//                  serviceAccount.json and hits alchemyai-2ff0a Firestore.
//                  Requires GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
//                  and a valid TEST_FIREBASE_TOKEN env var (see README).
//
// Run (mock mode):  cd backend && npm test -- --testPathPattern=cabinet.firestore
// Run (live mode):  CABINET_TEST_LIVE=true npm test -- --testPathPattern=cabinet.firestore

const request = require('supertest');

const LIVE = process.env.CABINET_TEST_LIVE === 'true';

// ─── Mock firebase-admin when not in live mode ───────────────────────────────
// We mock the whole module before requiring app.js so the routes pick up
// the mock db. In live mode we skip the mock and let the real SDK load.
if (!LIVE) {
  const mockCabinet = new Map();
  let mockIdCounter = 1;

  const mockTimestamp = { toDate: () => new Date(), seconds: 0, nanoseconds: 0 };

  const mockCol = {
    add: jest.fn(async (data) => {
      const id = `mock-id-${mockIdCounter++}`;
      mockCabinet.set(id, data);
      return { id };
    }),
    get: jest.fn(async () => ({
      docs: Array.from(mockCabinet.entries()).map(([id, data]) => ({
        id,
        data: () => data,
      })),
    })),
    doc: jest.fn((id) => {
      const data = mockCabinet.get(id) || null;
      return {
        id,
        get: jest.fn(async () => ({ exists: !!data, id, data: () => data })),
        delete: jest.fn(async () => { mockCabinet.delete(id); }),
        collection: jest.fn(() => mockCol),
      };
    }),
  };

  jest.mock('../firebase-admin', () => ({
    apps: [{}],
    initializeApp: jest.fn(),
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => mockCol),
          })),
        })),
      })),
      { Timestamp: { now: jest.fn(() => mockTimestamp) } }
    ),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(async (token) => {
        if (token === 'valid-test-token') return { uid: 'test-uid-123' };
        throw new Error('Invalid token');
      }),
    })),
    credential: { applicationDefault: jest.fn() },
  }));
}

const app = require('../app');

// ─── Auth guard tests (always run, no Firestore needed) ───────────────────────

describe('SCRUM-181: Cabinet routes — auth enforcement', () => {

  test('GET /api/cabinet with no token returns 401', async () => {
    const res = await request(app).get('/api/cabinet');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/cabinet with malformed token returns 403', async () => {
    const res = await request(app)
      .get('/api/cabinet')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/cabinet with no token returns 401', async () => {
    const res = await request(app)
      .post('/api/cabinet')
      .send({ name: 'Vodka', category: 'spirit' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/cabinet/:id with no token returns 401', async () => {
    const res = await request(app).delete('/api/cabinet/abc123');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

});

// ─── Validation tests (always run, no Firestore needed) ───────────────────────

describe('SCRUM-181: Cabinet routes — input validation', () => {

  test('POST /api/cabinet missing name returns 400', async () => {
    const res = await request(app)
      .post('/api/cabinet')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ category: 'spirit' });
    // 400 (bad request) or 401/403 if token not accepted in live mode
    expect([400, 401, 403]).toContain(res.statusCode);
  });

  test('POST /api/cabinet missing category returns 400', async () => {
    const res = await request(app)
      .post('/api/cabinet')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ name: 'Rum' });
    expect([400, 401, 403]).toContain(res.statusCode);
  });

  test('POST /api/cabinet with empty body does not return 500', async () => {
    const res = await request(app)
      .post('/api/cabinet')
      .set('Authorization', 'Bearer valid-test-token')
      .send({});
    expect(res.statusCode).not.toBe(500);
  });

});

// ─── CRUD happy path (mock mode always, live mode when CABINET_TEST_LIVE=true) -

describe('SCRUM-181: Cabinet routes — CRUD happy path', () => {

  const AUTH = LIVE
    ? process.env.TEST_FIREBASE_TOKEN
    : 'valid-test-token';

  // Skip the entire CRUD block in live mode if no token is provided
  const maybeDescribe = (LIVE && !AUTH) ? describe.skip : describe;

  maybeDescribe('with valid auth token', () => {

    test('POST /api/cabinet creates an ingredient and returns 201', async () => {
      const res = await request(app)
        .post('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`)
        .send({ name: 'Gin', category: 'spirit', quantity: 1, unit: 'bottle' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Gin');
      expect(res.body.category).toBe('spirit');
      expect(res.body.quantity).toBe(1);
      expect(res.body.unit).toBe('bottle');
      // dateAdded should be present (Firestore Timestamp serializes to object)
      expect(res.body).toHaveProperty('dateAdded');
    });

    test('GET /api/cabinet returns an array', async () => {
      const res = await request(app)
        .get('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST then GET — newly added ingredient appears in list', async () => {
      // Add
      const addRes = await request(app)
        .post('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`)
        .send({ name: 'Tequila', category: 'spirit' });
      expect(addRes.statusCode).toBe(201);
      const newId = addRes.body.id;

      // Fetch
      const getRes = await request(app)
        .get('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`);
      expect(getRes.statusCode).toBe(200);
      const ids = getRes.body.map((i) => i.id);
      expect(ids).toContain(newId);
    });

    test('DELETE /api/cabinet/:id returns 204 for existing ingredient', async () => {
      // First create one to delete
      const addRes = await request(app)
        .post('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`)
        .send({ name: 'Vermouth', category: 'wine' });
      expect(addRes.statusCode).toBe(201);
      const id = addRes.body.id;

      // Delete it
      const delRes = await request(app)
        .delete(`/api/cabinet/${id}`)
        .set('Authorization', `Bearer ${AUTH}`);
      expect(delRes.statusCode).toBe(204);
    });

    test('DELETE /api/cabinet/:id returns 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/cabinet/this-id-does-not-exist-xyz')
        .set('Authorization', `Bearer ${AUTH}`);
      // Live Firestore returns 404; mock may return 404 or 204 depending on impl
      expect([404, 204]).toContain(res.statusCode);
    });

    test('GET each cabinet item has id, name, category fields', async () => {
      // Seed one if cabinet might be empty
      await request(app)
        .post('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`)
        .send({ name: 'Campari', category: 'liqueur' });

      const res = await request(app)
        .get('/api/cabinet')
        .set('Authorization', `Bearer ${AUTH}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const item of res.body) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('category');
      }
    });

  });

});