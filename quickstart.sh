#!/bin/bash
docker compose up -d
sleep 30
echo "VANGUARD.AI is running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:8000/docs"
echo "  API Health: http://localhost:8000/api/health"
echo "  Model: $(grep model docker-compose.vllm.yml | head -1)"
