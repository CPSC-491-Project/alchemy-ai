#!/usr/bin/env bash
# SCRUM-183: Pre-presentation Railway smoke test
# Usage: ./scripts/smoke.sh [BACKEND_URL] [FIREBASE_TOKEN]
#
# Example:
#   ./scripts/smoke.sh https://alchemy-ai-production.up.railway.app "$MY_TOKEN"

BASE="${1:-https://alchemy-ai-production.up.railway.app}"
TOKEN="${2:-}"

PASS=0; FAIL=0

check() {
  local label="$1"; local expected="$2"; local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅  $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌  $label — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "🧪 Alchemy AI — E2E Smoke Test"
echo "   Backend: $BASE"
echo ""

# Health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
check "GET / → 200" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
check "GET /health → 200" "200" "$STATUS"

# Auth guards
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/cabinet")
check "GET /api/cabinet (no token) → 401" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/me")
check "GET /api/me (no token) → 401" "401" "$STATUS"

# Public recommendations
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/recommendations" \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["vodka","lime juice"],"limit":2}')
check "POST /api/recommendations → 200" "200" "$STATUS"

# Authenticated (only if token provided)
if [ -n "$TOKEN" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" "$BASE/api/cabinet")
  check "GET /api/cabinet (authed) → 200" "200" "$STATUS"
else
  echo "  ⚠️   Skipping authed tests (no token provided)"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1