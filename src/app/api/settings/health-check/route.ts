import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.appSettings.findUnique({
      where: { key: "health-check-notifications" },
    });

    if (!setting) {
      // Devolver configuración por defecto
      return NextResponse.json({
        enabled: false,
        smtpConfigured: false,
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "",
        fromName: "Sistema de Monitoreo",
        recipients: [],
      });
    }

    const config = JSON.parse(setting.value);
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error loading health check config:", error);
    return NextResponse.json(
      { error: "Failed to load config", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await request.json();

    // Marcar SMTP como configurado si todos los campos necesarios están presentes
    config.smtpConfigured = !!(
      config.smtpHost &&
      config.smtpUser &&
      config.smtpPassword &&
      config.fromEmail
    );

    // Guardar en AppSettings
    await prisma.appSettings.upsert({
      where: { key: "health-check-notifications" },
      create: {
        key: "health-check-notifications",
        value: JSON.stringify(config),
        description: "Configuración de notificaciones de health checks",
      },
      update: {
        value: JSON.stringify(config),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving health check config:", error);
    return NextResponse.json(
      { error: "Failed to save config", details: error.message },
      { status: 500 }
    );
  }
}
