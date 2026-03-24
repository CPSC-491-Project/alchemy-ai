// SCRUM-71: Cabinet routes — GET /api/cabinet
const express = require("express");
const router = express.Router();
const admin = require("../firebase-admin");
const verifyToken = require("../middleware/verifyToken");

const db = admin.firestore();

// GET / — fetch all ingredients in the authenticated user's cabinet
router.get("/", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const snapshot = await db.collection("users").doc(uid).collection("cabinet").get();
    const ingredients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(ingredients);
  } catch (err) {
    console.error("Error fetching cabinet:", err);
    res.status(500).json({ error: "Failed to fetch cabinet" });
  }
});

module.exports = router;
