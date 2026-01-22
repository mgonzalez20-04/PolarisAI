const { PrismaClient } = require("@prisma/client");

// IMPORTANTE: Este script debe ejecutarse DESPUÉS de:
// 1. npm run db:migrate-to-agent (actualiza .env.local y schema.prisma)
// 2. npx prisma db push (crea las tablas en la nueva BD)
// 3. npx prisma generate (regenera el cliente)

async function copyData() {
  try {
    console.log("🔄 COPIANDO DATOS DE SQLITE A BASE DE DATOS DEL AGENTE");
    console.log("=" .repeat(60));
    console.log("\n⚠️  IMPORTANTE: Este proceso copiará TODOS los datos.");
    console.log("   Asegúrate de que la base de datos del agente esté VACÍA.\n");

    // Connect to SQLite (old database)
    const oldDb = new PrismaClient({
      datasources: {
        db: {
          url: "file:./dev.db",
        },
      },
    });

    // Connect to new database (current DATABASE_URL from .env.local)
    const newDb = new PrismaClient();

    console.log("📊 Contando registros en base de datos SQLite...\n");

    // Count records
    const counts = {
      users: await oldDb.user.count(),
      accounts: await oldDb.account.count(),
      sessions: await oldDb.session.count(),
      verificationTokens: await oldDb.verificationToken.count(),
      emails: await oldDb.email.count(),
      cases: await oldDb.case.count(),
      appSettings: await oldDb.appSettings.count(),
    };

    console.log("Registros encontrados:");
    console.log(`  - Usuarios: ${counts.users}`);
    console.log(`  - Cuentas: ${counts.accounts}`);
    console.log(`  - Sesiones: ${counts.sessions}`);
    console.log(`  - Tokens: ${counts.verificationTokens}`);
    console.log(`  - Emails: ${counts.emails}`);
    console.log(`  - Casos: ${counts.cases}`);
    console.log(`  - Configuración: ${counts.appSettings}\n`);

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    if (totalRecords === 0) {
      console.log("⚠️  No hay datos para copiar. Base de datos SQLite vacía.");
      return;
    }

    console.log("🚀 Iniciando copia de datos...\n");

    // Copy Users
    if (counts.users > 0) {
      console.log(`📝 Copiando ${counts.users} usuarios...`);
      const users = await oldDb.user.findMany();
      for (const user of users) {
        await newDb.user.create({ data: user });
      }
      console.log("✅ Usuarios copiados\n");
    }

    // Copy Accounts
    if (counts.accounts > 0) {
      console.log(`📝 Copiando ${counts.accounts} cuentas...`);
      const accounts = await oldDb.account.findMany();
      for (const account of accounts) {
        await newDb.account.create({ data: account });
      }
      console.log("✅ Cuentas copiadas\n");
    }

    // Copy Sessions
    if (counts.sessions > 0) {
      console.log(`📝 Copiando ${counts.sessions} sesiones...`);
      const sessions = await oldDb.session.findMany();
      for (const session of sessions) {
        await newDb.session.create({ data: session });
      }
      console.log("✅ Sesiones copiadas\n");
    }

    // Copy Verification Tokens
    if (counts.verificationTokens > 0) {
      console.log(`📝 Copiando ${counts.verificationTokens} tokens de verificación...`);
      const tokens = await oldDb.verificationToken.findMany();
      for (const token of tokens) {
        await newDb.verificationToken.create({ data: token });
      }
      console.log("✅ Tokens copiados\n");
    }

    // Copy Emails
    if (counts.emails > 0) {
      console.log(`📝 Copiando ${counts.emails} emails...`);
      const emails = await oldDb.email.findMany();
      for (const email of emails) {
        await newDb.email.create({ data: email });
      }
      console.log("✅ Emails copiados\n");
    }

    // Copy Cases
    if (counts.cases > 0) {
      console.log(`📝 Copiando ${counts.cases} casos...`);
      const cases = await oldDb.case.findMany();
      for (const caseItem of cases) {
        await newDb.case.create({ data: caseItem });
      }
      console.log("✅ Casos copiados\n");
    }

    // Copy AppSettings
    if (counts.appSettings > 0) {
      console.log(`📝 Copiando ${counts.appSettings} configuraciones...`);
      const settings = await oldDb.appSettings.findMany();
      for (const setting of settings) {
        await newDb.appSettings.create({ data: setting });
      }
      console.log("✅ Configuraciones copiadas\n");
    }

    console.log("=" .repeat(60));
    console.log("🎉 MIGRACIÓN DE DATOS COMPLETADA");
    console.log("=" .repeat(60));
    console.log(`\n✅ ${totalRecords} registros copiados exitosamente\n`);
    console.log("📋 SIGUIENTES PASOS:\n");
    console.log("1. Verifica que los datos estén correctos en la nueva BD");
    console.log("2. Reinicia la aplicación: npm run dev");
    console.log("3. Prueba que todo funcione correctamente");
    console.log("4. (Opcional) Haz backup de dev.db y elimínalo\n");

    await oldDb.$disconnect();
    await newDb.$disconnect();
  } catch (error) {
    console.error("\n❌ ERROR durante la copia de datos:", error);
    console.error("\n💡 Posibles causas:");
    console.error("   - La base de datos del agente no está vacía (duplicados)");
    console.error("   - No se ejecutó 'npx prisma db push' antes de copiar");
    console.error("   - Problemas de conexión con la base de datos del agente");
    console.error("\n🔧 Solución: Elimina todos los datos de la BD del agente y vuelve a intentar\n");
    process.exit(1);
  }
}

copyData();
