#!/bin/bash
# Quick test script for GLM failover using curl

BASE_URL="${BASE_URL:-http://localhost:8080}"
API_KEY="${API_KEY:-your-test-api-key}"

echo "======================================"
echo "GLM Failover Quick Test"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Simple OpenAI format request
echo "Test 1: OpenAI Format (/v1/chat/completions)"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -20

echo ""
echo "--------------------------------------"
echo ""

# Test 2: Anthropic format request
echo "Test 2: Anthropic Format (/v1/messages)"
curl -X POST "$BASE_URL/v1/messages" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Say hello"}]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -20

echo ""
echo "======================================"
echo "Check server logs for:"
echo "  ✅ GLM provider configured"
echo "  ✅ Failover Manager Enabled"
echo "  📊 Routing decisions (-> OhMyGPT or -> GLM)"
echo "======================================"
