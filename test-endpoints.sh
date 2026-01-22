#!/bin/bash

echo "🧪 Testeando Endpoints de Vector Search"
echo "========================================"
echo ""

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0"

echo "1️⃣ Test: Knowledge Base Search"
echo "Query: 'como funciona el agente IA'"
echo ""

curl -X POST http://localhost:3000/api/vector-search/knowledge \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"query": "como funciona el agente IA", "limit": 2}' \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "========================================"
echo ""
echo "2️⃣ Test: Cases Search"
echo "Query: 'problema con login'"
echo ""

curl -X POST http://localhost:3000/api/vector-search/cases \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"query": "problema con login", "userId": "cmko4x8ba0000kclgn9qh0kgz", "limit": 2}' \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "========================================"
echo "✅ Tests completados"
