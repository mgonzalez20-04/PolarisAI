# Architecture Documentation

## Overview

PolarisAI es una aplicación full-stack construida con Next.js 15 (App Router), diseñada para ayudar a equipos de soporte a gestionar correos con sugerencias IA basadas en resoluciones históricas.

## High-Level Architecture

```
┌─────────────────┐
│   Browser/UI    │
│  (React/Next)   │
└────────┬────────┘
         │
         ├──────────┐
         │          │
    ┌────▼────┐ ┌──▼───────────┐
    │  Auth   │ │   API Routes │
    │ (Next   │ │  (Next.js)   │
    │  Auth)  │ │              │
    └────┬────┘ └──┬───────────┘
         │         │
         ▼         ▼
    ┌────────────────────┐
    │  Business Logic    │
    │  - Email Service   │
    │  - Suggestion Svc  │
    └────┬───────────────┘
         │
         ├─────────────┬──────────────┐
         │             │              │
    ┌────▼──────┐ ┌───▼────────┐ ┌──▼────────┐
    │  Prisma   │ │  Microsoft │ │  OpenAI   │
    │    ORM    │ │   Graph    │ │    API    │
    └────┬──────┘ └────────────┘ └───────────┘
         │
    ┌────▼──────┐
    │  Database │
    │  (SQLite) │
    └───────────┘
```

## Core Components

### 1. Authentication Layer (`src/auth.ts`)

**Technology**: NextAuth.js (Auth.js v5)

**Responsibilities**:
- Multi-provider authentication (Microsoft, Google, GitHub, Credentials)
- Session management (JWT-based)
- Token refresh handling
- Role-based access control

**Flow**:
```
User → Sign In → Provider OAuth → Callback →
Create Session → Store in JWT → Set Cookie →
Redirect to Dashboard
```

**Key Features**:
- Dynamic provider configuration (based on env vars)
- Access token storage for Microsoft Graph calls
- User role assignment (user/admin)

### 2. Email Integration Layer (`src/lib/email/`)

**Provider Pattern**: Abstract `EmailProvider` interface with multiple implementations

#### EmailProvider Interface
```typescript
interface EmailProvider {
  name: string;
  syncEmails(userId, accessToken): Promise<EmailMessage[]>;
  getEmail(messageId, accessToken): Promise<EmailMessage>;
  markAsRead(messageId, accessToken): Promise<void>;
}
```

#### Implementations:
1. **MicrosoftGraphProvider**: Email integration
   - Uses `@microsoft/microsoft-graph-client`
   - Fetches from `/me/mailFolders/inbox/messages`
   - Supports pagination
   - Maps Graph API responses to normalized format

#### EmailService (Orchestration)
- Manages provider selection
- Handles email persistence to database
- Deduplication logic (by messageId)
- Multi-user data isolation

### 3. Suggestion Engine Layer (`src/lib/suggestions/`)

**Strategy Pattern**: Abstract `SuggestionEngine` interface with swappable implementations

#### SuggestionEngine Interface
```typescript
interface SuggestionEngine {
  name: string;
  generateSuggestions(
    emailSubject,
    emailBody,
    userId
  ): Promise<SuggestionResult>;
}
```

#### Implementations:

##### A. SimpleTextSimilarityEngine (Baseline)
**Algorithm**:
1. Tokenize email text (subject + body)
2. Remove stop words
3. Fetch all resolved cases for user
4. Calculate Jaccard similarity for each case:
   ```
   similarity = intersection / union
   ```
5. Sort by similarity, take top 5
6. Generate response based on most similar case

**Pros**: Fast, no API dependencies, works offline
**Cons**: Less accurate, keyword-based only

##### B. EmbeddingEngine (Advanced)
**Algorithm**:
1. Generate embedding for incoming email using OpenAI
2. Fetch all resolved cases with stored embeddings
3. Calculate cosine similarity:
   ```
   similarity = dot(A, B) / (||A|| * ||B||)
   ```
4. Filter high-similarity cases (>0.7)
5. Use GPT to generate contextual response

**Pros**: Semantic understanding, better suggestions
**Cons**: Requires OpenAI API key, slower, costs money

#### SuggestionService (Orchestration)
- Selects engine based on configuration
- Manages feature flags
- Provides unified interface to API layer

### 4. Data Layer

#### Database Schema (Prisma)

```
User (1) ──────< (N) Email
  │                    │
  │                    │
  │                   (1)
  │                    │
  └──────< (N) Case <──┘

User (1) ──────< (N) Account (OAuth tokens)
  │
  └──────< (N) Session
```

**Key Relationships**:
- User → Emails: One user has many emails
- User → Cases: One user creates many cases
- Email → Case: One email can have one case
- User → Accounts: One user can have multiple OAuth accounts

**Data Isolation**: All queries filtered by `userId` to ensure multi-tenancy

### 5. API Layer (`src/app/api/`)

RESTful API design:

```
POST   /api/emails/sync              # Sync emails from provider
GET    /api/emails                   # List emails (filtered)
GET    /api/emails/[id]              # Get email details
PATCH  /api/emails/[id]              # Update email
GET    /api/emails/[id]/suggestions  # Get AI suggestions

GET    /api/cases                    # List cases
POST   /api/cases                    # Create case
GET    /api/cases/[id]               # Get case details
PATCH  /api/cases/[id]               # Update case
DELETE /api/cases/[id]               # Delete case
```

**Authentication**: All routes protected by `auth()` middleware
**Authorization**: User can only access their own resources

### 6. UI Layer (`src/app/dashboard/`)

**Framework**: React Server Components + Client Components

**Pages**:
- `/dashboard` - Inbox (list emails)
- `/dashboard/email/[id]` - Email detail with suggestions
- `/dashboard/cases` - Case list
- `/dashboard/cases/[id]` - Case detail
- `/dashboard/settings` - Configuration

**State Management**:
- Server state: React Server Components
- Client state: React hooks (useState, useEffect)
- No global state library (keep it simple)

**Data Fetching**:
- Client-side fetch in `useEffect`
- Could be optimized with React Query or SWR

## Data Flow Examples

### Email Sync Flow

```
User clicks "Sync Emails"
  ↓
POST /api/emails/sync
  ↓
emailService.syncUserEmails()
  ↓
provider.syncEmails() → Microsoft Graph API
  ↓
Map Graph response to EmailMessage[]
  ↓
For each email:
  - Check if exists (by messageId)
  - If not, prisma.email.create()
  - If yes, prisma.email.update()
  ↓
Return { success: true, emailsSynced: N }
  ↓
UI refreshes email list
```

### Suggestion Generation Flow

```
User opens email
  ↓
GET /api/emails/[id]/suggestions
  ↓
suggestionService.getSuggestions()
  ↓
Selected engine.generateSuggestions()
  ↓
SimpleTextSimilarity:
  - Fetch resolved cases from DB
  - Calculate similarity scores
  - Generate suggestions
  ↓
Return SuggestionResult
  ↓
UI displays suggestions + suggested response
```

### Case Creation Flow

```
User clicks "Create Case"
  ↓
POST /api/cases with emailId
  ↓
prisma.case.create()
  ↓
prisma.email.update({ hasCase: true })
  ↓
(Optional) Generate embedding for future suggestions
  ↓
Return case
  ↓
Navigate to case detail page
```

## Security Considerations

### Authentication
- JWT tokens stored in HTTP-only cookies
- Session expiration handled by NextAuth
- CSRF protection built into Next.js

### Authorization
- All database queries filtered by `userId`
- Session checked on every API route
- Role-based access (user/admin)

### Data Validation
- Zod schemas for request validation (can be added)
- Prisma type safety at runtime
- TypeScript compile-time checks

### Email Content
- HTML emails sanitized (rendered in iframe or sanitized)
- No XSS vulnerabilities in email display
- SQL injection prevented by Prisma

## Performance Optimizations

### Current
- Database indexes on common queries:
  - `userId + receivedAt` (email list)
  - `userId + status` (case list)
- JWT sessions (no database lookup per request)
- Lazy loading of suggestions (only when email opened)

### Future Recommendations
1. **Caching**:
   - Redis for suggestion results
   - Cache resolved cases in memory
   - CDN for static assets

2. **Database**:
   - Pagination for email list
   - Virtual scrolling for large lists
   - Background jobs for email sync

3. **Suggestions**:
   - Pre-compute embeddings for resolved cases
   - Vector database (Pinecone, Weaviate) for embeddings
   - Batch embedding generation

## Scalability Considerations

### Current Limitations
- Sync is synchronous (blocks UI)
- No background workers
- SQLite (single-threaded)
- Embeddings stored as JSON strings

### Scaling Strategy

**To 1,000 users**:
- Migrate to PostgreSQL
- Add Redis caching
- Implement pagination

**To 10,000 users**:
- Background job queue (BullMQ, Inngest)
- Webhook subscriptions from Microsoft Graph
- Horizontal scaling of Next.js instances
- Read replicas for database

**To 100,000+ users**:
- Microservices architecture
- Separate email sync service
- Vector database for embeddings
- Event-driven architecture (Kafka, RabbitMQ)
- CDN for static content
- Multi-region deployment

## Testing Strategy (Not Implemented)

Recommended test coverage:

1. **Unit Tests**:
   - Suggestion engines (similarity calculations)
   - Text processing utilities
   - Email mapping functions

2. **Integration Tests**:
   - API routes
   - Database operations
   - Provider integrations (mocked)

3. **E2E Tests**:
   - Auth flow
   - Email sync workflow
   - Case creation workflow
   - Suggestion generation

## Monitoring & Observability (Not Implemented)

Recommended additions:

1. **Logging**:
   - Structured logs (Winston, Pino)
   - Log levels (error, warn, info, debug)
   - Request IDs for tracing

2. **Metrics**:
   - API response times
   - Email sync duration
   - Suggestion accuracy
   - User engagement

3. **Error Tracking**:
   - Sentry for exception tracking
   - User feedback on errors
   - Alert on critical errors

4. **Performance**:
   - Vercel Analytics
   - Core Web Vitals
   - Database query performance

## Future Architecture Improvements

1. **Message Queue**:
   - Async email processing
   - Retry failed syncs
   - Webhook processing

2. **WebSockets**:
   - Real-time email updates
   - Collaborative case editing
   - Live notifications

3. **GraphQL API**:
   - More flexible queries
   - Reduce over-fetching
   - Type-safe client

4. **Microservices** (at scale):
   - Auth service
   - Email sync service
   - Suggestion service
   - Notification service

## Conclusion

PolarisAI follows a modular, layered architecture with:
- Clear separation of concerns
- Pluggable providers and engines
- Type safety throughout
- Ready for production with minor enhancements
- Scalable foundation for growth
