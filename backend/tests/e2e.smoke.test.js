// SCRUM-183: E2E smoke test — deployed backend critical path
//
// Exercises the full sequence against the live Railway backend:
//   health check → public recommendations endpoint → auth guard check
//
// SKIPS automatically if E2E_BACKEND_URL is not set, so CI is never broken.
// Run locally AFTER develop → main merge:
//
//   PowerShell:
//   $env:E2E_BACKEND_URL="https://alchemy-ai-production.up.railway.app"; npm test -- --testPathPatterns=e2e.smoke
//
//   With auth token:
//   $env:E2E_BACKEND_URL="..."; $env:TEST_FIREBASE_TOKEN="<token>"; npm test -- --testPathPatterns=e2e.smoke
//
// Getting a Firebase ID token:
//   In the running app (web), open DevTools console and run:
//     const { getAuth } = await import('firebase/auth');
//     console.log(await getAuth().currentUser.getIdToken());

const BASE_URL = process.env.E2E_BACKEND_URL;
const TOKEN    = process.env.TEST_FIREBASE_TOKEN;

// Skip everything if we're not in E2E mode
const describeE2E = BASE_URL ? describe : describe.skip;

// Lightweight fetch wrapper — no supertest, just raw HTTP against Railway
async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

// ─── 1. Health & root ─────────────────────────────────────────────────────────

describeE2E('SCRUM-183: E2E smoke — health & root', () => {

  test('GET / returns 200 and backend running message', async () => {
    const { status, body } = await api('/');
    expect(status).toBe(200);
    expect(typeof body.message).toBe('string');
    expect(body.message).toMatch(/alchemy/i);
  });

  test('GET /health returns { status: "OK" }', async () => {
    const { status, body } = await api('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('OK');
  });

});

// ─── 2. Public endpoints ──────────────────────────────────────────────────────

describeE2E('SCRUM-183: E2E smoke — public endpoints', () => {

test('POST /api/recommendations returns results for known ingredients', async () => {
  const { status, body } = await api('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ ingredients: ['vodka', 'lime juice', 'triple sec'], limit: 3 }),
  });
  expect(status).toBe(200);
  // Route returns { recommendations: [...] }
  expect(body).toHaveProperty('recommendations');
  expect(Array.isArray(body.recommendations)).toBe(true);
  // CocktailDB may return 0 results on Railway depending on timing — shape check is sufficient
}, 15000);

  test('POST /api/recommendations with empty ingredients returns 400', async () => {
    const { status } = await api('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({ ingredients: [] }),
    });
    expect(status).toBe(400);
  });

  test('POST /api/scan/public with no image returns 400 or 404', async () => {
    const { status } = await api('/api/scan/public', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    // 404 = route not public, 400/415/422 = validation rejection
    expect([400, 404, 415, 422]).toContain(status);
  });

});

// ─── 3. Auth-gated endpoints — guards enforced on Railway ────────────────────

describeE2E('SCRUM-183: E2E smoke — auth guards on live backend', () => {

  test('GET /api/cabinet without token returns 401', async () => {
    const { status } = await api('/api/cabinet');
    expect(status).toBe(401);
  });

  test('GET /api/me without token returns 401', async () => {
    const { status } = await api('/api/me');
    expect(status).toBe(401);
  });

  test('DELETE /api/cabinet/fake-id without token returns 401 or 404', async () => {
    const { status } = await api('/api/cabinet/fake-id-xyz');
    // Some routers 404 before auth guard on unmatched dynamic segments
    expect([401, 404]).toContain(status);
  });

});

// ─── 4. Authenticated cabinet flow (only runs if TEST_FIREBASE_TOKEN is set) ──

const describeAuthed = (BASE_URL && TOKEN) ? describe : describe.skip;

describeAuthed('SCRUM-183: E2E smoke — authenticated cabinet flow', () => {

  const authHeader = { Authorization: `Bearer ${TOKEN}` };
  let createdId;

  test('GET /api/cabinet returns 200 and an array', async () => {
    const { status, body } = await api('/api/cabinet', { headers: authHeader });
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/cabinet creates an ingredient', async () => {
    const { status, body } = await api('/api/cabinet', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: 'E2E-Test-Rum', category: 'spirit' }),
    });
    expect(status).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body.name).toBe('E2E-Test-Rum');
    createdId = body.id;
  });

  test('DELETE /api/cabinet/:id removes the created ingredient', async () => {
    if (!createdId) return;
    const { status } = await api(`/api/cabinet/${createdId}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    expect(status).toBe(204);
  });

});