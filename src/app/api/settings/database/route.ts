import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get database config from AppSettings
    const config = await prisma.appSettings.findUnique({
      where: { key: "DATABASE_CONFIG" },
    });

    if (!config?.value) {
      return NextResponse.json({
        type: "mssql",
        server: "",
        port: "1433",
        database: "",
        username: "",
        password: "",
        trustServerCertificate: true,
        encrypt: true,
      });
    }

    return NextResponse.json(JSON.parse(config.value));
  } catch (error) {
    console.error("Error fetching database config:", error);
    return NextResponse.json(
      { error: "Failed to fetch database config" },
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
    const { type, server, port, database, username, password, trustServerCertificate, encrypt } = body;

    if (!server || !database) {
      return NextResponse.json(
        { error: "Server and database are required" },
        { status: 400 }
      );
    }

    const config = {
      type,
      server,
      port,
      database,
      username,
      password,
      trustServerCertificate,
      encrypt,
    };

    // Save database config to AppSettings
    await prisma.appSettings.upsert({
      where: { key: "DATABASE_CONFIG" },
      update: { value: JSON.stringify(config), updatedAt: new Date() },
      create: { key: "DATABASE_CONFIG", value: JSON.stringify(config) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving database config:", error);
    return NextResponse.json(
      { error: "Failed to save database config" },
      { status: 500 }
    );
  }
}
