import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

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
        { error: "Servidor y base de datos son obligatorios" },
        { status: 400 }
      );
    }

    let connection;
    let testResult;

    if (type === "mssql") {
      const sql = require("mssql");
      const config = {
        server,
        port: parseInt(port) || 1433,
        database,
        user: username,
        password,
        options: {
          encrypt: encrypt || false,
          trustServerCertificate: trustServerCertificate || false,
        },
      };

      try {
        connection = await sql.connect(config);
        const result = await connection.query("SELECT 1 AS test");
        testResult = result.recordset;
        await connection.close();
      } catch (error: any) {
        return NextResponse.json(
          { error: `Error de conexión: ${error.message}` },
          { status: 500 }
        );
      }
    } else if (type === "mysql") {
      const mysql = require("mysql2/promise");
      const config = {
        host: server,
        port: parseInt(port) || 3306,
        database,
        user: username,
        password,
        ssl: encrypt ? { rejectUnauthorized: !trustServerCertificate } : undefined,
      };

      try {
        connection = await mysql.createConnection(config);
        const [rows] = await connection.query("SELECT 1 AS test");
        testResult = rows;
        await connection.end();
      } catch (error: any) {
        return NextResponse.json(
          { error: `Error de conexión: ${error.message}` },
          { status: 500 }
        );
      }
    } else if (type === "postgresql" || type === "supabase") {
      const { Client } = require("pg");
      const config = {
        host: server,
        port: parseInt(port) || 5432,
        database,
        user: username,
        password,
        ssl: encrypt || type === "supabase" ? { rejectUnauthorized: !trustServerCertificate } : false,
      };

      try {
        connection = new Client(config);
        await connection.connect();
        const result = await connection.query("SELECT 1 AS test");
        testResult = result.rows;
        await connection.end();
      } catch (error: any) {
        return NextResponse.json(
          { error: `Error de conexión: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Tipo de base de datos no soportado" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Conexión exitosa",
      testResult,
    });
  } catch (error: any) {
    console.error("Error testing agent database connection:", error);
    return NextResponse.json(
      { error: `Error al probar la conexión: ${error.message}` },
      { status: 500 }
    );
  }
}
