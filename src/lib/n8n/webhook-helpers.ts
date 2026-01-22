/**
 * Helper functions for n8n webhook processing
 *
 * Includes data extraction, validation, and sanitization utilities
 */

/**
 * Extracts the name from an email string in format "Name <email@domain.com>"
 * Returns null if the email is just "email@domain.com" without a name
 *
 * @example
 * extractNameFromEmail("Juan Perez <juan@email.com>") // "Juan Perez"
 * extractNameFromEmail("juan@email.com") // null
 */
export function extractNameFromEmail(emailString: string): string | null {
  const match = emailString.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return sanitizeString(match[1].trim());
  }
  return null;
}

/**
 * Extracts just the email address from a string that might be in format
 * "Name <email@domain.com>" or just "email@domain.com"
 *
 * @example
 * extractEmailAddress("Juan Perez <juan@email.com>") // "juan@email.com"
 * extractEmailAddress("juan@email.com") // "juan@email.com"
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  return emailString.trim().toLowerCase();
}

/**
 * Validates that a messageId has a valid format
 * Microsoft Graph messageIds are typically alphanumeric with dots, dashes, and underscores
 *
 * @example
 * isValidMessageId("AAMkADtest123") // true
 * isValidMessageId("invalid id!") // false
 */
export function isValidMessageId(messageId: string): boolean {
  // Microsoft Graph message IDs are alphanumeric with dots, dashes, underscores
  // Minimum length of 10 to avoid trivial IDs
  return /^[a-zA-Z0-9._-]+$/.test(messageId) && messageId.length >= 10;
}

/**
 * Sanitizes a string by removing potentially harmful characters
 * Prevents XSS and injection attacks
 *
 * @example
 * sanitizeString("<script>alert('xss')</script>") // "scriptalert('xss')/script"
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes HTML content for safe storage
 * Removes dangerous scripts while preserving formatting
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove dangerous tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Validates email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates and sanitizes a category value
 */
export function validateCategory(category: string): boolean {
  const validCategories = ['bug', 'feature', 'question', 'support', 'other'];
  return validCategories.includes(category.toLowerCase());
}

/**
 * Validates and sanitizes a sentiment value
 */
export function validateSentiment(sentiment: string): boolean {
  const validSentiments = ['positive', 'negative', 'neutral'];
  return validSentiments.includes(sentiment.toLowerCase());
}

/**
 * Validates and sanitizes a priority value
 */
export function validatePriority(priority: string): boolean {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(priority.toLowerCase());
}

/**
 * Validates that tags array contains only valid strings
 */
export function validateTags(tags: unknown): tags is string[] {
  if (!Array.isArray(tags)) return false;

  return tags.every(tag =>
    typeof tag === 'string' &&
    tag.length > 0 &&
    tag.length <= 50 &&
    /^[a-zA-Z0-9\s-_]+$/.test(tag)
  );
}

/**
 * Validates date string and converts to Date object
 */
export function validateAndParseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Check if date is reasonable (not too far in past or future)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (date < oneYearAgo || date > oneYearFromNow) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generates a hash for deduplication purposes
 */
export function generateEmailHash(messageId: string, from: string, subject: string): string {
  const data = `${messageId}|${from}|${subject}`;
  // Simple hash function (for production, use a proper crypto library)
  let hash = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Validates complete webhook payload structure
 */
export interface WebhookValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWebhookPayload(payload: unknown): WebhookValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { isValid: false, errors, warnings };
  }

  const data = payload as Record<string, unknown>;

  // Required fields
  if (!data.messageId || typeof data.messageId !== 'string') {
    errors.push('messageId is required and must be a string');
  } else if (!isValidMessageId(data.messageId as string)) {
    errors.push('messageId has invalid format');
  }

  if (!data.from || typeof data.from !== 'string') {
    errors.push('from is required and must be a string');
  }

  if (!data.fromEmail || typeof data.fromEmail !== 'string') {
    errors.push('fromEmail is required and must be a string');
  } else if (!isValidEmail(data.fromEmail as string)) {
    errors.push('fromEmail has invalid format');
  }

  if (!data.to || typeof data.to !== 'string') {
    errors.push('to is required and must be a string');
  } else if (!isValidEmail(extractEmailAddress(data.to as string))) {
    errors.push('to has invalid email format');
  }

  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('subject is required and must be a string');
  }

  if (!data.receivedAt || typeof data.receivedAt !== 'string') {
    errors.push('receivedAt is required and must be a string');
  } else if (!validateAndParseDate(data.receivedAt as string)) {
    errors.push('receivedAt has invalid date format');
  }

  // AI Catalog validation
  if (!data.aiCatalog || typeof data.aiCatalog !== 'object') {
    errors.push('aiCatalog is required and must be an object');
  } else {
    const aiCatalog = data.aiCatalog as Record<string, unknown>;

    if (!aiCatalog.category || !validateCategory(aiCatalog.category as string)) {
      errors.push('aiCatalog.category is invalid');
    }

    if (!aiCatalog.sentiment || !validateSentiment(aiCatalog.sentiment as string)) {
      errors.push('aiCatalog.sentiment is invalid');
    }

    if (aiCatalog.priority && !validatePriority(aiCatalog.priority as string)) {
      warnings.push('aiCatalog.priority has invalid value, will use default');
    }

    if (aiCatalog.tags && !validateTags(aiCatalog.tags)) {
      warnings.push('aiCatalog.tags has invalid format, will be ignored');
    }
  }

  // Optional fields validation
  if (data.bodyText && typeof data.bodyText === 'string' && (data.bodyText as string).length > 100000) {
    warnings.push('bodyText is very long, may impact performance');
  }

  if (data.bodyHtml && typeof data.bodyHtml === 'string' && (data.bodyHtml as string).length > 100000) {
    warnings.push('bodyHtml is very long, may impact performance');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extracts clean text from HTML body
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Rate limiting utility - tracks requests by IP/identifier
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if identifier has exceeded rate limit
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return true;
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(identifier) || [];
    timestamps = timestamps.filter(ts => ts > windowStart);

    return Math.max(0, this.maxRequests - timestamps.length);
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Export singleton rate limiter instance
export const webhookRateLimiter = new RateLimiter(
  100, // 100 requests
  60000 // per minute
);
