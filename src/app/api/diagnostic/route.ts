import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Diagnostic endpoint to check system health
 * This helps identify what's working and what's not
 */
export async function GET(req: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, { status: string; message?: string; data?: any }>,
  };

  // 1. Check authentication
  try {
    const session = await auth();
    if (session?.user?.id) {
      diagnostics.checks.auth = {
        status: "OK",
        message: "User authenticated",
        data: { userId: session.user.id, email: session.user.email },
      };
    } else {
      diagnostics.checks.auth = {
        status: "ERROR",
        message: "No active session",
      };
    }
  } catch (error: any) {
    diagnostics.checks.auth = {
      status: "ERROR",
      message: error.message,
    };
  }

  // 2. Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.checks.database = {
      status: "OK",
      message: "Database connected",
    };
  } catch (error: any) {
    diagnostics.checks.database = {
      status: "ERROR",
      message: error.message,
    };
  }

  // 3. Check if there are users in the system
  try {
    const userCount = await prisma.user.count();
    diagnostics.checks.users = {
      status: userCount > 0 ? "OK" : "WARNING",
      message: `Found ${userCount} user(s)`,
      data: { count: userCount },
    };
  } catch (error: any) {
    diagnostics.checks.users = {
      status: "ERROR",
      message: error.message,
    };
  }

  // 4. Check emails (if authenticated)
  if (diagnostics.checks.auth?.status === "OK") {
    try {
      const session = await auth();
      const emailCount = await prisma.email.count({
        where: { userId: session!.user!.id },
      });
      diagnostics.checks.emails = {
        status: "OK",
        message: `Found ${emailCount} email(s)`,
        data: { count: emailCount },
      };
    } catch (error: any) {
      diagnostics.checks.emails = {
        status: "ERROR",
        message: error.message,
      };
    }
  }

  // 5. Check tags
  if (diagnostics.checks.auth?.status === "OK") {
    try {
      const session = await auth();
      const tagCount = await prisma.tag.count({
        where: { userId: session!.user!.id },
      });
      diagnostics.checks.tags = {
        status: "OK",
        message: `Found ${tagCount} tag(s)`,
        data: { count: tagCount },
      };
    } catch (error: any) {
      diagnostics.checks.tags = {
        status: "ERROR",
        message: error.message,
      };
    }
  }

  // 6. Check folders
  if (diagnostics.checks.auth?.status === "OK") {
    try {
      const session = await auth();
      const folderCount = await prisma.folder.count({
        where: { userId: session!.user!.id },
      });
      diagnostics.checks.folders = {
        status: "OK",
        message: `Found ${folderCount} folder(s)`,
        data: { count: folderCount },
      };
    } catch (error: any) {
      diagnostics.checks.folders = {
        status: "ERROR",
        message: error.message,
      };
    }
  }

  // 7. Check environment variables
  const envVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
  };

  diagnostics.checks.environment = {
    status: Object.values(envVars).every((v) => v) ? "OK" : "ERROR",
    message: "Environment variables check",
    data: envVars,
  };

  // Calculate overall status
  const hasErrors = Object.values(diagnostics.checks).some(
    (check) => check.status === "ERROR"
  );
  const hasWarnings = Object.values(diagnostics.checks).some(
    (check) => check.status === "WARNING"
  );

  return NextResponse.json({
    overall: hasErrors ? "ERROR" : hasWarnings ? "WARNING" : "OK",
    ...diagnostics,
  });
}
