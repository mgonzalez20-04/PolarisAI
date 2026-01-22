import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPgVector() {
  try {
    console.log('🔍 Verificando estado de pgvector en Supabase...\n');

    // Verificar si la extensión está instalada
    const extensions = await prisma.$queryRaw<Array<{extname: string, extversion: string}>>`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `;

    if (extensions.length > 0) {
      console.log('✅ pgvector está HABILITADO');
      console.log(`   Versión: ${extensions[0].extversion}\n`);

      // Verificar si hay tablas con columnas vector
      const tables = await prisma.$queryRaw<Array<{table_name: string, column_name: string}>>`
        SELECT
          table_name,
          column_name
        FROM information_schema.columns
        WHERE udt_name = 'vector'
        ORDER BY table_name
      `;

      console.log('📊 Tablas con columnas vectoriales:');
      if (tables.length > 0) {
        tables.forEach(t => console.log(`   - ${t.table_name}.${t.column_name}`));
      } else {
        console.log('   (Ninguna tabla migrada aún)');
      }

      // Verificar índices HNSW
      console.log('\n🔗 Índices HNSW creados:');
      const indexes = await prisma.$queryRaw<Array<{indexname: string, tablename: string}>>`
        SELECT
          indexname,
          tablename
        FROM pg_indexes
        WHERE indexname LIKE '%embedding%'
        ORDER BY tablename
      `;

      if (indexes.length > 0) {
        indexes.forEach(i => console.log(`   - ${i.tablename}: ${i.indexname}`));
      } else {
        console.log('   (Ningún índice creado aún)');
      }

    } else {
      console.log('❌ pgvector NO está habilitado');
      console.log('\n💡 Para habilitarlo en Supabase:');
      console.log('   1. Ve a tu proyecto en https://supabase.com');
      console.log('   2. Database → Extensions');
      console.log('   3. Busca "vector" y haz clic en "Enable"');
      console.log('   O ejecuta: CREATE EXTENSION vector;');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPgVector();
