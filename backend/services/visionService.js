// SCRUM-187 / SCRUM-218: Google Cloud Vision wrapper.
//
// Provides `analyze(imageBase64)` that runs both TEXT_DETECTION and
// LABEL_DETECTION in a single Vision API request, plus the original
// `detectText(imageBase64)` retained as a thin wrapper for backward
// compatibility. Mock-mode fallback still works without GCV credentials so
// the rest of the scan pipeline (route + matcher) is testable end-to-end.
//
// Why both features in one request (SCRUM-218)
// --------------------------------------------
// TEXT_DETECTION alone misses two things:
//   1. Brand-forward bottles where OCR captures the brand but the matcher's
//      vocab has no brand entries (Grey Goose, Patrón, etc.) — partly fixed
//      by the brand-pass map but ultimately limited to the brands we hand-
//      curate.
//   2. Unbranded items with no readable text — fresh fruit, herbs, raw
//      ingredients. Pure OCR returns nothing useful.
// LABEL_DETECTION reads image content directly and returns descriptive
// labels: "Orange" / "Citrus" / "Fruit" for an orange, "Distilled beverage"
// / "Vodka" / "Bottle" for a vodka bottle. Both features piped through the
// matcher mean we recognize a wider range of inputs without changing the
// matcher itself.
//
// Cost: this is one Vision API request with two features attached, billed
// as two separate feature units. Roughly 2× the per-request cost of pure
// TEXT_DETECTION but only one round-trip and within the same quota envelope.
//
// Credential sources (checked in this order):
//   1. GCV_CREDENTIALS_BASE64 — base64-encoded service-account JSON.
//      This matches Ethan's Firebase pattern (SCRUM-46) where credentials
//      are stored as a single env var for easy Render/Heroku deploys.
//   2. GOOGLE_APPLICATION_CREDENTIALS — file path to service-account JSON.
//      Used by GCV's default lookup; convenient for local `gcloud auth
//      application-default login` setups.
//   3. Neither present → MOCK mode. Returns canned text + labels so the
//      matcher + route can be exercised end-to-end without GCP setup.
//
// The @google-cloud/vision package is lazy-required inside resolveClient()
// so the module still loads (and tests still run) if the package isn't
// installed or fails to initialize.

// ── Mock OCR + label output ──────────────────────────────────────────────
// The OCR text is a realistic-looking Tanqueray label. When piped through
// the SCRUM-186 matcher it produces "Gin" as the top candidate, so the
// full scan flow is demonstrable in mock mode without GCP credentials.
const MOCK_OCR_TEXT = [
  'TANQUERAY',
  'LONDON DRY GIN',
  '43% ALC/VOL (86 PROOF)',
  '750 ML',
  'IMPORTED',
  'ENJOY RESPONSIBLY',
].join('\n');

// SCRUM-218: canned labels demonstrate the LABEL_DETECTION pathway in mock
// mode. Real GCV output for a gin bottle includes overlapping descriptors
// like "Distilled beverage" / "Liquor" / "Bottle" plus the category itself.
// We include both the noise (which the matcher correctly ignores) and the
// signal (which the matcher matches) to make the test realistic.
const MOCK_LABELS = [
  'Bottle',
  'Distilled beverage',
  'Liquor',
  'Gin',
  'Glass bottle',
  'Drink',
];

// LABEL_DETECTION returns annotations with a `score` (0..1). Anything below
// this threshold is treated as too speculative to feed into the matcher —
// at lower scores Vision tends to return very generic categories ("Object",
// "Product") that just generate matcher noise.
const LABEL_CONFIDENCE_THRESHOLD = 0.7;

// Cap on the number of label annotations we ask GCV to return. The default
// is unlimited and the API tends to return tens of low-confidence labels
// for any image. 15 is plenty of headroom above what we'll actually use
// after the threshold filter.
const MAX_LABEL_RESULTS = 15;

// ── Internal state ───────────────────────────────────────────────────────
let client = null;
// 'uninitialized' | 'live' | 'mock'
let resolvedMode = 'uninitialized';

function resolveClient() {
  if (resolvedMode !== 'uninitialized') return client;

  try {
    // Lazy require so the module loads even if @google-cloud/vision isn't
    // installed (e.g. in a minimal CI environment).
    // eslint-disable-next-line global-require
    const { ImageAnnotatorClient } = require('@google-cloud/vision');

    const hasBase64 = !!process.env.GCV_CREDENTIALS_BASE64;
    const hasFilePath = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!hasBase64 && !hasFilePath) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vision] No GCV credentials configured (set GCV_CREDENTIALS_BASE64 ' +
          'or GOOGLE_APPLICATION_CREDENTIALS). Using MOCK mode.'
      );
      resolvedMode = 'mock';
      return null;
    }

    const opts = {};
    if (hasBase64) {
      const decoded = Buffer.from(
        process.env.GCV_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf8');
      opts.credentials = JSON.parse(decoded);
    }
    // else: ImageAnnotatorClient() with no opts respects
    // GOOGLE_APPLICATION_CREDENTIALS automatically.

    client = new ImageAnnotatorClient(opts);
    resolvedMode = 'live';
    return client;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[vision] GCV init failed, falling back to MOCK mode:',
      err.message
    );
    resolvedMode = 'mock';
    client = null;
    return null;
  }
}

/**
 * Run TEXT_DETECTION + LABEL_DETECTION on an image in a single Vision
 * request. SCRUM-218 — added in place of the previous textDetection-only
 * implementation to also recognize unbranded items (fresh fruit, herbs)
 * and brand-forward bottles where OCR + brand-map alone falls short.
 *
 * @param {string} imageBase64 - Raw base64 string (no data: URI prefix).
 * @returns {Promise<{ text: string, labels: string[], mode: 'live' | 'mock' }>}
 *   text   — concatenated OCR output.
 *   labels — descriptions of LABEL_DETECTION annotations whose confidence
 *            is at or above LABEL_CONFIDENCE_THRESHOLD, in GCV's returned
 *            order (highest confidence first).
 *   mode   — 'live' if the request hit GCV, 'mock' if creds weren't set.
 */
async function analyze(imageBase64) {
  const c = resolveClient();

  if (!c) {
    return {
      text: MOCK_OCR_TEXT,
      labels: [...MOCK_LABELS],
      mode: 'mock',
    };
  }

  // annotateImage with multiple features = single billed request,
  // single round-trip. Cheaper and faster than two separate calls.
  const [result] = await c.annotateImage({
    image: { content: imageBase64 },
    features: [
      { type: 'TEXT_DETECTION' },
      { type: 'LABEL_DETECTION', maxResults: MAX_LABEL_RESULTS },
    ],
  });

  const text =
    result?.fullTextAnnotation?.text ||
    result?.textAnnotations?.[0]?.description ||
    '';

  const labels = (result?.labelAnnotations || [])
    .filter((a) => typeof a.score === 'number' && a.score >= LABEL_CONFIDENCE_THRESHOLD)
    .map((a) => a.description)
    .filter((d) => typeof d === 'string' && d.length > 0);

  return { text, labels, mode: 'live' };
}

/**
 * Backward-compatible OCR-only wrapper. Retained because (a) the existing
 * scan.test.js exercises `detectText` directly and (b) keeping the smaller
 * surface area available makes it cheap to revert to OCR-only if the label
 * pathway ever becomes a problem.
 *
 * @param {string} imageBase64
 * @returns {Promise<{ text: string, mode: 'live' | 'mock' }>}
 */
async function detectText(imageBase64) {
  const { text, mode } = await analyze(imageBase64);
  return { text, mode };
}

function getMode() {
  // Calling resolveClient() first ensures we report the actual mode, not
  // 'uninitialized', even if analyze/detectText hasn't been called yet.
  resolveClient();
  return resolvedMode;
}

// Reset helper for tests. Not part of the public API.
function _resetForTests() {
  client = null;
  resolvedMode = 'uninitialized';
}

module.exports = {
  analyze,
  detectText,
  getMode,
  MOCK_OCR_TEXT,
  MOCK_LABELS,
  LABEL_CONFIDENCE_THRESHOLD,
  _resetForTests,
};
