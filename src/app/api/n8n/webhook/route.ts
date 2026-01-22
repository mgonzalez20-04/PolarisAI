import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emailProcessor, ProcessedEmailData } from "@/lib/n8n/email-processor";
import { webhookLogger } from "@/lib/n8n/webhook-logger";
import {
  extractEmailAddress,
  webhookRateLimiter,
  validateWebhookPayload,
  sanitizeString,
  sanitizeHtml,
  truncateText,
} from "@/lib/n8n/webhook-helpers";

// Enhanced validation schema for n8n webhook payload
const N8nWebhookSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  subject: z.string(),
  from: z.string(),
  fromEmail: z.string().email("Invalid fromEmail format"),
  to: z.string().email("Invalid to email format"),
  cc: z.string().optional(),
  receivedAt: z.string().datetime("Invalid receivedAt date format"),
  bodyPreview: z.string().optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  aiCatalog: z.object({
    category: z.enum(['bug', 'feature', 'question', 'support', 'other']),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),
  conversationId: z.string().optional(),
  folderId: z.string().optional(),
  folderPath: z.string().optional(),
  hasAttachments: z.boolean().optional(),
});

type N8nWebhookPayload = z.infer<typeof N8nWebhookSchema>;

/**
 * POST /api/n8n/webhook
 *
 * Receives emails cataloged by n8n workflows and stores them in the database.
 *
 * Features:
 * - API key authentication
 * - Rate limiting (100 req/min per IP)
 * - Payload validation and sanitization
 * - Idempotent operations (duplicate detection)
 * - Retry logic with circuit breaker
 * - Detailed logging and metrics
 * - Transaction support for data consistency
 *
 * Authentication: Requires N8N_WEBHOOK_API_KEY in x-api-key header or Authorization header
 *
 * Payload structure: See N8nWebhookSchema
 */
export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  let messageId: string | undefined;

  try {
    // ============================================
    // 1. RATE LIMITING
    // ============================================
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    if (webhookRateLimiter.isRateLimited(clientIp)) {
      const remaining = webhookRateLimiter.getRemainingRequests(clientIp);

      webhookLogger.warn('rate-limit-exceeded', {
        message: 'Rate limit exceeded for client',
        metadata: { clientIp, remaining },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          details: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60, // seconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': remaining.toString(),
          },
        }
      );
    }

    // ============================================
    // 2. API KEY AUTHENTICATION
    // ============================================
    const apiKey = req.headers.get('x-api-key') ||
                   req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      webhookLogger.warn('auth-missing', {
        message: 'Missing API key',
        metadata: { clientIp },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: 'API key is required. Use x-api-key header or Authorization Bearer token.',
        },
        { status: 401 }
      );
    }

    if (apiKey !== process.env.N8N_WEBHOOK_API_KEY) {
      webhookLogger.warn('auth-invalid', {
        message: 'Invalid API key',
        metadata: { clientIp, keyPrefix: apiKey.substring(0, 8) },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: 'Invalid API key provided.',
        },
        { status: 401 }
      );
    }

    // ============================================
    // 3. PAYLOAD PARSING & VALIDATION
    // ============================================
    let body: unknown;

    try {
      body = await req.json();
    } catch (error) {
      webhookLogger.error('payload-parse-error', {
        message: 'Failed to parse JSON payload',
        error: error instanceof Error ? error : String(error),
        metadata: { clientIp },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          details: 'Request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    // Advanced validation
    const advancedValidation = validateWebhookPayload(body);

    if (!advancedValidation.isValid) {
      webhookLogger.warn('validation-failed', {
        message: 'Webhook payload validation failed',
        metadata: {
          clientIp,
          errors: advancedValidation.errors,
          warnings: advancedValidation.warnings,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload',
          details: advancedValidation.errors,
          warnings: advancedValidation.warnings,
        },
        { status: 400 }
      );
    }

    // Zod validation
    const validationResult = N8nWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      webhookLogger.error('schema-validation-failed', {
        message: 'Schema validation failed',
        metadata: {
          clientIp,
          errors: validationResult.error.errors,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Schema validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const payload: N8nWebhookPayload = validationResult.data;
    messageId = payload.messageId;

    // Log warnings if any
    if (advancedValidation.warnings.length > 0) {
      webhookLogger.warn('validation-warnings', {
        message: 'Payload has warnings',
        messageId: payload.messageId,
        metadata: { warnings: advancedValidation.warnings },
      });
    }

    // ============================================
    // 4. DATA SANITIZATION
    // ============================================
    const sanitizedData: ProcessedEmailData = {
      messageId: payload.messageId,
      subject: sanitizeString(payload.subject, 500),
      from: sanitizeString(payload.from, 200),
      fromEmail: extractEmailAddress(payload.fromEmail),
      to: payload.to,
      cc: payload.cc ? sanitizeString(payload.cc, 500) : undefined,
      receivedAt: new Date(payload.receivedAt),
      bodyPreview: payload.bodyPreview
        ? truncateText(sanitizeString(payload.bodyPreview), 500)
        : undefined,
      bodyText: payload.bodyText
        ? sanitizeString(payload.bodyText, 50000)
        : undefined,
      bodyHtml: payload.bodyHtml
        ? sanitizeHtml(payload.bodyHtml)
        : undefined,
      category: payload.aiCatalog.category,
      tags: payload.aiCatalog.tags?.map(tag => sanitizeString(tag, 50)),
      sentiment: payload.aiCatalog.sentiment,
      priority: payload.aiCatalog.priority,
      conversationId: payload.conversationId
        ? sanitizeString(payload.conversationId, 200)
        : undefined,
      folderPath: payload.folderPath
        ? sanitizeString(payload.folderPath, 200)
        : undefined,
      hasAttachments: payload.hasAttachments,
      summary: payload.aiCatalog.summary
        ? truncateText(sanitizeString(payload.aiCatalog.summary), 500)
        : undefined,
    };

    webhookLogger.info('processing-start', {
      message: 'Starting email processing',
      messageId: payload.messageId,
      metadata: {
        subject: sanitizedData.subject,
        category: sanitizedData.category,
        priority: sanitizedData.priority,
      },
    });

    // ============================================
    // 5. EMAIL PROCESSING (with Circuit Breaker & Retry)
    // ============================================
    const result = await emailProcessor.processEmail(sanitizedData);

    if (!result.success) {
      // Check if it's a duplicate (not an error)
      if (result.error === 'Duplicate request') {
        return NextResponse.json(
          {
            success: true,
            duplicate: true,
            messageId: payload.messageId,
            message: 'Email already being processed (idempotent)',
          },
          { status: 200 }
        );
      }

      // Actual processing error
      webhookLogger.error('processing-failed', {
        message: 'Email processing failed',
        messageId: payload.messageId,
        error: result.error,
        duration: Date.now() - requestStartTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Processing failed',
          details: result.error,
          messageId: payload.messageId,
        },
        { status: 500 }
      );
    }

    // ============================================
    // 6. SUCCESS RESPONSE
    // ============================================
    const processingTime = Date.now() - requestStartTime;
    const remaining = webhookRateLimiter.getRemainingRequests(clientIp);

    webhookLogger.success('webhook-complete', {
      message: result.created ? 'New email created' : 'Email updated',
      messageId: result.email!.messageId,
      userId: result.user!.id,
      emailId: result.email!.id,
      duration: processingTime,
      metadata: {
        subject: result.email!.subject,
        category: payload.aiCatalog.category,
        priority: result.email!.priority,
        created: result.created,
      },
    });

    return NextResponse.json(
      {
        success: true,
        emailId: result.email!.id,
        messageId: result.email!.messageId,
        userId: result.user!.id,
        created: result.created,
        processingTime,
        message: result.created
          ? 'Email received and processed successfully'
          : 'Email updated successfully',
      },
      {
        status: result.created ? 201 : 200,
        headers: {
          'X-Processing-Time': processingTime.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );

  } catch (error) {
    // ============================================
    // 7. GLOBAL ERROR HANDLER
    // ============================================
    const processingTime = Date.now() - requestStartTime;

    webhookLogger.error('unexpected-error', {
      message: 'Unexpected error in webhook processing',
      messageId,
      error: error instanceof Error ? error : String(error),
      duration: processingTime,
      metadata: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Don't leak implementation details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: isDevelopment
          ? error instanceof Error
            ? error.message
            : String(error)
          : 'An unexpected error occurred. Please try again later.',
        messageId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/n8n/webhook
 *
 * Health check endpoint for the webhook
 */
export async function GET(req: NextRequest) {
  try {
    const metrics = webhookLogger.getMetrics();
    const circuitState = emailProcessor.getCircuitState();

    return NextResponse.json(
      {
        success: true,
        status: 'operational',
        circuitBreaker: circuitState,
        metrics: {
          totalRequests: metrics.totalRequests,
          successRate:
            metrics.totalRequests > 0
              ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2) + '%'
              : 'N/A',
          averageProcessingTime: Math.round(metrics.averageProcessingTime) + 'ms',
        },
        message: 'n8n webhook endpoint is healthy',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/n8n/webhook
 *
 * CORS preflight support
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Allow': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      },
    }
  );
}
