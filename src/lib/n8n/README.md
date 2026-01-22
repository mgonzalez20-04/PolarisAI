# n8n Webhook Integration

Production-ready n8n webhook integration for receiving and processing emails from automated workflows.

## Features

### Security
- API Key authentication (x-api-key header or Authorization Bearer)
- Rate limiting (100 requests per minute per IP)
- Input sanitization and XSS protection
- SQL injection prevention
- Secure error handling (no information leakage)

### Reliability
- Circuit Breaker pattern for database operations
- Automatic retry logic with exponential backoff
- Transaction support for data consistency
- Idempotent operations (duplicate detection)
- Graceful error handling

### Observability
- Structured logging for all operations
- Detailed metrics tracking
- Performance monitoring
- Success/failure rate tracking
- Database audit trail

### Performance
- User caching (5-minute TTL)
- Deduplication cache
- Optimized database queries with transactions
- Efficient payload validation

## Architecture

```
n8n Workflow → POST /api/n8n/webhook
                ↓
         [Rate Limiter]
                ↓
         [Authentication]
                ↓
         [Validation & Sanitization]
                ↓
         [Email Processor]
         (Circuit Breaker + Retry)
                ↓
         [Database Transaction]
                ↓
         [Response + Metrics]
```

## Endpoints

### POST /api/n8n/webhook

Receives and processes email data from n8n workflows.

**Authentication:**
```bash
x-api-key: YOUR_N8N_WEBHOOK_API_KEY
# or
Authorization: Bearer YOUR_N8N_WEBHOOK_API_KEY
```

**Request Body:**
```json
{
  "messageId": "AAMkADtest123...",
  "subject": "Customer inquiry about product",
  "from": "John Doe <john@example.com>",
  "fromEmail": "john@example.com",
  "to": "support@company.com",
  "cc": "manager@company.com",
  "receivedAt": "2024-01-20T10:30:00Z",
  "bodyPreview": "Hi, I have a question...",
  "bodyText": "Full email text...",
  "bodyHtml": "<html>Full email HTML...</html>",
  "aiCatalog": {
    "category": "question",
    "tags": ["product", "pricing"],
    "summary": "Customer asking about product pricing",
    "sentiment": "neutral",
    "priority": "medium"
  },
  "conversationId": "conv_123",
  "folderPath": "Inbox",
  "hasAttachments": false
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "emailId": "clx123...",
  "messageId": "AAMkADtest123...",
  "userId": "user_123",
  "created": true,
  "processingTime": 145,
  "message": "Email received and processed successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid payload",
  "details": ["messageId is required", "fromEmail has invalid format"],
  "warnings": ["bodyText is very long, may impact performance"]
}
```

**Rate Limit Response (429 Too Many Requests):**
```json
{
  "success": false,
  "error": "Too Many Requests",
  "details": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

### GET /api/n8n/webhook

Health check endpoint for monitoring.

**Response:**
```json
{
  "success": true,
  "status": "operational",
  "circuitBreaker": "CLOSED",
  "metrics": {
    "totalRequests": 1250,
    "successRate": "98.40%",
    "averageProcessingTime": "142ms"
  },
  "message": "n8n webhook endpoint is healthy"
}
```

### GET /api/n8n/metrics

Detailed metrics and statistics.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-20T12:00:00Z",
  "webhook": {
    "totalRequests": 1250,
    "successfulRequests": 1230,
    "failedRequests": 20,
    "successRate": "98.40%",
    "errorRate": "1.60%",
    "averageProcessingTime": "142ms",
    "lastProcessedAt": "2024-01-20T11:59:45Z"
  },
  "system": {
    "circuitBreaker": "CLOSED",
    "status": "healthy"
  },
  "database": {
    "totalEmails": 15420,
    "emailsLast24h": 287,
    "emailsLast7d": 1843,
    "averageEmailsPerDay": 263
  },
  "categories": {
    "New": 145,
    "Active": 89,
    "Resolved": 53
  },
  "priorities": {
    "low": 78,
    "medium": 156,
    "high": 48,
    "urgent": 5
  }
}
```

### POST /api/n8n/metrics/reset

Reset metrics (for testing/maintenance).

**Authentication:** Required

### GET /api/n8n/logs

Retrieve recent webhook logs.

**Authentication:** Required

**Query Parameters:**
- `limit`: Number of logs (default: 50, max: 500)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "limit": 50,
  "logs": [
    {
      "timestamp": "2024-01-20T12:00:00Z",
      "level": "success",
      "operation": "webhook-complete",
      "message": "New email created",
      "messageId": "AAMkADtest123",
      "userId": "user_123",
      "emailId": "email_456",
      "duration": 142
    }
  ]
}
```

### DELETE /api/n8n/logs

Cleanup old webhook logs.

**Authentication:** Required

**Query Parameters:**
- `days`: Days to keep (default: 7, max: 365)

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# n8n Webhook API Key
N8N_WEBHOOK_API_KEY="your-secure-api-key-here"

# Database URL
DATABASE_URL="postgresql://..."
```

### Rate Limiting

Default: 100 requests per minute per IP

To modify, edit `src/lib/n8n/webhook-helpers.ts`:

```typescript
export const webhookRateLimiter = new RateLimiter(
  100,  // maxRequests
  60000 // windowMs (1 minute)
);
```

### Circuit Breaker

Default configuration:

```typescript
{
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 2,    // Close after 2 successes
  timeout: 60000          // 1 minute timeout
}
```

To modify, pass config to EmailProcessor:

```typescript
const emailProcessor = new EmailProcessor({
  circuitBreaker: {
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 120000,
  },
});
```

### Retry Logic

Default: 3 retries with exponential backoff (1s, 2s, 4s)

## n8n Workflow Setup

### 1. Microsoft Outlook Trigger

Configure your n8n workflow to poll Outlook every 5 minutes:

- **Node:** Microsoft Outlook Trigger
- **Trigger:** Poll for new emails
- **Interval:** 5 minutes
- **Folder:** Inbox (or custom)

### 2. OpenAI Categorization

Add OpenAI node to analyze email content:

```
Analyze this email and return JSON with:
- category: bug | feature | question | support | other
- sentiment: positive | negative | neutral
- priority: low | medium | high | urgent
- tags: array of relevant tags
- summary: brief summary

Email Subject: {{$json.subject}}
Email Body: {{$json.bodyPreview}}
```

**⚡ NEW: Vector Store Integration**

You can enhance OpenAI analysis by giving it access to your knowledge base and resolved cases using **Function Calling**. This allows OpenAI to search your Supabase vector store for relevant context before categorizing emails.

📖 **See full guide:** `docs/N8N_VECTOR_STORE_INTEGRATION.md`

**Quick Setup:**
1. Enable "Function Calling" in your OpenAI node
2. Add functions: `search_knowledge_base` and `search_resolved_cases`
3. Add HTTP Request nodes to call `/api/vector-search/knowledge` and `/api/vector-search/cases`
4. Function definitions available in: `docs/n8n-function-definitions.json`

**Benefits:**
- 🎯 Context-aware categorization using your documentation
- 🔍 Finds similar resolved cases automatically
- ⚡ Ultra-fast semantic search with pgvector
- 🧠 Smarter analysis with relevant historical data

### 3. HTTP Request Node

Send to webhook:

- **Method:** POST
- **URL:** `https://your-domain.com/api/n8n/webhook`
- **Authentication:** Header Auth
  - **Name:** `x-api-key`
  - **Value:** `{{$env.N8N_WEBHOOK_API_KEY}}`
- **Body (JSON):**

```json
{
  "messageId": "{{$json.id}}",
  "subject": "{{$json.subject}}",
  "from": "{{$json.from}}",
  "fromEmail": "{{$json.fromEmail}}",
  "to": "{{$json.to}}",
  "cc": "{{$json.cc}}",
  "receivedAt": "{{$json.receivedDateTime}}",
  "bodyPreview": "{{$json.bodyPreview}}",
  "bodyText": "{{$json.body.content}}",
  "bodyHtml": "{{$json.body.content}}",
  "aiCatalog": {
    "category": "{{$json.aiAnalysis.category}}",
    "tags": "{{$json.aiAnalysis.tags}}",
    "summary": "{{$json.aiAnalysis.summary}}",
    "sentiment": "{{$json.aiAnalysis.sentiment}}",
    "priority": "{{$json.aiAnalysis.priority}}"
  },
  "conversationId": "{{$json.conversationId}}",
  "folderPath": "Inbox",
  "hasAttachments": "{{$json.hasAttachments}}"
}
```

## Monitoring

### Health Check

```bash
curl https://your-domain.com/api/n8n/webhook
```

### Metrics

```bash
curl -H "x-api-key: YOUR_KEY" \
  https://your-domain.com/api/n8n/metrics
```

### Logs

```bash
curl -H "x-api-key: YOUR_KEY" \
  "https://your-domain.com/api/n8n/logs?limit=100"
```

### Circuit Breaker States

- **CLOSED:** Normal operation, all requests processed
- **OPEN:** Too many failures, rejecting requests
- **HALF_OPEN:** Testing if service recovered

## Error Handling

### Automatic Retries

Failed database operations are retried up to 3 times with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds

### Circuit Breaker Protection

After 5 consecutive database failures, the circuit breaker opens and rejects new requests for 1 minute, preventing cascade failures.

### Idempotency

Duplicate requests (same messageId) within 30 seconds are detected and handled gracefully without creating duplicate records.

## Performance

### Benchmarks

- Average processing time: 100-150ms
- P95 processing time: < 300ms
- Throughput: 100+ req/min sustained

### Optimization Tips

1. **Enable caching:** Already enabled by default (5-minute TTL)
2. **Database indexes:** Ensure indexes on `messageId`, `userId`, `receivedAt`
3. **Connection pooling:** Configure Prisma connection pool in production
4. **Rate limiting:** Adjust based on your load patterns

## Testing

### Test Webhook Locally

```bash
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "messageId": "test_message_123456789",
    "subject": "Test Email",
    "from": "Test User <test@example.com>",
    "fromEmail": "test@example.com",
    "to": "support@company.com",
    "receivedAt": "2024-01-20T10:00:00Z",
    "bodyPreview": "This is a test email",
    "aiCatalog": {
      "category": "question",
      "sentiment": "neutral",
      "priority": "medium"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "emailId": "clx...",
  "messageId": "test_message_123456789",
  "userId": "user_...",
  "created": true,
  "processingTime": 145,
  "message": "Email received and processed successfully"
}
```

## Troubleshooting

### Common Issues

**1. Authentication Failed**
- Verify `N8N_WEBHOOK_API_KEY` in `.env.local`
- Check header name: `x-api-key` or `Authorization: Bearer`

**2. Rate Limit Exceeded**
- Wait 60 seconds
- Check if multiple workflows are hitting the endpoint
- Consider increasing rate limit in production

**3. Circuit Breaker Open**
- Check database connection
- Review logs for recurring errors
- Wait 1 minute for automatic recovery
- Manual reset: POST `/api/n8n/metrics/reset`

**4. Duplicate Emails**
- Normal behavior for retries within 30 seconds
- Returns success with `duplicate: true`
- No duplicate records created

### Logs Location

- **Console:** Standard output (check Next.js logs)
- **Database:** `AppSettings` table with key prefix `webhook_log_`
- **API:** GET `/api/n8n/logs`

## Security Best Practices

1. **API Key:** Use a strong, randomly generated key (minimum 32 characters)
2. **HTTPS Only:** Never use HTTP in production
3. **Rate Limiting:** Keep enabled to prevent abuse
4. **Monitoring:** Set up alerts for high error rates
5. **Logging:** Regularly review logs for suspicious activity
6. **Secrets:** Never commit API keys to version control

## Production Deployment Checklist

- [ ] Set strong `N8N_WEBHOOK_API_KEY` in production environment
- [ ] Configure HTTPS/SSL certificate
- [ ] Set up database connection pooling
- [ ] Enable monitoring and alerting
- [ ] Configure log aggregation (e.g., CloudWatch, Datadog)
- [ ] Test webhook with production-like load
- [ ] Set up automated health checks
- [ ] Document rollback procedure
- [ ] Train support team on troubleshooting

## Support

For issues or questions:

1. Check logs: GET `/api/n8n/logs`
2. Check metrics: GET `/api/n8n/metrics`
3. Review circuit breaker state: GET `/api/n8n/webhook`
4. Check application logs

## License

Internal use only - Part of Inbox Copilot application
