// SCRUM-91: Baseline tests for existing server routes
const request = require("supertest");
const app = require("../app");

describe("Server baseline routes", () => {

  test("GET / returns 200 and correct message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Alchemy AI Backend Running");
  });

  test("GET /health returns 200 and status OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("GET /api/cabinet with no token returns 401", async () => {
    const res = await request(app).get("/api/cabinet");
    expect(res.statusCode).toBe(401);
  });

});