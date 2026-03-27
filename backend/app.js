// SCRUM-90: Express app extracted for testability
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Alchemy AI Backend Running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// SCRUM-70: Cabinet routes
const cabinetRouter = require("./routes/cabinet");
app.use("/api/cabinet", cabinetRouter);

// Cocktail routes — proxies TheCocktailDB
const cocktailRouter = require("./routes/cocktails");
app.use("/api/cocktails", cocktailRouter);

module.exports = app;
