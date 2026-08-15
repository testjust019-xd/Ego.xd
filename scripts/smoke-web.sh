#!/bin/bash
# Smoke test routes web (serveur doit tourner)
BASE="${1:-http://localhost:3000}"
echo "Smoke test $BASE"
curl -sf "$BASE/health" | head -c 200; echo
curl -sf "$BASE/api/theme" | head -c 200; echo
curl -sf "$BASE/api/top?limit=3" | head -c 200; echo
curl -sf -o /dev/null -w "game.html %{http_code}\n" "$BASE/g/testtoken"
curl -sf -o /dev/null -w "top.html %{http_code}\n" "$BASE/top"
echo "OK"
