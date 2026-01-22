import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { sql } = await req.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 });
    }

    // Split multiple statements and execute them one by one
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const results = [];

    for (const statement of statements) {
      try {
        // Execute the statement
        await prisma.$executeRawUnsafe(statement);
        results.push({
          success: true,
          statement: statement.substring(0, 100) + (statement.length > 100 ? "..." : ""),
        });
      } catch (error: any) {
        results.push({
          success: false,
          statement: statement.substring(0, 100) + (statement.length > 100 ? "..." : ""),
          error: error.message,
        });
      }
    }

    await prisma.$disconnect();

    const hasErrors = results.some((r) => !r.success);

    return NextResponse.json({
      success: !hasErrors,
      results,
      message: hasErrors
        ? "Algunos comandos fallaron"
        : `${results.length} comando(s) ejecutado(s) correctamente`,
    });
  } catch (error: any) {
    console.error("Error executing SQL:", error);
    return NextResponse.json(
      { error: error.message || "Error al ejecutar SQL" },
      { status: 500 }
    );
  }
}
