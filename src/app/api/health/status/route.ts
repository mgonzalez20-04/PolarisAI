import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener el estado de salud actual
    const healthStatus = await prisma.systemHealth.findFirst();

    if (!healthStatus) {
      // Si no hay registro, asumir que está saludable
      return NextResponse.json({
        isHealthy: true,
        lastCheckAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        consecutiveFailures: 0,
      });
    }

    return NextResponse.json(healthStatus);
  } catch (error: any) {
    console.error("Error fetching health status:", error);
    return NextResponse.json(
      { error: "Failed to fetch health status", details: error.message },
      { status: 500 }
    );
  }
}
