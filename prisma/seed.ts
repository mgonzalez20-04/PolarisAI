import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create sample user for seed data
  // NOTE: This user is only used to associate sample resolved cases
  // You cannot sign in with this account (credentials auth is disabled)
  const hashedPassword = await hash("sample123", 10);
  const user = await prisma.user.upsert({
    where: { email: "sample@seed-data.local" },
    update: {},
    create: {
      email: "sample@seed-data.local",
      name: "Sample Seed User",
      password: hashedPassword,
      role: "user",
    },
  });

  console.log("Created sample user for seed data:", user.email);

  // Create sample emails with resolved cases for AI suggestions
  const emailsAndCases = [
    {
      email: {
        messageId: "seed-msg-1",
        subject: "Password reset not working",
        from: "Alice Johnson",
        fromEmail: "alice@customer.com",
        to: "support@company.com",
        receivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        bodyPreview:
          "I've been trying to reset my password but the email never arrives...",
        bodyText:
          "Hello,\n\nI've been trying to reset my password for the past hour but the email never arrives. I checked spam and it's not there either. Can you help?\n\nThanks,\nAlice",
        isRead: true,
        priority: "high",
      },
      case: {
        title: "Password reset email delivery issue",
        description: "Customer not receiving password reset emails",
        status: "resolved",
        priority: "high",
        tags: ["password", "email-delivery", "authentication"],
        resolution:
          "Checked email delivery logs and found customer's email was flagged by spam filter. Added their domain to allowlist and resent reset link manually. Also verified email service configuration.",
        response:
          "Hi Alice,\n\nThank you for reaching out. I've investigated this issue and found that your email provider's spam filter was blocking our automated emails. I've added your domain to our allowlist and sent you a new password reset link directly.\n\nYou should receive it within a few minutes. If you don't see it, please check your spam folder one more time.\n\nTo prevent this in the future, please add support@company.com to your contacts.\n\nBest regards,\nSupport Team",
        notes:
          "Common issue with certain email providers. Consider adding note to reset page about checking spam.",
        resolvedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
    },
    {
      email: {
        messageId: "seed-msg-2",
        subject: "Duplicate billing charge",
        from: "Bob Smith",
        fromEmail: "bob.smith@example.com",
        to: "support@company.com",
        receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        bodyPreview:
          "I was charged twice for my subscription this month. Transaction IDs: TXN-98765 and TXN-98766...",
        bodyText:
          "Hi Support,\n\nI was charged twice for my subscription this month on November 1st.\n\nTransaction IDs:\n- TXN-98765 - $49.99\n- TXN-98766 - $49.99\n\nCan you please refund one of these? I only have one subscription.\n\nRegards,\nBob Smith",
        isRead: true,
        priority: "high",
      },
      case: {
        title: "Duplicate subscription charge - refund processed",
        description: "Customer charged twice for monthly subscription",
        status: "resolved",
        priority: "high",
        tags: ["billing", "refund", "duplicate-charge"],
        resolution:
          "Verified in payment system that customer was indeed charged twice due to a payment gateway timeout that caused retry. Processed full refund for second charge (TXN-98766). Refund completed within 3-5 business days.",
        response:
          "Hi Bob,\n\nI sincerely apologize for the duplicate charge. I've reviewed your account and confirmed that you were charged twice due to a technical issue with our payment processor.\n\nI've processed a full refund of $49.99 for transaction TXN-98766. The refund should appear in your account within 3-5 business days depending on your bank.\n\nAs a gesture of goodwill, I've also applied a $10 credit to your account for next month.\n\nThank you for bringing this to our attention.\n\nBest regards,\nSupport Team",
        notes:
          "Payment gateway timeout issue. Engineering team notified. Customer very understanding.",
        resolvedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
    },
    {
      email: {
        messageId: "seed-msg-3",
        subject: "Data export fails after 10 seconds",
        from: "Carol Williams",
        fromEmail: "carol.w@business.com",
        to: "support@company.com",
        receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        bodyPreview:
          "My CSV export keeps failing. I have about 8,000 records to export...",
        bodyText:
          "Hello,\n\nI'm trying to export my data in CSV format but the download fails after about 10 seconds. I have approximately 8,000 records.\n\nIs there a file size limit? The error just says 'Download failed'.\n\nUsing Chrome on macOS.\n\nCarol Williams\nBusiness Account #7821",
        isRead: true,
        priority: "normal",
      },
      case: {
        title: "CSV export timeout for large datasets",
        description: "Export failing for accounts with >5000 records",
        status: "resolved",
        priority: "medium",
        tags: ["export", "data", "timeout", "bug"],
        resolution:
          "Issue was caused by 30-second server timeout for export generation. For this customer, manually generated export and sent via secure link. Escalated to engineering to implement paginated exports or background job processing for large datasets.",
        response:
          "Hi Carol,\n\nThank you for reporting this issue. The problem is related to the size of your dataset - exports over 5,000 records currently exceed our processing timeout.\n\nAs a workaround, I've manually generated your full export and uploaded it to a secure link:\n[Secure Download Link - expires in 48 hours]\n\nFor the long-term solution, our engineering team is implementing a new export system that will:\n1. Process large exports in the background\n2. Email you when ready\n3. Support datasets up to 100,000 records\n\nThis will be deployed within 2 weeks. I'll send you an update once it's live.\n\nBest regards,\nSupport Team",
        notes:
          "Common issue for business accounts. Engineering ticket ENG-4521 created. Customer satisfied with workaround.",
        resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    },
    {
      email: {
        messageId: "seed-msg-4",
        subject: "API rate limit seems wrong",
        from: "David Chen",
        fromEmail: "david@techstartup.io",
        to: "support@company.com",
        receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        bodyPreview:
          "We're getting 429 errors but should have 1000 req/min on our Pro plan...",
        bodyText:
          "Hi,\n\nOur application is receiving 429 (Too Many Requests) errors from your API. According to your docs, Pro plan should have 1000 requests per minute.\n\nHowever, we're hitting the limit at around 250 requests per minute. Can you check our account settings?\n\nAccount ID: techstartup-pro-2024\n\nThanks,\nDavid Chen\nTech Startup Inc.",
        isRead: true,
        priority: "high",
      },
      case: {
        title: "API rate limit misconfiguration on Pro account",
        description: "Account has incorrect rate limit (250 vs 1000 req/min)",
        status: "resolved",
        priority: "urgent",
        tags: ["api", "rate-limit", "configuration", "bug"],
        resolution:
          "Account was created before our Pro plan rate limit increase last month. Old accounts weren't automatically migrated. Manually updated rate limit to 1000 req/min. Created task for engineering to audit and update all affected accounts.",
        response:
          "Hi David,\n\nApologies for the inconvenience. I've identified the issue - your account was created before we increased the Pro plan rate limit from 250 to 1000 requests per minute last month, and wasn't automatically updated.\n\nI've manually updated your account to the correct 1000 req/min limit. The change is effective immediately.\n\nTo verify:\n- Old limit: 250 requests/minute\n- New limit: 1000 requests/minute\n- Burst capacity: 1500 requests\n\nYou can monitor your usage in the API dashboard. Please let me know if you continue to experience any issues.\n\nBest regards,\nSupport Team",
        notes:
          "Migration script issue. Engineering notified - 47 other accounts affected. All being updated.",
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    },
    {
      email: {
        messageId: "seed-msg-5",
        subject: "Cannot access account - Two-factor authentication issue",
        from: "Emma Davis",
        fromEmail: "emma.davis@company.com",
        to: "support@company.com",
        receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        bodyPreview:
          "I lost my phone and can't access 2FA codes. I need to access my account urgently...",
        bodyText:
          "Hello,\n\nI lost my phone yesterday and can't access my two-factor authentication codes. I need to access my account urgently for a client presentation.\n\nI have access to my email and can verify my identity. Can you help me reset 2FA?\n\nAccount: emma.davis@company.com\n\nUrgent - presentation in 3 hours!\n\nEmma Davis",
        isRead: true,
        priority: "high",
      },
      case: {
        title: "2FA reset - lost device",
        description: "Customer lost 2FA device, needs urgent access",
        status: "resolved",
        priority: "urgent",
        tags: ["2fa", "security", "account-recovery", "urgent"],
        resolution:
          "Verified identity via email confirmation + security questions + government ID photo. Temporarily disabled 2FA on account and sent secure reset link. Customer logged in, set up new 2FA with backup codes. Provided guidance on storing backup codes securely.",
        response:
          "Hi Emma,\n\nI understand the urgency. I can help you regain access to your account.\n\nFor security purposes, I'll need to verify your identity:\n\n1. I've sent a verification code to your registered email\n2. Please reply with answers to these security questions:\n   - What is the name of your first client project?\n   - What was your original signup email domain?\n3. Please provide a photo of a government-issued ID\n\nOnce verified, I'll temporarily disable 2FA and send you a secure access link. You'll be able to set up 2FA again with your new device.\n\nPlease respond within the next hour so we can get you access before your presentation.\n\nBest regards,\nSupport Team",
        notes:
          "Identity verified successfully. Customer very grateful. Provided backup codes documentation. Consider adding backup codes to onboarding flow.",
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    },
  ];

  // Create emails and cases
  for (const item of emailsAndCases) {
    const email = await prisma.email.create({
      data: {
        ...item.email,
        userId: user.id,
        hasCase: true,
      },
    });

    const caseData = {
      ...item.case,
      emailId: email.id,
      userId: user.id,
      tags: JSON.stringify(item.case.tags),
    };

    await prisma.case.create({
      data: caseData,
    });

    console.log(`Created email and case: ${item.email.subject}`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
