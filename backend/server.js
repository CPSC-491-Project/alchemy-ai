// SCRUM-90: Entry point — imports app and starts HTTP listener.
// SCRUM-209 (extended): warm the cocktail catalog before accepting traffic
// so the first /api/recommendations request doesn't 503 on a boot race.
// If the warm-up fails, we still start the server (recommendations will
// 503 until the next interval refresh succeeds) — but log loudly.

const app = require("./app");
const cocktailCatalog = require("./services/cocktailCatalog");

const PORT = process.env.PORT || 5000;

async function warmAndListen() {
  console.log('[server] warming cocktail catalog…');
  const startedAt = Date.now();
  try {
    const { count, errors } = await cocktailCatalog.loadCatalog();
    const elapsed = Date.now() - startedAt;
    console.log(`[server] catalog ready: ${count} drinks in ${elapsed}ms`);
    if (errors.length > 0) {
      console.warn(`[server] ${errors.length} letter(s) failed during warmup:`, errors);
    }
  } catch (err) {
    // Don't block server start. Recommendations will 503 until the next
    // interval refresh succeeds — that's still a working server, just
    // with a degraded feature, which is better than a hard fail.
    console.error('[server] catalog warmup failed; recommendations will 503 until refresh succeeds.', err.message);
  }

  // Background refresh every 24h. .unref() inside startRefreshInterval
  // means the timer won't keep the process alive on its own.
  cocktailCatalog.startRefreshInterval();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  warmAndListen();
}

module.exports = app;
