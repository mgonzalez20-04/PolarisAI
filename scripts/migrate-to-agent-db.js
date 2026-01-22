const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function migrateToAgentDb() {
  try {
    console.log("🔍 Leyendo configuración de la base de datos del agente...");

    // Read agent database config
    const config = await prisma.appSettings.findUnique({
      where: { key: "AGENT_DATABASE_CONFIG" },
    });

    if (!config?.value) {
      console.error("❌ Error: No hay configuración de base de datos del agente guardada.");
      console.log("💡 Por favor, configura la base de datos del agente en la página de ajustes primero.");
      process.exit(1);
    }

    const dbConfig = JSON.parse(config.value);
    const { type, server, port, database, username, password, encrypt, trustServerCertificate } = dbConfig;

    console.log(`✅ Configuración encontrada: ${type} - ${server}:${port} - ${database}`);

    // Generate DATABASE_URL based on type
    let databaseUrl = "";
    let provider = "";

    if (type === "mssql") {
      provider = "sqlserver";
      const encryptOption = encrypt ? "true" : "false";
      const trustOption = trustServerCertificate ? "true" : "false";
      databaseUrl = `sqlserver://${server}:${port};database=${database};user=${username};password=${password};encrypt=${encryptOption};trustServerCertificate=${trustOption}`;
    } else if (type === "mysql") {
      provider = "mysql";
      databaseUrl = `mysql://${username}:${password}@${server}:${port}/${database}`;
      if (encrypt) {
        databaseUrl += "?sslmode=required";
      }
    } else if (type === "postgresql" || type === "supabase") {
      provider = "postgresql";
      databaseUrl = `postgresql://${username}:${password}@${server}:${port}/${database}`;
      // Supabase always requires SSL
      if (encrypt || type === "supabase") {
        databaseUrl += "?sslmode=require";
      }
    } else {
      console.error(`❌ Error: Tipo de base de datos no soportado: ${type}`);
      process.exit(1);
    }

    console.log(`\n📝 DATABASE_URL generado para ${provider}`);
    console.log(`🔗 ${databaseUrl.replace(password, "***")}\n`);

    // Read current .env.local
    const envPath = path.join(__dirname, "..", ".env.local");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Backup .env.local
    const backupPath = path.join(__dirname, "..", ".env.local.backup");
    fs.writeFileSync(backupPath, envContent, "utf8");
    console.log(`💾 Backup creado: .env.local.backup\n`);

    // Update DATABASE_URL in .env.local
    const newEnvContent = envContent.replace(
      /DATABASE_URL="[^"]*"/,
      `DATABASE_URL="${databaseUrl}"`
    );

    fs.writeFileSync(envPath, newEnvContent, "utf8");
    console.log("✅ .env.local actualizado con nueva DATABASE_URL\n");

    // Update schema.prisma provider
    const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
    let schemaContent = fs.readFileSync(schemaPath, "utf8");

    // Backup schema.prisma
    const schemaBackupPath = path.join(__dirname, "..", "prisma", "schema.prisma.backup");
    fs.writeFileSync(schemaBackupPath, schemaContent, "utf8");
    console.log("💾 Backup creado: prisma/schema.prisma.backup\n");

    // Update provider in schema.prisma
    const newSchemaContent = schemaContent.replace(
      /provider = "sqlite"/,
      `provider = "${provider}"`
    );

    fs.writeFileSync(schemaPath, newSchemaContent, "utf8");
    console.log(`✅ schema.prisma actualizado con provider: ${provider}\n`);

    console.log("=" .repeat(60));
    console.log("🎉 MIGRACIÓN CONFIGURADA CORRECTAMENTE");
    console.log("=" .repeat(60));
    console.log("\n📋 SIGUIENTES PASOS:\n");
    console.log("1. Verifica que la base de datos del agente esté accesible");
    console.log("2. Ejecuta el siguiente comando para crear las tablas:\n");
    console.log("   npx prisma db push\n");
    console.log("3. Regenera el cliente de Prisma:\n");
    console.log("   npx prisma generate\n");
    console.log("4. Reinicia la aplicación:\n");
    console.log("   npm run dev\n");
    console.log("⚠️  IMPORTANTE: La base de datos del agente estará VACÍA.");
    console.log("   Necesitarás crear un nuevo usuario o migrar los datos existentes.\n");

  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToAgentDb();
