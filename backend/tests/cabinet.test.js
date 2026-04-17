// SCRUM-76: Cabinet route auth guard tests — no Firebase .env required
// Full cabinet CRUD tests (with Firestore) tracked in SCRUM-76, blocked on .env from Ethan

const request = require("supertest");
const app = require("../app");

describe("Cabinet routes — auth guards", () => {

  test("GET /api/cabinet with no token returns 401", async () => {
    const res = await request(app).get("/api/cabinet");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/cabinet with malformed token returns 403", async () => {
    const res = await request(app)
      .get("/api/cabinet")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.statusCode).toBe(403);
  });

  test("POST /api/cabinet with no token returns 401", async () => {
    const res = await request(app)
      .post("/api/cabinet")
      .send({ name: "Vodka", category: "spirit" });
    expect(res.statusCode).toBe(401);
  });

  test("DELETE /api/cabinet/:id with no token returns 401", async () => {
    const res = await request(app).delete("/api/cabinet/abc123");
    expect(res.statusCode).toBe(401);
  });

});