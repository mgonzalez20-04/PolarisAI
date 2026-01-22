import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Microsoft credentials from AppSettings
    const clientIdSetting = await prisma.appSettings.findUnique({
      where: { key: "MICROSOFT_CLIENT_ID" },
    });

    const clientSecretSetting = await prisma.appSettings.findUnique({
      where: { key: "MICROSOFT_CLIENT_SECRET" },
    });

    const tenantIdSetting = await prisma.appSettings.findUnique({
      where: { key: "MICROSOFT_TENANT_ID" },
    });

    return NextResponse.json({
      clientId: clientIdSetting?.value || "",
      clientSecret: clientSecretSetting?.value || "",
      tenantId: tenantIdSetting?.value || "common",
    });
  } catch (error) {
    console.error("Error fetching Microsoft credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { clientId, clientSecret, tenantId } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    // Save or update Microsoft credentials in AppSettings
    await prisma.appSettings.upsert({
      where: { key: "MICROSOFT_CLIENT_ID" },
      update: { value: clientId, updatedAt: new Date() },
      create: { key: "MICROSOFT_CLIENT_ID", value: clientId },
    });

    await prisma.appSettings.upsert({
      where: { key: "MICROSOFT_CLIENT_SECRET" },
      update: { value: clientSecret, updatedAt: new Date() },
      create: { key: "MICROSOFT_CLIENT_SECRET", value: clientSecret },
    });

    await prisma.appSettings.upsert({
      where: { key: "MICROSOFT_TENANT_ID" },
      update: { value: tenantId || "common", updatedAt: new Date() },
      create: { key: "MICROSOFT_TENANT_ID", value: tenantId || "common" },
    });

    // Cache invalidation is disabled (credentials helper not available)
    console.log("Microsoft credentials saved successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving Microsoft credentials:", error);
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }
}
