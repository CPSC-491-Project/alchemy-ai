// SCRUM-210: /api/vibe-search route.
//
// Thin HTTP wrapper around vibeSearchService.vibeSearch. All algorithmic
// and provider concerns live in the service; this file only translates
// HTTP request/response and error shape.
//
// Auth: NONE for v1 — vibe search works for guests, mirroring the public
// recommendations endpoint. Add verifyToken here if v2 introduces per-user
// vibe history or rate-limit-by-user.
//
// Request:  POST /api/vibe-search
//   Body:     { vibe: string, limit?: number (1..12, default 6) }
//
// Response (200):
//   {
//     results: [
//       {
//         id, name, thumbnail, category, alcoholic, glass, ingredientCount,
//         rationale: "Short one-line explanation of why this drink fits."
//       },
//       ...
//     ]
//   }
//
// Error responses:
//   400 — invalid vibe (missing, empty, too long, wrong type)
//   500 — server-side config issue (GEMINI_API_KEY missing)
//   502 — Gemini upstream failed or returned unusable output
//   503 — catalog not yet warmed (boot race; client should retry)

const express = require('express');
const router = express.Router();

const { vibeSearch } = require('../services/vibeSearch');

router.post('/', async (req, res) => {
  const { vibe, limit } = req.body || {};

  try {
    const results = await vibeSearch(vibe, {
      limit: typeof limit === 'number' ? limit : undefined,
    });
    return res.json({ results });
  } catch (err) {
    const status = err.status || 500;
    if (status === 400 || status === 503) {
      return res.status(status).json({ error: err.message });
    }
    if (status === 502) {
      // Gemini-side problem. Log so we can debug provider issues, but
      // surface a friendly retryable message to the client.
      // eslint-disable-next-line no-console
      console.error('Vibe search upstream error:', err.message, err.upstreamStatus || '');
      return res.status(502).json({ error: err.message });
    }
    if (status === 500) {
      // Likely a missing env var. Log the real reason; tell the client
      // it's a server problem without leaking config details.
      // eslint-disable-next-line no-console
      console.error('Vibe search config error:', err.message);
      return res.status(500).json({ error: 'Vibe search is not configured on the server.' });
    }
    // eslint-disable-next-line no-console
    console.error('Vibe search error:', err);
    return res.status(500).json({ error: 'Vibe search failed' });
  }
});

module.exports = router;
