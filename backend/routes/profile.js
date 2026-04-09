// SCRUM-52/53: Profile routes — GET /api/me, PUT /api/me/preferences
const express = require("express");
const router = express.Router();
const admin = require("../firebase-admin");
const verifyToken = require("../middleware/verifyToken");

const db = admin.firestore();

// SCRUM-52: GET / — return the authenticated user's profile from Firestore
router.get("/", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const data = userDoc.data();
    res.json({
      uid,
      email: data.email || req.user.email || null,
      displayName: data.displayName || null,
      spiritPreferences: data.spiritPreferences || [],
      dietaryFlags: data.dietaryFlags || [],
      privacySettings: data.privacySettings || {},
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// SCRUM-53: PUT /preferences — update spirit types, likes/dislikes, dietary constraints
router.put("/preferences", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { spiritPreferences, dietaryFlags, privacySettings } = req.body;

    if (!spiritPreferences && !dietaryFlags && !privacySettings) {
      return res.status(400).json({
        error:
          "At least one field is required: spiritPreferences, dietaryFlags, or privacySettings",
      });
    }

    const updates = {};
    if (spiritPreferences !== undefined) updates.spiritPreferences = spiritPreferences;
    if (dietaryFlags !== undefined) updates.dietaryFlags = dietaryFlags;
    if (privacySettings !== undefined) updates.privacySettings = privacySettings;
    updates.updatedAt = admin.firestore.Timestamp.now();

    await db.collection("users").doc(uid).set(updates, { merge: true });

    const updatedDoc = await db.collection("users").doc(uid).get();
    const data = updatedDoc.data();

    res.json({
      uid,
      email: data.email || req.user.email || null,
      displayName: data.displayName || null,
      spiritPreferences: data.spiritPreferences || [],
      dietaryFlags: data.dietaryFlags || [],
      privacySettings: data.privacySettings || {},
    });
  } catch (err) {
    console.error("Error updating preferences:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

module.exports = router;
