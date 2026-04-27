// SCRUM-52/53: Profile routes — GET /api/me, PUT /api/me/preferences
// SCRUM-191: Fixed — GET /api/me now auto-creates a default profile on first
//            login instead of returning 404. Backend owns profile creation per
//            original spec (SCRUM-52). Fix applied by Allisa Warren (PM/Integrations).
const express = require("express");
const router = express.Router();
const admin = require("../firebase-admin");
const verifyToken = require("../middleware/verifyToken");

const db = admin.firestore();

// SCRUM-52: GET / — return the authenticated user's profile from Firestore.
// SCRUM-191: If no profile exists (first login), create a default one and return it.
router.get("/", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      const defaultProfile = {
        uid,
        email: req.user.email || null,
        displayName: req.user.name || null,
        spiritPreferences: [],
        dietaryFlags: [],
        privacySettings: {},
        createdAt: admin.firestore.Timestamp.now(),
      };
      await db.collection("users").doc(uid).set(defaultProfile);
      return res.json(defaultProfile);
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
