const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Migrando embeddings a pgvector...\n');

  try {
    // 1. Habilitar extensión pgvector
    console.log('1️⃣ Habilitando extensión pgvector...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log('   ✅ Extensión habilitada\n');

    // 2. Tablas a migrar
    const tables = [
      'Email',
      'Case',
      'AgentMessage',
      'KnowledgeDocument',
      'KnowledgeChunk',
      'EmbeddingCache'
    ];

    for (const table of tables) {
      console.log(`📦 Procesando tabla ${table}...`);

      // 2.1 Agregar columna temporal embedding_new de tipo vector
      console.log(`   ↳ Agregando columna embedding_new...`);
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "embedding_new" vector(1536)`
        );
        console.log(`   ✅ Columna agregada`);
      } catch (error) {
        console.log(`   ⚠️  Columna ya existe`);
      }

      // 2.2 Contar cuántos registros tienen embeddings
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${table}" WHERE embedding IS NOT NULL AND embedding != ''`
      );
      const totalWithEmbeddings = parseInt(countResult[0]?.count || 0);

      if (totalWithEmbeddings === 0) {
        console.log(`   ℹ️  No hay embeddings para migrar en ${table}\n`);
        continue;
      }

      console.log(`   ↳ Encontrados ${totalWithEmbeddings} registros con embeddings`);

      // 2.3 Migrar datos JSON → vector en lotes
      console.log(`   ↳ Migrando embeddings...`);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, embedding FROM "${table}" WHERE embedding IS NOT NULL AND embedding != '' LIMIT 1000`
      );

      let migratedCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          // Parsear el JSON
          const embeddingArray = JSON.parse(row.embedding);

          // Validar que sea un array de 1536 números
          if (!Array.isArray(embeddingArray) || embeddingArray.length !== 1536) {
            console.warn(`     ⚠️  Registro ${row.id}: embedding inválido (longitud: ${embeddingArray?.length || 0})`);
            errorCount++;
            continue;
          }

          // Convertir a formato pgvector: [1,2,3,...]
          const vectorStr = `[${embeddingArray.join(',')}]`;

          // Actualizar el registro
          await prisma.$executeRawUnsafe(
            `UPDATE "${table}" SET "embedding_new" = $1::vector WHERE id = $2`,
            vectorStr,
            row.id
          );

          migratedCount++;

          // Mostrar progreso cada 50 registros
          if (migratedCount % 50 === 0) {
            console.log(`     ↳ Migrados ${migratedCount}/${totalWithEmbeddings}...`);
          }
        } catch (error) {
          console.warn(`     ⚠️  Error en registro ${row.id}:`, error.message);
          errorCount++;
        }
      }

      console.log(`   ✅ ${migratedCount} registros migrados (${errorCount} errores)\n`);
    }

    // 3. Renombrar columnas (embedding → embedding_old, embedding_new → embedding)
    console.log('3️⃣ Renombrando columnas...');
    for (const table of tables) {
      try {
        // Renombrar embedding → embedding_old (respaldo)
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${table}" RENAME COLUMN "embedding" TO "embedding_old"`
        );
        console.log(`   ↳ ${table}: embedding → embedding_old`);

        // Renombrar embedding_new → embedding
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${table}" RENAME COLUMN "embedding_new" TO "embedding"`
        );
        console.log(`   ↳ ${table}: embedding_new → embedding`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    console.log('   ✅ Columnas renombradas\n');

    // 4. Crear índices HNSW para búsqueda rápida
    console.log('4️⃣ Creando índices HNSW...');
    const indices = [
      { table: 'Email', name: 'email_embedding_idx' },
      { table: 'Case', name: 'case_embedding_idx' },
      { table: 'AgentMessage', name: 'message_embedding_idx' },
      { table: 'KnowledgeDocument', name: 'doc_embedding_idx' },
      { table: 'KnowledgeChunk', name: 'chunk_embedding_idx' },
      { table: 'EmbeddingCache', name: 'cache_embedding_idx' },
    ];

    for (const { table, name } of indices) {
      try {
        console.log(`   ↳ Creando índice ${name}...`);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" USING hnsw (embedding vector_cosine_ops)`
        );
        console.log(`   ✅ ${name} creado`);
      } catch (error) {
        console.log(`   ⚠️  ${name}: ${error.message}`);
      }
    }
    console.log('   ✅ Índices HNSW creados\n');

    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('\n📝 Notas importantes:');
    console.log('   • Las columnas embedding_old contienen los datos JSON originales como respaldo');
    console.log('   • Puedes eliminarlas más tarde con: ALTER TABLE "TableName" DROP COLUMN "embedding_old"');
    console.log('   • Los índices HNSW aceleran las búsquedas de similitud 10x-100x');
    console.log('   • Ahora puedes usar búsqueda vectorial nativa en PostgreSQL');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmación antes de ejecutar
console.log('⚠️  IMPORTANTE: Esta migración modificará la estructura de la base de datos\n');
console.log('Asegúrate de que:');
console.log('  1. Tienes un respaldo de la base de datos');
console.log('  2. La extensión pgvector está disponible en tu Supabase');
console.log('  3. No hay operaciones críticas ejecutándose\n');

migrate();
