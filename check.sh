#!/bin/bash
echo "═══════════════════════════════════════════"
echo "  VANGAURD.AI — FINAL HEALTH CHECK"
echo "═══════════════════════════════════════════"

# Ensure local venv tools are available if present
if [ -d "finrag/bin" ]; then
    export PATH="$PWD/finrag/bin:$PATH"
fi

echo -n "  Containers:  "
docker compose ps 2>/dev/null | grep -c "running\|healthy"

echo -n "  API:         "
curl -s http://localhost:8000/api/health | grep -o '"ok"'

echo -n "  Readiness:   "
curl -s http://localhost:8000/api/health/ready | grep -o '"ready"'

echo -n "  vLLM:        "
curl -s http://localhost:8001/v1/models 2>/dev/null | grep -c "Qwen\|VANGUARD"

echo -n "  Ruff:        "
ruff check . > /dev/null 2>&1 && echo "PASS" || echo "FAIL"

echo -n "  Mypy:        "
mypy app > /dev/null 2>&1 && echo "PASS" || echo "FAIL"

echo -n "  Unit tests:  "
pytest -m "not integration" -q > /dev/null 2>&1 && echo "PASS" || echo "FAIL"

echo ""
echo "  --- Functional Tests ---"
echo ""

echo -n "  Login:       "
LOGIN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@financerag.dev","password":"mydevpass123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
if [ -n "$TOKEN" ]; then
    echo "PASS"
else
    echo "FAIL (login response: $(echo $LOGIN | head -c 100))"
    echo "  Re-seeding user..."
    docker compose exec -T api python scripts/seed.py \
      --email admin@financerag.dev --password mydevpass123 2>/dev/null
    LOGIN=$(curl -s -X POST http://localhost:8000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@financerag.dev","password":"mydevpass123"}')
    TOKEN=$(echo "$LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
        echo "  Re-seeded, login: PASS"
    else
        echo "  Still FAIL — check if containers are running"
    fi
fi

if [ -n "$TOKEN" ]; then
    echo -n "  Calculator:  "
    CALC=$(curl -s -X POST http://localhost:8000/api/analysis/financial/calculate \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"operation":"sum","inputs":{"a":1,"b":2},"organization_id":"a2e187c8-0c6a-412a-bfa4-7645ccc8a298"}' \
      | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])" 2>/dev/null)
    if [ "$CALC" = "3.0" ]; then
        echo "PASS"
    else
        echo "FAIL (result: $CALC)"
    fi

    echo ""
    echo -n "  Q&A:         "
    QA=$(curl -s -X POST http://localhost:8000/api/research/ask \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"question":"What was Google total revenue in 2025?"}')
    JOB_ID=$(echo "$QA" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    if [ -n "$JOB_ID" ]; then
        sleep 20
        STATUS=$(curl -s http://localhost:8000/api/research/$JOB_ID \
          -H "Authorization: Bearer $TOKEN" \
          | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
        if [ "$STATUS" = "completed" ]; then
            echo "PASS"
            ANSWER=$(curl -s http://localhost:8000/api/research/$JOB_ID \
              -H "Authorization: Bearer $TOKEN" \
              | python3 -c "import sys, json; r=(json.load(sys.stdin).get('result') or {}); print(r.get('answer','')[:80])" 2>/dev/null)
            echo "    Answer: $ANSWER"
        else
            echo "Status: $STATUS"
        fi
    else
        echo "FAIL (no job ID returned)"
    fi
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  CHECK COMPLETE"
echo "═══════════════════════════════════════════"
