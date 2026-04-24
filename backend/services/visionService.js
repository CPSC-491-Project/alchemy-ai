// SCRUM-187: Google Cloud Vision OCR wrapper.
//
// Provides a single `detectText(imageBase64)` function that calls the GCV
// TEXT_DETECTION API, with a MOCK mode fallback so the rest of the scan
// pipeline (route + matcher) is testable end-to-end without real GCV
// credentials.
//
// Credential sources (checked in this order):
//   1. GCV_CREDENTIALS_BASE64 — base64-encoded service-account JSON.
//      This matches Ethan's Firebase pattern (SCRUM-46) where credentials
//      are stored as a single env var for easy Render/Heroku deploys.
//   2. GOOGLE_APPLICATION_CREDENTIALS — file path to service-account JSON.
//      Used by GCV's default lookup; convenient for local `gcloud auth
//      application-default login` setups.
//   3. Neither present → MOCK mode. Returns canned label text so the
//      matcher + route can be exercised end-to-end without GCP setup.
//
// The @google-cloud/vision package is lazy-required inside getClient() so
// the module still loads (and tests still run) if the package isn't
// installed or fails to initialize.

// ── Mock OCR output ──────────────────────────────────────────────────────
// A realistic-looking bottle label. When piped through the SCRUM-186
// matcher it produces "Gin" as the top candidate, so the full scan flow
// is demonstrable in mock mode.
const MOCK_OCR_TEXT = [
  'TANQUERAY',
  'LONDON DRY GIN',
  '43% ALC/VOL (86 PROOF)',
  '750 ML',
  'IMPORTED',
  'ENJOY RESPONSIBLY',
].join('\n');

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
 * Run text detection on a base64-encoded image.
 * @param {string} imageBase64 - Raw base64 string (no data: URI prefix).
 * @returns {Promise<{ text: string, mode: 'live' | 'mock' }>}
 */
async function detectText(imageBase64) {
  const c = resolveClient();

  if (!c) {
    // Mock mode — ignore the input image, return canned text.
    return { text: MOCK_OCR_TEXT, mode: 'mock' };
  }

  const [result] = await c.textDetection({
    image: { content: imageBase64 },
  });

  // GCV returns either `fullTextAnnotation.text` (the reconstructed
  // paragraph form) or `textAnnotations[0].description` (the same thing,
  // alternate shape). Prefer fullTextAnnotation when present.
  const text =
    result?.fullTextAnnotation?.text ||
    result?.textAnnotations?.[0]?.description ||
    '';

  return { text, mode: 'live' };
}

function getMode() {
  // Calling resolveClient() first ensures we report the actual mode, not
  // 'uninitialized', even if detectText hasn't been called yet.
  resolveClient();
  return resolvedMode;
}

// Reset helper for tests. Not part of the public API.
function _resetForTests() {
  client = null;
  resolvedMode = 'uninitialized';
}

module.exports = {
  detectText,
  getMode,
  MOCK_OCR_TEXT,
  _resetForTests,
};
