import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { webhookLogger } from "@/lib/n8n/webhook-logger";
import { emailProcessor } from "@/lib/n8n/email-processor";

/**
 * GET /api/n8n/metrics
 *
 * Provides detailed metrics and monitoring data for n8n webhook integration
 *
 * Authentication: Requires N8N_WEBHOOK_API_KEY
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication
    const apiKey = req.headers.get('x-api-key') ||
                   req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey || apiKey !== process.env.N8N_WEBHOOK_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get webhook metrics
    const webhookMetrics = webhookLogger.getMetrics();

    // Get circuit breaker state
    const circuitState = emailProcessor.getCircuitState();

    // Get database stats
    const [totalEmails, emailsLast24h, emailsLast7d] = await Promise.all([
      prisma.email.count(),
      prisma.email.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.email.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get category breakdown (last 7 days)
    const categoryStats = await prisma.email.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        id: true,
      },
    });

    // Get priority breakdown (last 7 days)
    const priorityStats = await prisma.email.groupBy({
      by: ['priority'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        id: true,
      },
    });

    // Calculate success rate
    const successRate = webhookMetrics.totalRequests > 0
      ? (webhookMetrics.successfulRequests / webhookMetrics.totalRequests) * 100
      : 0;

    // Calculate error rate
    const errorRate = webhookMetrics.totalRequests > 0
      ? (webhookMetrics.failedRequests / webhookMetrics.totalRequests) * 100
      : 0;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        webhook: {
          totalRequests: webhookMetrics.totalRequests,
          successfulRequests: webhookMetrics.successfulRequests,
          failedRequests: webhookMetrics.failedRequests,
          successRate: `${successRate.toFixed(2)}%`,
          errorRate: `${errorRate.toFixed(2)}%`,
          averageProcessingTime: `${Math.round(webhookMetrics.averageProcessingTime)}ms`,
          lastProcessedAt: webhookMetrics.lastProcessedAt,
        },
        system: {
          circuitBreaker: circuitState,
          status: circuitState === 'CLOSED' ? 'healthy' : 'degraded',
        },
        database: {
          totalEmails,
          emailsLast24h,
          emailsLast7d,
          averageEmailsPerDay: Math.round(emailsLast7d / 7),
        },
        categories: categoryStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        priorities: priorityStats.reduce((acc, stat) => {
          if (stat.priority) {
            acc[stat.priority] = stat._count.id;
          }
          return acc;
        }, {} as Record<string, number>),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[n8n-metrics] Error fetching metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/n8n/metrics/reset
 *
 * Reset webhook metrics (useful for testing or maintenance)
 *
 * Authentication: Requires N8N_WEBHOOK_API_KEY
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication
    const apiKey = req.headers.get('x-api-key') ||
                   req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey || apiKey !== process.env.N8N_WEBHOOK_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Reset metrics
    webhookLogger.resetMetrics();

    // Reset circuit breaker
    emailProcessor.resetCircuitBreaker();

    webhookLogger.info('metrics-reset', {
      message: 'Webhook metrics and circuit breaker reset',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[n8n-metrics] Error resetting metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
