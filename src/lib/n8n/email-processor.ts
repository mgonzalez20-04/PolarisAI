/**
 * Email Processing Service with Circuit Breaker Pattern
 *
 * Provides robust email processing with:
 * - Deduplication
 * - Retry logic
 * - Circuit breaker for database operations
 * - Caching for frequently accessed data
 * - Transaction support
 */

import { prisma } from "@/lib/prisma";
import { Prisma, User, Email } from "@prisma/client";
import { webhookLogger } from "./webhook-logger";
import { extractEmailAddress, extractNameFromEmail } from "./webhook-helpers";

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // milliseconds
}

interface EmailProcessorConfig {
  enableCache: boolean;
  cacheTimeout: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  circuitBreaker: CircuitBreakerConfig;
}

interface ProcessedEmailData {
  messageId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  cc?: string;
  receivedAt: Date;
  bodyPreview?: string;
  bodyText?: string;
  bodyHtml?: string;
  category: string;
  tags?: string[];
  sentiment: string;
  priority?: string;
  conversationId?: string;
  folderPath?: string;
  hasAttachments?: boolean;
  summary?: string;
}

interface ProcessResult {
  success: boolean;
  email?: Email;
  user?: User;
  created: boolean;
  cached?: boolean;
  error?: string;
  retries?: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
      // Try to transition to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      webhookLogger.info('circuit-breaker', {
        message: 'Circuit breaker transitioning to HALF_OPEN',
        metadata: { state: this.state },
      });
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        webhookLogger.info('circuit-breaker', {
          message: 'Circuit breaker CLOSED - service recovered',
          metadata: { state: this.state },
        });
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;

      webhookLogger.error('circuit-breaker', {
        message: `Circuit breaker OPEN - too many failures (${this.failureCount})`,
        metadata: {
          state: this.state,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        },
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

export class EmailProcessor {
  private config: EmailProcessorConfig;
  private circuitBreaker: CircuitBreaker;
  private userCache: Map<string, { user: User; timestamp: number }>;
  private deduplicationCache: Set<string>;

  constructor(config?: Partial<EmailProcessorConfig>) {
    this.config = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
      },
      ...config,
    };

    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    this.userCache = new Map();
    this.deduplicationCache = new Set();
  }

  /**
   * Process incoming email data from n8n webhook
   */
  async processEmail(data: ProcessedEmailData): Promise<ProcessResult> {
    const startTime = Date.now();

    try {
      // Check for duplicate (idempotency)
      if (this.isDuplicate(data.messageId)) {
        webhookLogger.warn('deduplication', {
          message: 'Duplicate email detected (already processing)',
          messageId: data.messageId,
        });

        return {
          success: false,
          created: false,
          error: 'Duplicate request',
        };
      }

      // Mark as processing
      this.markAsProcessing(data.messageId);

      // Extract recipient email
      const recipientEmail = extractEmailAddress(data.to);

      // Find or create user (with circuit breaker)
      const user = await this.findOrCreateUser(recipientEmail, data.to);

      // Create or update email (with retry logic)
      const { email, created } = await this.upsertEmailWithRetry(data, user.id);

      const duration = Date.now() - startTime;

      webhookLogger.success('email-processed', {
        message: created ? 'Email created successfully' : 'Email updated successfully',
        messageId: email.messageId,
        userId: user.id,
        emailId: email.id,
        duration,
        metadata: {
          subject: email.subject,
          category: data.category,
          priority: data.priority,
        },
      });

      return {
        success: true,
        email,
        user,
        created,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      webhookLogger.error('email-processing-failed', {
        message: 'Failed to process email',
        messageId: data.messageId,
        duration,
        error: error instanceof Error ? error : String(error),
        metadata: { subject: data.subject },
      });

      return {
        success: false,
        created: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Remove from processing cache after a delay
      setTimeout(() => {
        this.deduplicationCache.delete(data.messageId);
      }, 30000); // 30 seconds
    }
  }

  /**
   * Find or create user with caching and circuit breaker
   */
  private async findOrCreateUser(email: string, fullEmailString: string): Promise<User> {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.userCache.get(email);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.user;
      }
    }

    // Execute with circuit breaker
    const user = await this.circuitBreaker.execute(async () => {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const userName = extractNameFromEmail(fullEmailString) || email.split('@')[0];

        user = await prisma.user.create({
          data: {
            email,
            name: userName,
            role: 'user',
          },
        });

        webhookLogger.info('user-created', {
          message: 'New user created from webhook',
          userId: user.id,
          metadata: { email: user.email },
        });
      }

      return user;
    });

    // Update cache
    if (this.config.enableCache) {
      this.userCache.set(email, { user, timestamp: Date.now() });
    }

    return user;
  }

  /**
   * Upsert email with retry logic and transaction support
   */
  private async upsertEmailWithRetry(
    data: ProcessedEmailData,
    userId: string
  ): Promise<{ email: Email; created: boolean }> {
    let lastError: Error | undefined;
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(async () => {
          // Use transaction for consistency
          return await prisma.$transaction(async (tx) => {
            // Prepare categories
            const categories = [data.category, ...(data.tags || [])];

            // Check if email exists
            const existingEmail = await tx.email.findUnique({
              where: { messageId: data.messageId },
            });

            if (existingEmail) {
              // Update existing email
              const email = await tx.email.update({
                where: { messageId: data.messageId },
                data: {
                  isRead: false,
                  status: 'New',
                  categories: JSON.stringify(categories),
                  priority: data.priority || 'medium',
                  // Don't update immutable fields
                },
              });

              return { email, created: false };
            } else {
              // Create new email
              const email = await tx.email.create({
                data: {
                  messageId: data.messageId,
                  userId,
                  subject: data.subject,
                  from: data.from,
                  fromEmail: extractEmailAddress(data.fromEmail),
                  to: data.to,
                  cc: data.cc,
                  receivedAt: data.receivedAt,
                  bodyPreview: data.bodyPreview || data.summary,
                  bodyText: data.bodyText,
                  bodyHtml: data.bodyHtml,
                  isRead: false,
                  status: 'New',
                  priority: data.priority || 'medium',
                  categories: JSON.stringify(categories),
                  conversationId: data.conversationId,
                  folderId: null,
                  folderPath: data.folderPath || 'Inbox',
                  hasAttachments: data.hasAttachments || false,
                },
              });

              return { email, created: true };
            }
          });
        });

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries = attempt;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          webhookLogger.warn('retry-attempt', {
            message: `Retry attempt ${attempt + 1}/${this.config.maxRetries}`,
            messageId: data.messageId,
            metadata: { delay, error: lastError.message },
          });

          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to upsert email after retries');
  }

  /**
   * Check if messageId is already being processed (deduplication)
   */
  private isDuplicate(messageId: string): boolean {
    return this.deduplicationCache.has(messageId);
  }

  /**
   * Mark messageId as being processed
   */
  private markAsProcessing(messageId: string): void {
    this.deduplicationCache.add(messageId);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCaches(): void {
    this.userCache.clear();
    this.deduplicationCache.clear();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

// Singleton instance
export const emailProcessor = new EmailProcessor();

// Export types
export type { ProcessedEmailData, ProcessResult, EmailProcessorConfig };
export { CircuitState };
