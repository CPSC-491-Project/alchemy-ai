// SCRUM-187: /api/scan route.
//
// Authenticated endpoint that accepts a base64-encoded image, runs it
// through Google Cloud Vision TEXT_DETECTION, matches extracted text
// against the CocktailDB ingredient vocabulary, and returns ranked
// candidates for the client to confirm (SCRUM-189).
//
// Request:  POST /api/scan
//   Headers:  Authorization: Bearer <Firebase ID token>
//   Body:     { imageBase64: string }          // raw base64, no data: URI
//
// Response (200):
//   {
//     rawOcrText: string,                      // full GCV OCR output
//     candidates: [                            // SCRUM-186 matcher output
//       { name, confidence, sourceTokens, category }
//     ],
//     mode: 'live' | 'mock'                    // whether GCV was called
//   }
//
// Error responses:
//   401 — no Authorization header
//   403 — invalid / expired token
//   400 — missing or malformed imageBase64
//   500 — GCV or matcher pipeline failure

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const visionService = require('../services/visionService');
const { matchIngredients } = require('../services/ingredientMatcher');
const { getVocabulary } = require('../services/cocktailDbVocabulary');

// POST / — scan an image and return matched ingredient candidates.
router.post('/', verifyToken, async (req, res) => {
  const { imageBase64 } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      error: 'imageBase64 is required and must be a string',
    });
  }

  // Basic sanity check — GCV rejects obviously empty or tiny payloads, so
  // fail fast here with a clearer error. 100 chars is a very loose floor;
  // a real JPEG thumbnail is ≫ 100 chars.
  if (imageBase64.length < 100) {
    return res.status(400).json({
      error: 'imageBase64 is too short to be a valid image',
    });
  }

  try {
    const { text: rawOcrText, mode } = await visionService.detectText(
      imageBase64
    );

    const vocabulary = await getVocabulary();
    const candidates = matchIngredients(rawOcrText, vocabulary);

    return res.json({ rawOcrText, candidates, mode });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Failed to process image' });
  }
});

module.exports = router;
