// SCRUM-182: Contract and environment variable consistency testing
//
// Asserts:
//   1. Frontend services consistently use EXPO_PUBLIC_BACKEND_URL (not EXPO_PUBLIC_API_URL)
//   2. Backend API response shapes match what frontend services expect
//   3. Backend handles malformed requests without 500s
//
// No Firebase/Firestore calls — all contract assertions are structural.
// Run: cd backend && npm test

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const FRONTEND_SERVICES_DIR = path.resolve(
  __dirname,
  '../../frontend/src/services'
);

// ─── 1. Env var naming consistency ────────────────────────────────────────────

describe('SCRUM-182: Frontend env var naming consistency', () => {

  test('No frontend service references deprecated EXPO_PUBLIC_API_URL', () => {
    const files = collectJsFiles(FRONTEND_SERVICES_DIR);
    expect(files.length).toBeGreaterThan(0);

    const violations = [];
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (source.includes('EXPO_PUBLIC_API_URL')) {
        violations.push(path.relative(path.resolve(__dirname, '../..'), filePath));
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found deprecated EXPO_PUBLIC_API_URL in:\n  ${violations.join('\n  ')}\n` +
        'Replace with EXPO_PUBLIC_BACKEND_URL (see PR #20 review + SCRUM-182).'
      );
    }
  });

  test('cabinetService.js uses EXPO_PUBLIC_BACKEND_URL', () => {
    const filePath = path.join(FRONTEND_SERVICES_DIR, 'cabinetService.js');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('EXPO_PUBLIC_BACKEND_URL');
  });

  test('All service files with a backend URL use EXPO_PUBLIC_BACKEND_URL', () => {
    const files = collectJsFiles(FRONTEND_SERVICES_DIR);
    const PATTERN = /EXPO_PUBLIC_[A-Z_]*(?:URL|ENDPOINT|API)[A-Z_]*/g;
    const CORRECT = 'EXPO_PUBLIC_BACKEND_URL';

    const violations = [];
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, 'utf8');
      for (const match of (source.match(PATTERN) || [])) {
        if (match !== CORRECT) {
          violations.push(
            `${path.relative(path.resolve(__dirname, '../..'), filePath)}: found "${match}"`
          );
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Non-standard backend URL env var(s):\n  ${violations.join('\n  ')}\n` +
        `All services must use ${CORRECT}.`
      );
    }
  });

});

// ─── 2. API contract — unauthenticated response shapes ────────────────────────

describe('SCRUM-182: Backend API contract — unauthenticated shapes', () => {

  test('GET / returns { message: string }', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  test('GET /health returns { status: "OK" }', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('GET /api/cabinet without token returns 401 with error field', async () => {
    const res = await request(app).get('/api/cabinet');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/cabinet without token returns 401 with error field', async () => {
    const res = await request(app)
      .post('/api/cabinet')
      .send({ name: 'Gin', category: 'spirit' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/cabinet/:id without token returns 401 with error field', async () => {
    const res = await request(app).delete('/api/cabinet/fake-id-123');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/me without token returns 401 with error field', async () => {
    const res = await request(app).get('/api/me');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/me/preferences without token returns 401 with error field', async () => {
    const res = await request(app)
      .put('/api/me/preferences')
      .send({ spiritPreferences: ['gin'] });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

});

// ─── 3. Request validation — no 500s on malformed bodies ──────────────────────

describe('SCRUM-182: Backend API contract — no 500s on bad input', () => {

  test('POST /api/cabinet with empty body does not return 500', async () => {
    const res = await request(app).post('/api/cabinet').send({});
    expect(res.statusCode).not.toBe(500);
  });

  test('PUT /api/me/preferences with empty body does not return 500', async () => {
    const res = await request(app).put('/api/me/preferences').send({});
    expect(res.statusCode).not.toBe(500);
  });

});