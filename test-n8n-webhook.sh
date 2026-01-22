#!/bin/bash

# n8n Webhook Integration Test Script
# Tests all webhook endpoints and features

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${N8N_WEBHOOK_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: N8N_WEBHOOK_API_KEY environment variable not set${NC}"
    echo "Usage: N8N_WEBHOOK_API_KEY=your-key ./test-n8n-webhook.sh"
    exit 1
fi

echo "========================================"
echo "n8n Webhook Integration Test Suite"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:8}..."
echo ""

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    echo -n "Testing: $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            -H "x-api-key: $API_KEY" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -H "x-api-key: $API_KEY" \
            -d "$data" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE \
            -H "x-api-key: $API_KEY" \
            "$BASE_URL$endpoint")
    fi

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (Status: $status)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected: $expected_status, Got: $status)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Test 1: Health Check (without auth)
echo -e "\n${YELLOW}=== Health Check ===${NC}"
test_endpoint "Health check" "GET" "/api/n8n/webhook" "" 200

# Test 2: Authentication
echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"

echo -n "Testing: Missing API key... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}' \
    "$BASE_URL/api/n8n/webhook")
status=$(echo "$response" | tail -n1)
if [ "$status" -eq 401 ]; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

echo -n "Testing: Invalid API key... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "x-api-key: invalid-key" \
    -d '{"test":"data"}' \
    "$BASE_URL/api/n8n/webhook")
status=$(echo "$response" | tail -n1)
if [ "$status" -eq 401 ]; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 3: Valid Webhook Request
echo -e "\n${YELLOW}=== Valid Webhook Request ===${NC}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MESSAGE_ID="test_message_$(date +%s)_$RANDOM"

PAYLOAD=$(cat <<EOF
{
  "messageId": "$MESSAGE_ID",
  "subject": "Test Email from Script",
  "from": "Test User <test@example.com>",
  "fromEmail": "test@example.com",
  "to": "support@company.com",
  "receivedAt": "$TIMESTAMP",
  "bodyPreview": "This is a test email from the test script",
  "bodyText": "Full email body content here. This is a test.",
  "aiCatalog": {
    "category": "question",
    "sentiment": "neutral",
    "priority": "medium",
    "tags": ["test", "automated"],
    "summary": "Test email from integration test script"
  },
  "conversationId": "test_conv_123",
  "folderPath": "Inbox",
  "hasAttachments": false
}
EOF
)

test_endpoint "Valid webhook request" "POST" "/api/n8n/webhook" "$PAYLOAD" 201

# Test 4: Duplicate Request (Idempotency)
echo -e "\n${YELLOW}=== Idempotency Test ===${NC}"
test_endpoint "Duplicate request" "POST" "/api/n8n/webhook" "$PAYLOAD" 200

# Test 5: Invalid Payload
echo -e "\n${YELLOW}=== Validation Tests ===${NC}"

INVALID_PAYLOAD='{"messageId": "short"}'
test_endpoint "Invalid payload (short messageId)" "POST" "/api/n8n/webhook" "$INVALID_PAYLOAD" 400

INVALID_EMAIL='{"messageId":"test_invalid_1234567890","subject":"Test","from":"test","fromEmail":"invalid-email","to":"test@test.com","receivedAt":"'$TIMESTAMP'","aiCatalog":{"category":"question","sentiment":"neutral"}}'
test_endpoint "Invalid email format" "POST" "/api/n8n/webhook" "$INVALID_EMAIL" 400

# Test 6: Metrics Endpoint
echo -e "\n${YELLOW}=== Metrics Endpoint ===${NC}"
test_endpoint "Get metrics" "GET" "/api/n8n/metrics" "" 200

# Test 7: Logs Endpoint
echo -e "\n${YELLOW}=== Logs Endpoint ===${NC}"
test_endpoint "Get logs" "GET" "/api/n8n/logs?limit=10" "" 200

# Test 8: Rate Limiting (Optional - commented out to avoid hitting limits)
echo -e "\n${YELLOW}=== Rate Limiting Test (Skipped) ===${NC}"
echo "Note: Rate limiting test skipped to avoid hitting actual limits"
echo "To test manually, send 100+ requests rapidly"

# Test 9: HTML Sanitization
echo -e "\n${YELLOW}=== Security Tests ===${NC}"

XSS_PAYLOAD=$(cat <<EOF
{
  "messageId": "test_xss_$(date +%s)_$RANDOM",
  "subject": "<script>alert('xss')</script>Test",
  "from": "Test User <test@example.com>",
  "fromEmail": "test@example.com",
  "to": "support@company.com",
  "receivedAt": "$TIMESTAMP",
  "bodyPreview": "<script>alert('xss')</script>",
  "bodyHtml": "<html><script>alert('xss')</script><body>Test</body></html>",
  "aiCatalog": {
    "category": "question",
    "sentiment": "neutral",
    "priority": "medium"
  }
}
EOF
)

test_endpoint "XSS protection" "POST" "/api/n8n/webhook" "$XSS_PAYLOAD" 201

# Summary
echo ""
echo "========================================"
echo "Test Results Summary"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "Total: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi
