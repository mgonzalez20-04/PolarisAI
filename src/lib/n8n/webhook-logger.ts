/**
 * Structured logging service for n8n webhook operations
 *
 * Provides detailed logging and metrics tracking for webhook processing
 * with support for both console and database logging.
 */

import { prisma } from "@/lib/prisma";

export type WebhookLogLevel = 'info' | 'warn' | 'error' | 'success';

export interface WebhookLogEntry {
  level: WebhookLogLevel;
  message: string;
  messageId?: string;
  userId?: string;
  emailId?: string;
  operation: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: Error | string;
}

export interface WebhookMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

class WebhookLogger {
  private metrics: WebhookMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageProcessingTime: 0,
  };

  /**
   * Log a webhook event with structured data
   */
  log(entry: WebhookLogEntry): void {
    const timestamp = new Date().toISOString();
    const prefix = `[n8n-webhook][${entry.level.toUpperCase()}]`;

    let message = `${prefix} ${entry.operation} - ${entry.message}`;

    if (entry.messageId) {
      message += ` | messageId: ${entry.messageId}`;
    }

    if (entry.userId) {
      message += ` | userId: ${entry.userId}`;
    }

    if (entry.emailId) {
      message += ` | emailId: ${entry.emailId}`;
    }

    if (entry.duration) {
      message += ` | duration: ${entry.duration}ms`;
    }

    // Console logging with appropriate method
    switch (entry.level) {
      case 'error':
        console.error(message, entry.error, entry.metadata);
        break;
      case 'warn':
        console.warn(message, entry.metadata);
        break;
      case 'info':
      case 'success':
        console.log(message, entry.metadata);
        break;
    }

    // Async database logging (fire and forget)
    this.persistLog(entry, timestamp).catch(err => {
      console.error('[webhook-logger] Failed to persist log:', err);
    });
  }

  /**
   * Log successful webhook processing
   */
  success(operation: string, data: Omit<WebhookLogEntry, 'level' | 'operation'>): void {
    this.log({
      level: 'success',
      operation,
      ...data,
    });

    this.metrics.successfulRequests++;
    this.metrics.totalRequests++;

    if (data.duration) {
      this.updateAverageProcessingTime(data.duration);
    }
  }

  /**
   * Log webhook error
   */
  error(operation: string, data: Omit<WebhookLogEntry, 'level' | 'operation'>): void {
    this.log({
      level: 'error',
      operation,
      ...data,
    });

    this.metrics.failedRequests++;
    this.metrics.totalRequests++;
  }

  /**
   * Log webhook warning
   */
  warn(operation: string, data: Omit<WebhookLogEntry, 'level' | 'operation'>): void {
    this.log({
      level: 'warn',
      operation,
      ...data,
    });
  }

  /**
   * Log webhook info
   */
  info(operation: string, data: Omit<WebhookLogEntry, 'level' | 'operation'>): void {
    this.log({
      level: 'info',
      operation,
      ...data,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebhookMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Update average processing time with new duration
   */
  private updateAverageProcessingTime(newDuration: number): void {
    const totalProcessed = this.metrics.successfulRequests;

    if (totalProcessed === 1) {
      this.metrics.averageProcessingTime = newDuration;
    } else {
      // Running average calculation
      const previousTotal = this.metrics.averageProcessingTime * (totalProcessed - 1);
      this.metrics.averageProcessingTime = (previousTotal + newDuration) / totalProcessed;
    }
  }

  /**
   * Persist log entry to database (if needed for audit trail)
   * Using AppSettings table for now, but could be a dedicated WebhookLog table
   */
  private async persistLog(entry: WebhookLogEntry, timestamp: string): Promise<void> {
    try {
      // Only persist errors and important events to avoid database bloat
      if (entry.level === 'error' || entry.level === 'warn') {
        const logData = {
          timestamp,
          level: entry.level,
          operation: entry.operation,
          message: entry.message,
          messageId: entry.messageId,
          userId: entry.userId,
          emailId: entry.emailId,
          duration: entry.duration,
          error: entry.error instanceof Error ? entry.error.message : entry.error,
          metadata: entry.metadata,
        };

        // Store in AppSettings with a TTL concept (you could add cleanup job)
        const key = `webhook_log_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

        await prisma.appSettings.create({
          data: {
            key,
            value: JSON.stringify(logData),
            description: `n8n webhook log: ${entry.level}`,
          },
        });
      }
    } catch (error) {
      // Silent fail - don't crash webhook processing due to logging failure
      console.error('[webhook-logger] Database persistence failed:', error);
    }
  }

  /**
   * Query recent webhook logs from database
   */
  async getRecentLogs(limit = 100): Promise<Array<WebhookLogEntry & { timestamp: string }>> {
    try {
      const logs = await prisma.appSettings.findMany({
        where: {
          key: { startsWith: 'webhook_log_' },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
      });

      return logs.map(log => {
        const data = JSON.parse(log.value);
        return {
          ...data,
          level: data.level,
          message: data.message,
          operation: data.operation,
        };
      });
    } catch (error) {
      console.error('[webhook-logger] Failed to retrieve logs:', error);
      return [];
    }
  }

  /**
   * Clean up old logs (run periodically)
   */
  async cleanupOldLogs(daysToKeep = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.appSettings.deleteMany({
        where: {
          key: { startsWith: 'webhook_log_' },
          updatedAt: { lt: cutoffDate },
        },
      });

      return result.count;
    } catch (error) {
      console.error('[webhook-logger] Failed to cleanup logs:', error);
      return 0;
    }
  }
}

// Singleton instance
export const webhookLogger = new WebhookLogger();

// Export type for external use
export type { WebhookLogger };
