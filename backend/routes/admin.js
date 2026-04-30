// SCRUM-209 (extended): admin route — cocktail catalog management.
//
// Endpoints:
//   GET  /api/admin/catalog-status    — current catalog count, last refresh, last error
//   POST /api/admin/refresh-catalog   — force a refresh from CocktailDB
//
// Auth: NONE for now. The refresh endpoint is rate-limited by a 60s
// cooldown so a misbehaving caller can't hammer CocktailDB. If we later
// want stronger gating (e.g. demo-day lockdown), drop in verifyToken
// from middleware/firebaseAuth and check for an admin claim.
//
// Why this exists: 24h interval refresh is fine for steady state, but
// during demos / iteration we want to pick up CocktailDB changes (or
// recover from a failed background refresh) without a full server
// restart. The status endpoint also gives QA a quick way to confirm
// the catalog is healthy before running tests.

const express = require('express');
const router = express.Router();
const cocktailCatalog = require('../services/cocktailCatalog');

const REFRESH_COOLDOWN_MS = 60 * 1000; // 1 minute between manual refreshes
let lastManualRefreshAt = 0;

router.get('/catalog-status', (req, res) => {
  res.json(cocktailCatalog.getStatus());
});

router.post('/refresh-catalog', async (req, res) => {
  const now = Date.now();
  const sinceLast = now - lastManualRefreshAt;
  if (sinceLast < REFRESH_COOLDOWN_MS) {
    const waitSec = Math.ceil((REFRESH_COOLDOWN_MS - sinceLast) / 1000);
    return res.status(429).json({
      error: `Catalog was refreshed recently. Please wait ${waitSec}s.`,
    });
  }
  lastManualRefreshAt = now;

  try {
    const result = await cocktailCatalog.refreshCatalog();
    return res.json({
      ok: true,
      count: result.count,
      letterErrors: result.errors,            // per-letter failures (non-fatal)
      ...cocktailCatalog.getStatus(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      letterErrors: err.errors || [],         // per-letter failures attached by loadCatalog
    });
  }
});

module.exports = router;
