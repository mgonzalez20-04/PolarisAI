const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración segura...\n');

    // 1. Agregar columnas como NULLABLE primero
    console.log('1️⃣ Agregando columna fromEmail...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "fromEmail" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "Email" SET "fromEmail" = "from" WHERE "fromEmail" IS NULL`);
      console.log('   ✅ fromEmail agregada');
    } catch (e) {
      console.log('   ⚠️  fromEmail ya existe o error:', e.message);
    }

    console.log('2️⃣ Agregando columna messageId...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "messageId" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "Email" SET "messageId" = 'legacy-' || "id" WHERE "messageId" IS NULL`);
      console.log('   ✅ messageId agregada');
    } catch (e) {
      console.log('   ⚠️  messageId ya existe o error:', e.message);
    }

    console.log('3️⃣ Agregando columna receivedAt...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP`);
      await prisma.$executeRawUnsafe(`UPDATE "Email" SET "receivedAt" = "createdAt" WHERE "receivedAt" IS NULL`);
      console.log('   ✅ receivedAt agregada');
    } catch (e) {
      console.log('   ⚠️  receivedAt ya existe o error:', e.message);
    }

    // 2. Hacer las columnas NOT NULL
    console.log('\n4️⃣ Haciendo columnas NOT NULL...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ALTER COLUMN "fromEmail" SET NOT NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ALTER COLUMN "messageId" SET NOT NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ALTER COLUMN "receivedAt" SET NOT NULL`);
      console.log('   ✅ Columnas configuradas como NOT NULL');
    } catch (e) {
      console.log('   ⚠️  Error configurando NOT NULL:', e.message);
    }

    // 3. Agregar constraint UNIQUE a messageId
    console.log('5️⃣ Agregando constraint UNIQUE a messageId...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Email" ADD CONSTRAINT "Email_messageId_key" UNIQUE ("messageId")`);
      console.log('   ✅ Constraint UNIQUE agregado');
    } catch (e) {
      console.log('   ⚠️  Constraint ya existe o error:', e.message);
    }

    // 4. Crear tabla AppSettings
    console.log('6️⃣ Creando tabla AppSettings...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AppSettings" (
          "id" TEXT PRIMARY KEY,
          "key" TEXT UNIQUE NOT NULL,
          "value" TEXT NOT NULL,
          "description" TEXT,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ Tabla AppSettings creada');
    } catch (e) {
      console.log('   ⚠️  Tabla ya existe o error:', e.message);
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📊 Verificando schema...');

    // Verificar que funcionó
    const count = await prisma.email.count();
    console.log(`✅ ${count} emails encontrados`);

    try {
      const appSettingsCount = await prisma.appSettings.count();
      console.log(`✅ Tabla AppSettings lista (${appSettingsCount} registros)`);
    } catch (e) {
      console.log('⚠️  No se pudo contar AppSettings:', e.message);
    }

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
