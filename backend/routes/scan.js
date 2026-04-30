// SCRUM-187 / SCRUM-196 / SCRUM-218: /api/scan route.
//
// Public endpoint that accepts a base64-encoded image, runs it through
// Google Cloud Vision (TEXT_DETECTION + LABEL_DETECTION via SCRUM-218),
// matches both signals against the CocktailDB ingredient vocabulary, and
// returns ranked candidates for the client to confirm (SCRUM-189).
//
// Auth: NONE. Scan is intentionally available to guests (SCRUM-196) so
// users can try the feature without signing in. If the client sends an
// Authorization header it is currently ignored — re-add verifyToken if
// per-user rate limiting or scan history is added later.
//
// Request:  POST /api/scan
//   Body:     { imageBase64: string }          // raw base64, no data: URI
//
// Response (200):
//   {
//     rawOcrText: string,                      // full GCV OCR output
//     labels:     string[],                    // SCRUM-218 high-confidence
//                                              //   LABEL_DETECTION descriptions
//     candidates: [                            // matcher output, merged from
//       { name, confidence, sourceTokens, category }   // text + labels
//     ],
//     mode: 'live' | 'mock'                    // whether GCV was called
//   }
//
// Error responses:
//   400 — missing or malformed imageBase64
//   500 — GCV or matcher pipeline failure

const express = require('express');
const router = express.Router();

const visionService = require('../services/visionService');
const { matchIngredients } = require('../services/ingredientMatcher');
const { getVocabulary } = require('../services/cocktailDbVocabulary');

// POST / — scan an image and return matched ingredient candidates.
router.post('/', async (req, res) => {
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
    const { text: rawOcrText, labels, mode } = await visionService.analyze(
      imageBase64
    );

    // SCRUM-218: merge OCR text + LABEL_DETECTION descriptions into a
    // single string before running the matcher. Labels are appended on
    // their own lines so multi-word labels ("Distilled beverage", "Glass
    // bottle") preserve their phrase structure for the n-gram pass. The
    // matcher's stopword + threshold logic naturally filters out the
    // generic noise labels ("Bottle", "Drink") without us needing to
    // hand-curate which labels to use.
    const combinedForMatcher = labels && labels.length > 0
      ? `${rawOcrText}\n${labels.join('\n')}`
      : rawOcrText;

    const vocabulary = await getVocabulary();
    const candidates = matchIngredients(combinedForMatcher, vocabulary);

    return res.json({ rawOcrText, labels: labels || [], candidates, mode });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Failed to process image' });
  }
});

module.exports = router;
