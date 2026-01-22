/**
 * Script para cargar los capítulos del Manual Portal BGB
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function loadChapter(filePath: string, userId: string): Promise<void> {
  const fileName = path.basename(filePath);
  console.log(`Procesando: ${fileName}`);

  const content = fs.readFileSync(filePath, 'utf-8');

  // Extraer título del documento
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');

  console.log(`  Generando embedding...`);
  const embedding = await generateEmbedding(content);
  const embeddingStr = `[${embedding.join(',')}]`;

  // Insertar en base de datos
  await prisma.$executeRaw`
    INSERT INTO "KnowledgeDocument" (
      id, "userId", title, content, category, tags, language,
      "isPublished", "publishedAt", source, embedding, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      ${userId},
      ${title},
      ${content},
      'portal-bgb-manual',
      '["manual", "portal-bgb", "soporte"]',
      'es',
      true,
      NOW(),
      ${'manual-chapters/' + fileName},
      ${embeddingStr}::vector,
      NOW(),
      NOW()
    )
  `;

  console.log(`  ✅ Cargado\n`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Cargador de Capítulos del Manual Portal BGB');
  console.log('='.repeat(60));
  console.log('');

  // Verificar OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY no está configurada');
    process.exit(1);
  }

  const chaptersDir = path.join(process.cwd(), 'docs', 'manual-chapters');

  if (!fs.existsSync(chaptersDir)) {
    console.error('❌ Error: No existe docs/manual-chapters/');
    console.error('   Ejecuta primero: npx tsx scripts/split-manual-final.ts');
    process.exit(1);
  }

  // Leer todos los archivos .md
  const files = fs.readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.error('❌ No se encontraron capítulos');
    process.exit(1);
  }

  console.log(`Encontrados ${files.length} capítulos para cargar\n`);

  // Obtener usuario admin
  let adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@local.com',
        name: 'Sistema PolarisAI',
        role: 'admin',
      },
    });
  }

  console.log(`Usuario: ${adminUser.email}\n`);

  // Limpiar capítulos anteriores del manual
  await prisma.$executeRaw`
    DELETE FROM "KnowledgeDocument"
    WHERE "userId" = ${adminUser.id}
    AND source LIKE 'manual-chapters/%'
  `;

  // Cargar cada capítulo
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(chaptersDir, file);
    try {
      await loadChapter(filePath, adminUser.id);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  // Resumen
  const total = await prisma.knowledgeDocument.count({
    where: {
      userId: adminUser.id,
      source: { startsWith: 'manual-chapters/' },
    },
  });

  console.log('='.repeat(60));
  console.log('✓ Carga completada');
  console.log('='.repeat(60));
  console.log(`Capítulos cargados: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log(`Total en BD: ${total}`);
  console.log('');
  console.log('✅ Manual Portal BGB disponible para búsqueda vectorial');
}

main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
