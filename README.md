# PolarisAI

Asistente IA para gestión de correos de soporte que proporciona sugerencias inteligentes basadas en resoluciones históricas de casos.

## Features

- **Multi-Provider Authentication**: Microsoft/Azure AD, Google, GitHub, and credentials-based login
- **Email Integration**: Connect to Microsoft 365/Outlook via Microsoft Graph API
- **AI-Powered Suggestions**: Get smart recommendations based on similar resolved cases
- **Case Management**: Track and resolve support tickets with full history
- **Dual Suggestion Engines**:
  - Simple Text Similarity (keyword-based, always available)
  - Embedding-based Similarity (OpenAI embeddings, optional)
- **Modern UI**: Clean, responsive interface built with shadcn/ui

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI**: TailwindCSS + shadcn/ui
- **Database**: SQLite (dev) / PostgreSQL (production) + Prisma ORM
- **Auth**: NextAuth.js (Auth.js v5)
- **Email**: Microsoft Graph Client
- **AI**: OpenAI (optional, for embeddings)

## Project Structure

```
polarisai/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data with example cases
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── emails/        # Email management & sync
│   │   │   └── cases/         # Case management
│   │   ├── auth/              # Authentication pages
│   │   └── dashboard/         # Main application pages
│   │       ├── email/[id]/    # Email detail with suggestions
│   │       ├── cases/         # Case management
│   │       └── settings/      # Settings page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── sidebar.tsx        # Main navigation
│   ├── lib/
│   │   ├── email/             # Email providers
│   │   │   ├── microsoft-graph-provider.ts
│   │   │   └── email-service.ts
│   │   ├── suggestions/       # Suggestion engines
│   │   │   ├── simple-text-similarity-engine.ts
│   │   │   ├── embedding-engine.ts
│   │   │   └── suggestion-service.ts
│   │   ├── prisma.ts          # Prisma client
│   │   └── utils.ts           # Utilities
│   └── auth.ts                # NextAuth configuration
├── .env.local                 # Local environment variables
├── .env.example               # Example environment variables
└── package.json
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- (Optional) Azure account for Microsoft Graph integration
- (Optional) OpenAI API key for embedding-based suggestions

### 2. Installation

```bash
# Clone or navigate to the project directory
cd inbox-copilot

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 3. Environment Configuration

Edit `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth (generate secret with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Feature Flags
ENABLE_EMBEDDING_ENGINE="false"     # Set to "true" to enable OpenAI embeddings

# Microsoft/Azure AD (required)
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common"        # or your tenant ID

# OpenAI (optional, for embedding engine)
OPENAI_API_KEY="your-openai-api-key"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma db push

# Seed with example data (creates resolved cases for suggestions)
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Microsoft Graph / Azure AD Setup

To connect to Microsoft 365/Outlook emails, you need to register an application in Azure AD.

### Step 1: Register App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: PolarisAI
   - **Supported account types**: Choose based on your needs
     - Single tenant: Your organization only
     - Multitenant: Any Azure AD directory
     - Multitenant + personal: Any Azure AD + personal Microsoft accounts
   - **Redirect URI**:
     - Platform: Web
     - URL: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
     - For production: `https://yourdomain.com/api/auth/callback/microsoft-entra-id`

### Step 2: Configure API Permissions

1. Go to **API permissions** in your app registration
2. Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**
3. Add these permissions:
   - `openid`
   - `profile`
   - `email`
   - `offline_access` (for refresh tokens)
   - `Mail.Read` (read user's mail)
   - `Mail.ReadBasic` (read basic mail properties)
   - `User.Read` (read user profile)
4. Click **Grant admin consent** (requires admin rights)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and choose expiration
4. **Copy the secret value immediately** (you won't be able to see it again)

### Step 4: Update Environment Variables

```env
MICROSOFT_CLIENT_ID="<your-application-client-id>"
MICROSOFT_CLIENT_SECRET="<your-client-secret-value>"
MICROSOFT_TENANT_ID="common"  # or your specific tenant ID
```

### Step 5: Test Connection

1. Restart your dev server
2. Sign in with Microsoft account
3. Accept permissions when prompted
4. Go to Inbox and click "Sync Emails"

## Configuration Options

### Suggestion Engines

#### Simple Text Similarity (Default)
- Always available, no API keys required
- Uses keyword-based Jaccard similarity
- Fast and efficient
- Good for basic use cases

#### Embedding-based Similarity (Optional)
- Requires OpenAI API key
- Uses `text-embedding-3-small` model
- More accurate semantic matching
- Generates AI-powered response suggestions
- Enable with: `ENABLE_EMBEDDING_ENGINE="true"`

### Multi-Tenant Support

The application supports multiple users with data isolation:
- Each user only sees their own emails and cases
- Role-based access (user/admin)
- Admin role can manage global settings (future feature)

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Emails
- `GET /api/emails` - List user's emails (with filters)
- `GET /api/emails/[id]` - Get email details
- `PATCH /api/emails/[id]` - Update email (mark as read, etc.)
- `POST /api/emails/sync` - Sync emails from provider
- `GET /api/emails/[id]/suggestions` - Get AI suggestions for email

### Cases
- `GET /api/cases` - List user's cases (with filters)
- `POST /api/cases` - Create new case
- `GET /api/cases/[id]` - Get case details
- `PATCH /api/cases/[id]` - Update case
- `DELETE /api/cases/[id]` - Delete case

## Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Re-seed after reset
npm run db:seed
```

## Production Deployment

### Database Migration

For production with PostgreSQL:

1. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/inboxcopilot?schema=public"
```

2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Environment Variables for Production

```env
# Security
NEXTAUTH_SECRET="<generate-strong-secret>"
NEXTAUTH_URL="https://yourdomain.com"

# Production database
DATABASE_URL="postgresql://..."

# Required: Microsoft credentials
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."
MICROSOFT_TENANT_ID="common"

# Optional: OpenAI for advanced suggestions
OPENAI_API_KEY="..."
ENABLE_EMBEDDING_ENGINE="true"
```

### Deployment Platforms

The application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **AWS/Google Cloud/Azure** with Docker

### Build for Production

```bash
npm run build
npm start
```

## Considerations & Next Steps

### Current Limitations

1. **Email Sync**: Manual sync required (click "Sync Emails" button)
2. **Rate Limits**: Microsoft Graph has rate limits (consider caching strategies)
3. **Token Refresh**: Tokens expire; users may need to re-authenticate
4. **Embedding Storage**: SQLite stores embeddings as JSON strings (consider vector DB for scale)

### Recommended Enhancements

1. **Background Sync**:
   ```typescript
   // Add cron job or background worker
   // pages/api/cron/sync-emails.ts
   ```

2. **Real-time Updates**:
   - Implement webhook subscriptions from Microsoft Graph
   - Use Server-Sent Events or WebSockets

3. **Advanced Features**:
   - Bulk operations on emails/cases
   - Email templates for common responses
   - Analytics dashboard (response time, resolution rate)
   - Team collaboration features
   - Email categorization/tagging

4. **Performance**:
   - Implement Redis caching for suggestions
   - Use Pinecone/Weaviate for vector embeddings
   - Add pagination for large email lists

5. **Security**:
   - Rate limiting on API routes
   - CSRF protection
   - Input sanitization for email content
   - Audit logs for sensitive operations

### Microsoft Graph Best Practices

- **Minimal Scopes**: Only request permissions you need
- **Delta Queries**: Use delta queries for efficient syncing
- **Batch Requests**: Combine multiple API calls
- **Error Handling**: Implement retry logic with exponential backoff
- **Token Management**: Store refresh tokens securely, refresh proactively

### Monitoring & Observability

Consider adding:
- Error tracking (Sentry, Bugsnag)
- Performance monitoring (Vercel Analytics, New Relic)
- Logging (structured logs with Winston/Pino)
- Metrics (suggestion accuracy, resolution time)

## Troubleshooting

### Common Issues

**"Unauthorized" when syncing emails**
- Ensure Microsoft credentials are correct
- Check if user has granted permissions
- Verify redirect URI matches exactly

**"No Microsoft account connected"**
- User needs to sign in with Microsoft provider
- Check NextAuth session and accounts table

**Suggestions not appearing**
- Ensure you have resolved cases in the database
- Run seed script: `npm run db:seed`
- Check suggestion engine logs in console

**Database connection errors**
- Verify DATABASE_URL is correct
- Run `npx prisma generate` and `npx prisma db push`

## Support & Contributing

This project was created as a demonstration of full-stack development with Next.js, Microsoft Graph, and AI-powered features.

For issues or questions, please check:
1. Environment variables are correctly configured
2. Database is properly set up and seeded
3. All npm packages are installed

## License

MIT License - feel free to use this project for your own purposes.
