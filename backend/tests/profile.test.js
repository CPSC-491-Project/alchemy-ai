// SCRUM-150: Unit tests for profile routes — auth guards and validation
// No Firebase .env required — 401/403 cases fire before Firestore is touched

const request = require("supertest");
const app = require("../app");

describe("Profile routes — auth guards", () => {

  test("GET /api/me with no token returns 401", async () => {
    const res = await request(app).get("/api/me");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/me with malformed token returns 403", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.statusCode).toBe(403);
  });

  test("PUT /api/me/preferences with no token returns 401", async () => {
    const res = await request(app)
      .put("/api/me/preferences")
      .send({ spiritPreferences: ["vodka"] });
    expect(res.statusCode).toBe(401);
  });

  test("PUT /api/me/preferences with malformed token returns 403", async () => {
    const res = await request(app)
      .put("/api/me/preferences")
      .set("Authorization", "Bearer not-a-real-token")
      .send({ spiritPreferences: ["vodka"] });
    expect(res.statusCode).toBe(403);
  });

  test("PUT /api/me/preferences with no token and empty body returns 401", async () => {
    const res = await request(app)
      .put("/api/me/preferences")
      .send({});
    expect(res.statusCode).toBe(401);
  });

});