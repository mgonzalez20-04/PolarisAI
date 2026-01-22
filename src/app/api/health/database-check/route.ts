import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SchemaIssue {
  type: "missing_table" | "missing_column" | "missing_relation" | "type_mismatch";
  severity: "error" | "warning";
  message: string;
  table?: string;
  column?: string;
  sqlFix?: string;
}

// Esquema esperado basado en Prisma - DESACTIVADO
// El schema está correcto en Prisma, solo validamos que las tablas críticas existan
const CRITICAL_TABLES = [
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "Email",
  "Folder",
  "Tag",
  "EmailTag",
  "AppSettings"
];

const EXPECTED_SCHEMA = {};

// Helper function to generate SQL for creating a table
function generateCreateTableSQL(tableName: string): string {
  const schema = EXPECTED_SCHEMA[tableName as keyof typeof EXPECTED_SCHEMA];
  if (!schema) return "";

  const columns = Object.entries(schema.columns)
    .map(([name, type]) => `  "${name}" ${type}`)
    .join(",\n");

  return `CREATE TABLE "${tableName}" (\n${columns}\n);`;
}

// Helper function to generate SQL for adding a column
function generateAddColumnSQL(tableName: string, columnName: string): string {
  const schema = EXPECTED_SCHEMA[tableName as keyof typeof EXPECTED_SCHEMA];
  if (!schema) return "";

  const columnType = schema.columns[columnName as keyof typeof schema.columns];
  if (!columnType) return "";

  return `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType};`;
}

// Test external database connection
async function testExternalDb() {
  try {
    // Get database config from AppSettings (same as the settings endpoint)
    let configRecord;
    try {
      configRecord = await prisma.appSettings.findUnique({
        where: { key: "DATABASE_CONFIG" },
      });
    } catch (error: any) {
      // If AppSettings table doesn't exist, return not configured
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        return { connected: false, error: "No configurado (tabla AppSettings no existe)" };
      }
      throw error;
    }

    if (!configRecord?.value) {
      return { connected: false, error: "No configurado" };
    }

    const config = JSON.parse(configRecord.value);

    if (!config.server || !config.database) {
      return { connected: false, error: "No configurado" };
    }

    const type = config.type || "mssql";

    if (type === "mssql") {
      const sql = require("mssql");
      const sqlConfig = {
        server: config.server,
        port: parseInt(config.port) || 1433,
        database: config.database,
        user: config.username,
        password: config.password,
        options: {
          encrypt: config.encrypt || false,
          trustServerCertificate: config.trustServerCertificate || false,
        },
      };

      try {
        const connection = await sql.connect(sqlConfig);
        await connection.query("SELECT 1 AS test");
        await connection.close();
        return { connected: true };
      } catch (error: any) {
        return {
          connected: false,
          error: error.message || "Error al conectar",
        };
      }
    } else if (type === "mysql") {
      const mysql = require("mysql2/promise");
      const mysqlConfig = {
        host: config.server,
        port: parseInt(config.port) || 3306,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.encrypt ? { rejectUnauthorized: !config.trustServerCertificate } : undefined,
      };

      try {
        const connection = await mysql.createConnection(mysqlConfig);
        await connection.query("SELECT 1 AS test");
        await connection.end();
        return { connected: true };
      } catch (error: any) {
        return {
          connected: false,
          error: error.message || "Error al conectar",
        };
      }
    } else if (type === "postgresql" || type === "supabase") {
      const { Client } = require("pg");
      const pgConfig = {
        host: config.server,
        port: parseInt(config.port) || 5432,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.encrypt || type === "supabase" ? { rejectUnauthorized: !config.trustServerCertificate } : false,
      };

      try {
        const connection = new Client(pgConfig);
        await connection.connect();
        await connection.query("SELECT 1 AS test");
        await connection.end();
        return { connected: true };
      } catch (error: any) {
        return {
          connected: false,
          error: error.message || "Error al conectar",
        };
      }
    }

    return { connected: false, error: "Tipo de base de datos no soportado" };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || "Error al conectar",
    };
  }
}

// Test agent database connection and validate schema
async function testAgentDb() {
  try {
    // Test connection
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    // Validate schema - solo verificar tablas críticas
    const schemaIssues: SchemaIssue[] = [];

    // Get all tables from the database
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `;

    const existingTables = tables.map((t) => t.table_name);

    // Solo verificar que existan las tablas críticas
    for (const tableName of CRITICAL_TABLES) {
      if (!existingTables.includes(tableName)) {
        schemaIssues.push({
          type: "missing_table",
          severity: "error",
          message: `Falta la tabla crítica "${tableName}". Por favor, ejecuta 'npx prisma db push' para sincronizar el schema.`,
          table: tableName,
          sqlFix: `-- Ejecuta: npx prisma db push`,
        });
      }
    }

    await prisma.$disconnect();

    return {
      connected: true,
      schemaIssues,
    };
  } catch (error: any) {
    console.error("Error testing agent DB:", error);
    return {
      connected: false,
      error: error.message || "Error al conectar",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const [externalDb, agentDb] = await Promise.all([testExternalDb(), testAgentDb()]);

    return NextResponse.json({
      externalDb,
      agentDb,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Database check error:", error);
    return NextResponse.json(
      { error: error.message || "Error al verificar bases de datos" },
      { status: 500 }
    );
  }
}
