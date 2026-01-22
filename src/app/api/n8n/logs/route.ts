import { NextRequest, NextResponse } from "next/server";
import { webhookLogger } from "@/lib/n8n/webhook-logger";

/**
 * GET /api/n8n/logs
 *
 * Retrieves recent webhook logs for debugging and monitoring
 *
 * Query parameters:
 * - limit: Number of logs to retrieve (default: 50, max: 500)
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

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    let limit = 50;

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500) {
        limit = parsedLimit;
      }
    }

    // Fetch logs
    const logs = await webhookLogger.getRecentLogs(limit);

    return NextResponse.json(
      {
        success: true,
        count: logs.length,
        limit,
        logs,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[n8n-logs] Error fetching logs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/n8n/logs
 *
 * Cleanup old webhook logs
 *
 * Query parameters:
 * - days: Number of days to keep (default: 7)
 *
 * Authentication: Requires N8N_WEBHOOK_API_KEY
 */
export async function DELETE(req: NextRequest) {
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

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    let daysToKeep = 7;

    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10);
      if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 365) {
        daysToKeep = parsedDays;
      }
    }

    // Cleanup logs
    const deletedCount = await webhookLogger.cleanupOldLogs(daysToKeep);

    webhookLogger.info('logs-cleanup', {
      message: `Cleaned up ${deletedCount} old log entries`,
      metadata: { daysToKeep, deletedCount },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Cleaned up ${deletedCount} old log entries`,
        daysToKeep,
        deletedCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[n8n-logs] Error cleaning up logs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
