// SCRUM-71/72/73: Cabinet routes — GET, POST, DELETE /api/cabinet
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

// DELETE /:ingredientId — remove an ingredient from the authenticated user's cabinet
router.delete("/:ingredientId", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { ingredientId } = req.params;

    const docRef = db.collection("users").doc(uid).collection("cabinet").doc(ingredientId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    await docRef.delete();
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting ingredient:", err);
    res.status(500).json({ error: "Failed to delete ingredient" });
  }
});

module.exports = router;
