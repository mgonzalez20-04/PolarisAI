# Quick Start Guide

Configura PolarisAI y conéctalo con tu cuenta de Microsoft.

## 1. Install Dependencies

```bash
cd polarisai
npm install
```

## 2. Setup Environment

Copy the example environment file and configure your Microsoft credentials:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Microsoft Azure app credentials:
```env
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common"
NEXTAUTH_SECRET="your-secret-here"  # Generate with: openssl rand -base64 32
```

See README.md for detailed instructions on creating an Azure app registration.

## 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Create database
npx prisma db push

# Seed with example data (optional)
npm run db:seed
```

This creates sample resolved cases that help with AI suggestions.

## 4. Run the Application

```bash
npm run dev
```

Open http://localhost:3000

## 5. Test the Application

1. **Sign In**: Click "Sign in with Microsoft" and use your Microsoft account
2. **Grant Permissions**: Accept the requested permissions for email access
3. **Sync Emails**: Click "Sync Emails" to load your inbox
4. **Open Email**: Click any email to see details
5. **See Suggestions**: View AI-powered suggestions based on historical cases
6. **Create Case**: Create and manage cases from your emails
7. **View Cases**: Navigate to Cases to see all resolved cases

## Next Steps

### Enable Advanced AI Suggestions (Optional)

1. Get OpenAI API key from [OpenAI Platform](https://platform.openai.com)
2. Update `.env.local`:
   ```env
   ENABLE_EMBEDDING_ENGINE="true"
   OPENAI_API_KEY="your-api-key"
   ```
3. Restart server

## Useful Commands

```bash
# Development
npm run dev

# Database
npm run db:push          # Update database schema
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio

# Production
npm run build            # Build for production
npm start                # Run production server
```

## Project Structure Overview

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── dashboard/          # Main app pages
│   │   ├── page.tsx        # Inbox
│   │   ├── email/[id]/     # Email detail + suggestions
│   │   ├── cases/          # Case management
│   │   └── settings/       # Settings
│   └── api/                # API routes
│       ├── emails/         # Email endpoints
│       └── cases/          # Case endpoints
├── components/             # React components
├── lib/                    # Core logic
│   ├── email/              # Email providers
│   └── suggestions/        # AI suggestion engines
└── auth.ts                 # Authentication config
```

## Troubleshooting

**Can't sign in with Microsoft?**
- Verify your Azure app credentials in `.env.local`
- Check that redirect URI is correctly configured in Azure Portal
- Ensure you've granted admin consent for API permissions

**No emails showing?**
- Click "Sync Emails" button in Inbox
- Verify your Microsoft account has emails
- Check browser console for any error messages

**Suggestions not working?**
- Ensure seed data was loaded (check Cases page)
- Create some resolved cases to build the suggestion database
- Open an email that isn't linked to a case yet

Need more help? Check the full [README.md](./README.md)
