/**
 * Script simplificado para cargar la base de conocimientos
 * Sin caché de embeddings para evitar problemas con Prisma
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

interface DocumentMetadata {
  fileName: string;
  category: string;
  title: string;
  section: number;
}

/**
 * Extrae metadata del documento desde el contenido
 */
function extractMetadata(content: string, fileName: string): DocumentMetadata {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');

  const categoryMatch = fileName.match(/^(\d+)-(.+)\.md$/);
  const section = categoryMatch ? parseInt(categoryMatch[1]) : 0;
  const category = categoryMatch ? categoryMatch[2] : 'general';

  return { fileName, category, title, section };
}

/**
 * Genera embedding usando OpenAI directamente (sin caché)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Procesa un archivo markdown y lo guarda en la base de datos
 */
async function processDocument(filePath: string, userId: string): Promise<void> {
  console.log(`Procesando: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(content, fileName);

  console.log(`  Generando embedding...`);
  const documentEmbedding = await generateEmbedding(content);

  // Convertir embedding a formato pgvector
  const embeddingStr = `[${documentEmbedding.join(',')}]`;

  // Crear documento usando raw SQL para evitar problemas con Prisma
  await prisma.$executeRaw`
    INSERT INTO "KnowledgeDocument" (
      id, "userId", title, content, category, tags, language,
      "isPublished", "publishedAt", source, embedding, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      ${userId},
      ${metadata.title},
      ${content},
      ${metadata.category},
      ${JSON.stringify([`section-${metadata.section}`, metadata.category])},
      'es',
      true,
      NOW(),
      ${'docs/' + fileName},
      ${embeddingStr}::vector,
      NOW(),
      NOW()
    )
  `;

  console.log(`  ✓ Documento cargado\n`);
}

/**
 * Función principal
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Cargador Simplificado de Base de Conocimientos');
  console.log('='.repeat(60));
  console.log('');

  // Verificar OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY no está configurada');
    process.exit(1);
  }

  // Verificar carpeta docs/
  const docsPath = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsPath)) {
    console.error('❌ Error: La carpeta docs/ no existe');
    process.exit(1);
  }

  // Leer archivos .md
  const files = fs.readdirSync(docsPath)
    .filter(file => file.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.error('❌ Error: No se encontraron archivos .md en docs/');
    process.exit(1);
  }

  console.log(`Encontrados ${files.length} documentos para procesar:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log('');

  // Obtener usuario admin
  let adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!adminUser) {
    console.log('⚠️  No se encontró usuario admin, creando...');
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@local.com',
        name: 'Sistema PolarisAI',
        role: 'admin',
      },
    });
  }

  console.log(`Usando usuario: ${adminUser.email} (${adminUser.id})`);
  console.log('');

  // Limpiar documentos existentes
  const existingCount = await prisma.$executeRaw`
    DELETE FROM "KnowledgeDocument"
    WHERE "userId" = ${adminUser.id}
    AND source LIKE 'docs/%'
  `;

  if (existingCount > 0) {
    console.log(`Eliminados ${existingCount} documentos existentes\n`);
  }

  // Procesar cada documento
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(docsPath, file);
    try {
      await processDocument(filePath, adminUser.id);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Error procesando ${file}:`, error.message);
      errorCount++;
    }
  }

  // Resumen final
  const totalDocs = await prisma.knowledgeDocument.count({
    where: {
      userId: adminUser.id,
      source: { startsWith: 'docs/' },
    },
  });

  console.log('='.repeat(60));
  console.log('✓ Carga completada');
  console.log('='.repeat(60));
  console.log(`Documentos cargados: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log(`Total en BD: ${totalDocs}`);
  console.log('');
  console.log('Los documentos están ahora disponibles para búsqueda vectorial');
}

// Ejecutar script
main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
