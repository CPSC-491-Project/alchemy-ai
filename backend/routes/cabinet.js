// SCRUM-71/72: Cabinet routes — GET and POST /api/cabinet
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

// POST / — add a new ingredient to the authenticated user's cabinet
router.post("/", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, category, quantity, unit } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "name and category are required" });
    }

    const ingredient = {
      name,
      category,
      quantity: quantity || null,
      unit: unit || null,
      dateAdded: admin.firestore.Timestamp.now(),
    };

    const docRef = await db.collection("users").doc(uid).collection("cabinet").add(ingredient);
    res.status(201).json({ id: docRef.id, ...ingredient });
  } catch (err) {
    console.error("Error adding ingredient:", err);
    res.status(500).json({ error: "Failed to add ingredient" });
  }
});

module.exports = router;
