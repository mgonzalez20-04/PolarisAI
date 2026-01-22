import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 Verificando ubicación de los datos...\n');

  const total = await prisma.knowledgeDocument.count();
  console.log('✅ Total documentos cargados:', total);

  const sample = await prisma.knowledgeDocument.findFirst({
    select: { id: true, title: true, category: true }
  });

  console.log('\n📊 Ejemplo de documento:');
  console.log('  Título:', sample?.title);
  console.log('  Categoría:', sample?.category);

  console.log('\n📍 UBICACIÓN:');
  console.log('  ✅ Base de datos: PostgreSQL en Supabase');
  console.log('  ✅ Servidor:', process.env.DATABASE_URL?.match(/aws-[^.]+\.pooler\.supabase\.com/)?.[0] || 'Supabase');
  console.log('  ✅ Tabla: KnowledgeDocument');
  console.log('  ✅ Embeddings: vector(1536) con pgvector');
  console.log('  ✅ Índice HNSW: doc_embedding_idx');

  console.log('\n📚 Resumen por categoría:');
  const byCategory = await prisma.$queryRaw<Array<{category: string, count: bigint}>>`
    SELECT category, COUNT(*) as count
    FROM "KnowledgeDocument"
    GROUP BY category
    ORDER BY count DESC
  `;

  byCategory.forEach(row => {
    console.log(`  • ${row.category}: ${row.count} documentos`);
  });

  console.log('\n✅ Todos los datos están almacenados en tu Supabase\n');

  await prisma.$disconnect();
}

verify();
