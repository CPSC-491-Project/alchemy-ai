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

// Protected route — requires valid Firebase ID token
const verifyToken = require("./middleware/verifyToken");

app.get("/api/me", verifyToken, (req, res) => {
  res.json({
    message: "Authenticated!",
    user: { uid: req.user.uid, email: req.user.email },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});