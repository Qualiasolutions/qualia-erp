#!/usr/bin/env bash
# Smoke test for POST /api/v1/reports v3.4.2 compat layer.
# Runs the four payload shapes the framework will send across v3.4.1 → v3.6.
#
# Usage:
#   ERP_URL=http://localhost:3000 TOKEN=qualia-claude-2026 ./scripts/smoke-test-reports-v342.sh
#   ERP_URL=https://portal.qualiasolutions.net TOKEN=qlt_xxx ./scripts/smoke-test-reports-v342.sh
#
# Exit 0 if all assertions pass.

set -euo pipefail

ERP_URL="${ERP_URL:-http://localhost:3000}"
TOKEN="${TOKEN:?TOKEN env var is required}"
URL="${ERP_URL}/api/v1/reports"

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; exit 1; }

echo "→ Target: ${URL}"
echo ""

# ─── Test 1: Legacy v3.4.1 — gap_cycles as number ────────
echo "Test 1: v3.4.1 legacy shape (gap_cycles=number)"
R1=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "smoke-test-v341",
    "phase": 2,
    "status": "built",
    "gap_cycles": 0,
    "submitted_by": "smoke-test",
    "submitted_at": "2026-04-17T12:00:00Z"
  }')
STATUS_1=$(echo "$R1" | tail -1)
BODY_1=$(echo "$R1" | sed '$d')
[ "$STATUS_1" = "200" ] && pass "v3.4.1 payload accepted (200)" || fail "expected 200 got $STATUS_1: $BODY_1"
echo "$BODY_1" | grep -q '"ok":true' && pass "ok=true" || fail "expected ok=true"

# ─── Test 2: v3.5+ — gap_cycles as object ────────────────
echo ""
echo "Test 2: v3.5+ shape (gap_cycles=object)"
R2=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "smoke-test-v35",
    "phase": 2,
    "status": "built",
    "gap_cycles": {"1": 0, "2": 1, "3": 0},
    "submitted_by": "smoke-test",
    "submitted_at": "2026-04-17T12:00:00Z"
  }')
STATUS_2=$(echo "$R2" | tail -1)
BODY_2=$(echo "$R2" | sed '$d')
[ "$STATUS_2" = "200" ] && pass "v3.5 object payload accepted (200)" || fail "expected 200 got $STATUS_2: $BODY_2"

# ─── Test 3: Idempotency replay ──────────────────────────
echo ""
echo "Test 3: Idempotency replay (same key, same body, should return same report_id)"
IDEM=$(uuidgen | tr '[:upper:]' '[:lower:]')
R3A=$(curl -s -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM" \
  -d '{
    "project": "smoke-test-idem",
    "phase": 1,
    "status": "planned",
    "submitted_by": "smoke-test",
    "submitted_at": "2026-04-17T12:00:00Z"
  }')
ID_A=$(echo "$R3A" | grep -oE '"report_id":"[^"]+"' | head -1 | cut -d'"' -f4)

R3B=$(curl -s -i -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM" \
  -d '{
    "project": "smoke-test-idem",
    "phase": 1,
    "status": "planned",
    "submitted_by": "smoke-test",
    "submitted_at": "2026-04-17T12:00:00Z"
  }')
ID_B=$(echo "$R3B" | grep -oE '"report_id":"[^"]+"' | head -1 | cut -d'"' -f4)

[ -n "$ID_A" ] && [ "$ID_A" = "$ID_B" ] && pass "replay returned same report_id ($ID_A)" || fail "replay mismatch: $ID_A vs $ID_B"
echo "$R3B" | grep -qi '^Idempotent-Replay: true' && pass "Idempotent-Replay header present" || fail "missing Idempotent-Replay header"

# ─── Test 4: Deprecation headers on legacy key ───────────
echo ""
echo "Test 4: Deprecation headers when using CLAUDE_API_KEY"
if [[ "$TOKEN" != qlt_* ]]; then
  R4=$(curl -s -i -X POST "$URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "project": "smoke-test-deprecation",
      "phase": 1,
      "status": "setup",
      "submitted_by": "smoke-test",
      "submitted_at": "2026-04-17T12:00:00Z"
    }')
  echo "$R4" | grep -qi '^Deprecation: true' && pass "Deprecation: true header present" || fail "missing Deprecation header"
  echo "$R4" | grep -qi '^Sunset:' && pass "Sunset header present" || fail "missing Sunset header"
else
  echo "  ⊘ skipped (per-user token — no deprecation expected)"
fi

# ─── Test 5: Invalid token → 401 ─────────────────────────
echo ""
echo "Test 5: Invalid token → 401"
R5=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer qlt_not_a_real_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"project":"x","phase":1,"status":"setup","submitted_by":"x","submitted_at":"2026-04-17T12:00:00Z"}')
STATUS_5=$(echo "$R5" | tail -1)
[ "$STATUS_5" = "401" ] && pass "invalid qlt_ token → 401" || fail "expected 401 got $STATUS_5"

# ─── Test 6: Bad idempotency key format → 400 ────────────
echo ""
echo "Test 6: Malformed Idempotency-Key → 400"
R6=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: not-a-uuid" \
  -d '{"project":"x","phase":1,"status":"setup","submitted_by":"x","submitted_at":"2026-04-17T12:00:00Z"}')
STATUS_6=$(echo "$R6" | tail -1)
[ "$STATUS_6" = "400" ] && pass "non-uuid idempotency key → 400" || fail "expected 400 got $STATUS_6"

echo ""
echo "✓ All v3.4.2 compat smoke tests passed."
