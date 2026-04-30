// SCRUM-90: Express app extracted for testability
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
// SCRUM-187: bumped from default 100kb to 15mb for base64-encoded phone
// photos sent to /api/scan (a ~5MB JPEG is ~6.7MB after base64 encoding).
app.use(express.json({ limit: "15mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Alchemy AI Backend Running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// SCRUM-70: Cabinet routes
const cabinetRouter = require("./routes/cabinet");
app.use("/api/cabinet", cabinetRouter);

// SCRUM-130: Cocktails routes
const cocktailsRouter = require("./routes/cocktails");
app.use("/api/recipes", cocktailsRouter);

// SCRUM-52: Profile routes
const profileRouter = require("./routes/profile");
app.use("/api/me", profileRouter);

// SCRUM-187: Scan route — POST /api/scan (GCV OCR + ingredient matcher)
const scanRouter = require("./routes/scan");
app.use("/api/scan", scanRouter);

// SCRUM-199: Recommendations route — POST /api/recommendations
const recommendationsRouter = require("./routes/recommendations");
app.use("/api/recommendations", recommendationsRouter);

// SCRUM-209 (extended): Admin route — catalog status + manual refresh
const adminRouter = require("./routes/admin");
app.use("/api/admin", adminRouter);

// SCRUM-142: 404 catch-all — no route matched
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// SCRUM-142: Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
