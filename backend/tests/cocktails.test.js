// SCRUM-150: Unit tests for cocktails routes — validation and service layer mocking
// jest.mock prevents real HTTP calls to CocktailDB

const request = require("supertest");
const app = require("../app");

jest.mock("../services/cocktailService", () => ({
  searchCocktails: jest.fn(),
  getCocktailById: jest.fn(),
}));

const { searchCocktails, getCocktailById } = require("../services/cocktailService");

describe("Cocktails routes — validation", () => {

  test("GET /api/recipes/search with no q param returns 400", async () => {
    const res = await request(app).get("/api/recipes/search");
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/q is required/i);
  });

  test("GET /api/recipes/search with q param returns 200 and array", async () => {
    searchCocktails.mockResolvedValueOnce([
      { id: "11007", name: "Margarita" },
    ]);
    const res = await request(app).get("/api/recipes/search?q=margarita");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Margarita");
  });

  test("GET /api/recipes/search propagates service errors as 500", async () => {
    searchCocktails.mockRejectedValueOnce(new Error("CocktailDB timeout"));
    const res = await request(app).get("/api/recipes/search?q=margarita");
    expect(res.statusCode).toBe(500);
  });

  test("GET /api/recipes/:id returns 404 when drink not found", async () => {
    getCocktailById.mockResolvedValueOnce(null);
    const res = await request(app).get("/api/recipes/99999");
    expect(res.statusCode).toBe(404);
  });

  test("GET /api/recipes/:id returns 200 and drink object when found", async () => {
    getCocktailById.mockResolvedValueOnce({ id: "11007", name: "Margarita" });
    const res = await request(app).get("/api/recipes/11007");
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Margarita");
  });

  test("GET /api/recipes/:id propagates service errors as 500", async () => {
    getCocktailById.mockRejectedValueOnce(new Error("CocktailDB timeout"));
    const res = await request(app).get("/api/recipes/11007");
    expect(res.statusCode).toBe(500);
  });

});