// SCRUM-52: Profile route — GET /api/me
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

module.exports = router;
