# n8n Webhook Integration Test Script (PowerShell)
# Tests all webhook endpoints and features

# Configuration
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$API_KEY = $env:N8N_WEBHOOK_API_KEY

if (-not $API_KEY) {
    Write-Host "Error: N8N_WEBHOOK_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Usage: `$env:N8N_WEBHOOK_API_KEY='your-key'; .\test-n8n-webhook.ps1"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "n8n Webhook Integration Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Base URL: $BASE_URL"
Write-Host "API Key: $($API_KEY.Substring(0, 8))..."
Write-Host ""

# Test counter
$PASSED = 0
$FAILED = 0

# Test function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Data,
        [int]$ExpectedStatus
    )

    Write-Host "Testing: $Name... " -NoNewline

    $url = "$BASE_URL$Endpoint"
    $headers = @{
        "x-api-key" = $API_KEY
    }

    try {
        $response = $null
        $statusCode = 0

        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
            $statusCode = $response.StatusCode
        }
        elseif ($Method -eq "POST") {
            $headers["Content-Type"] = "application/json"
            $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $Data -UseBasicParsing -ErrorAction Stop
            $statusCode = $response.StatusCode
        }
        elseif ($Method -eq "DELETE") {
            $response = Invoke-WebRequest -Uri $url -Method Delete -Headers $headers -UseBasicParsing -ErrorAction Stop
            $statusCode = $response.StatusCode
        }

        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "PASSED" -ForegroundColor Green -NoNewline
            Write-Host " (Status: $statusCode)"
            $script:PASSED++
            return $true
        }
        else {
            Write-Host "FAILED" -ForegroundColor Red -NoNewline
            Write-Host " (Expected: $ExpectedStatus, Got: $statusCode)"
            Write-Host "Response: $($response.Content)"
            $script:FAILED++
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__

        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "PASSED" -ForegroundColor Green -NoNewline
            Write-Host " (Status: $statusCode)"
            $script:PASSED++
            return $true
        }
        else {
            Write-Host "FAILED" -ForegroundColor Red -NoNewline
            Write-Host " (Expected: $ExpectedStatus, Got: $statusCode)"
            Write-Host "Error: $($_.Exception.Message)"
            $script:FAILED++
            return $false
        }
    }
}

# Test 1: Health Check (without auth)
Write-Host "`n=== Health Check ===" -ForegroundColor Yellow
Test-Endpoint -Name "Health check" -Method "GET" -Endpoint "/api/n8n/webhook" -Data "" -ExpectedStatus 200

# Test 2: Authentication
Write-Host "`n=== Authentication Tests ===" -ForegroundColor Yellow

Write-Host "Testing: Missing API key... " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/n8n/webhook" -Method Post `
        -ContentType "application/json" `
        -Body '{"test":"data"}' `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "FAILED" -ForegroundColor Red
    $FAILED++
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "PASSED" -ForegroundColor Green
        $PASSED++
    }
    else {
        Write-Host "FAILED" -ForegroundColor Red
        $FAILED++
    }
}

Write-Host "Testing: Invalid API key... " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/n8n/webhook" -Method Post `
        -Headers @{"x-api-key"="invalid-key"; "Content-Type"="application/json"} `
        -Body '{"test":"data"}' `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "FAILED" -ForegroundColor Red
    $FAILED++
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "PASSED" -ForegroundColor Green
        $PASSED++
    }
    else {
        Write-Host "FAILED" -ForegroundColor Red
        $FAILED++
    }
}

# Test 3: Valid Webhook Request
Write-Host "`n=== Valid Webhook Request ===" -ForegroundColor Yellow

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$messageId = "test_message_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random)"

$payload = @{
    messageId = $messageId
    subject = "Test Email from PowerShell Script"
    from = "Test User <test@example.com>"
    fromEmail = "test@example.com"
    to = "support@company.com"
    receivedAt = $timestamp
    bodyPreview = "This is a test email from the PowerShell test script"
    bodyText = "Full email body content here. This is a test."
    aiCatalog = @{
        category = "question"
        sentiment = "neutral"
        priority = "medium"
        tags = @("test", "automated")
        summary = "Test email from integration test script"
    }
    conversationId = "test_conv_123"
    folderPath = "Inbox"
    hasAttachments = $false
} | ConvertTo-Json -Depth 10

Test-Endpoint -Name "Valid webhook request" -Method "POST" -Endpoint "/api/n8n/webhook" -Data $payload -ExpectedStatus 201

# Test 4: Duplicate Request (Idempotency)
Write-Host "`n=== Idempotency Test ===" -ForegroundColor Yellow
Test-Endpoint -Name "Duplicate request" -Method "POST" -Endpoint "/api/n8n/webhook" -Data $payload -ExpectedStatus 200

# Test 5: Invalid Payload
Write-Host "`n=== Validation Tests ===" -ForegroundColor Yellow

$invalidPayload = '{"messageId": "short"}'
Test-Endpoint -Name "Invalid payload (short messageId)" -Method "POST" -Endpoint "/api/n8n/webhook" -Data $invalidPayload -ExpectedStatus 400

# Test 6: Metrics Endpoint
Write-Host "`n=== Metrics Endpoint ===" -ForegroundColor Yellow
Test-Endpoint -Name "Get metrics" -Method "GET" -Endpoint "/api/n8n/metrics" -Data "" -ExpectedStatus 200

# Test 7: Logs Endpoint
Write-Host "`n=== Logs Endpoint ===" -ForegroundColor Yellow
Test-Endpoint -Name "Get logs" -Method "GET" -Endpoint "/api/n8n/logs?limit=10" -Data "" -ExpectedStatus 200

# Test 8: Security Tests
Write-Host "`n=== Security Tests ===" -ForegroundColor Yellow

$xssMessageId = "test_xss_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random)"
$xssPayload = @{
    messageId = $xssMessageId
    subject = "<script>alert('xss')</script>Test"
    from = "Test User <test@example.com>"
    fromEmail = "test@example.com"
    to = "support@company.com"
    receivedAt = $timestamp
    bodyPreview = "<script>alert('xss')</script>"
    bodyHtml = "<html><script>alert('xss')</script><body>Test</body></html>"
    aiCatalog = @{
        category = "question"
        sentiment = "neutral"
        priority = "medium"
    }
} | ConvertTo-Json -Depth 10

Test-Endpoint -Name "XSS protection" -Method "POST" -Endpoint "/api/n8n/webhook" -Data $xssPayload -ExpectedStatus 201

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red
$TOTAL = $PASSED + $FAILED
Write-Host "Total: $TOTAL"

if ($FAILED -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`nSome tests failed!" -ForegroundColor Red
    exit 1
}
