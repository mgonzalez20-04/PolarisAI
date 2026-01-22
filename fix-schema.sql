-- Migración segura para agregar columnas faltantes
-- Estas columnas se agregan como NULLABLE primero para no romper los datos existentes

-- Verificar y agregar columnas faltantes en Email
DO $$
BEGIN
    -- Agregar fromEmail si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='Email' AND column_name='fromEmail') THEN
        ALTER TABLE "Email" ADD COLUMN "fromEmail" TEXT;
        -- Copiar valor de 'from' si existe
        UPDATE "Email" SET "fromEmail" = "from" WHERE "fromEmail" IS NULL;
    END IF;

    -- Agregar messageId si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='Email' AND column_name='messageId') THEN
        ALTER TABLE "Email" ADD COLUMN "messageId" TEXT;
        -- Generar IDs únicos para registros existentes
        UPDATE "Email" SET "messageId" = 'legacy-' || "id" WHERE "messageId" IS NULL;
        -- Hacer única después
        ALTER TABLE "Email" ADD CONSTRAINT "Email_messageId_key" UNIQUE ("messageId");
    END IF;

    -- Agregar receivedAt si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='Email' AND column_name='receivedAt') THEN
        ALTER TABLE "Email" ADD COLUMN "receivedAt" TIMESTAMP;
        -- Usar createdAt como fallback
        UPDATE "Email" SET "receivedAt" = "createdAt" WHERE "receivedAt" IS NULL;
    END IF;
END $$;

-- Ahora hacer las columnas NOT NULL si tienen valores
ALTER TABLE "Email" ALTER COLUMN "fromEmail" SET NOT NULL;
ALTER TABLE "Email" ALTER COLUMN "messageId" SET NOT NULL;
ALTER TABLE "Email" ALTER COLUMN "receivedAt" SET NOT NULL;

-- Crear tabla AppSettings si no existe
CREATE TABLE IF NOT EXISTS "AppSettings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
