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

// SCRUM-52: Profile routes
const profileRouter = require("./routes/profile");
app.use("/api/me", profileRouter);

module.exports = app;
