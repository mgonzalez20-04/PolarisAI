/**
 * Script para cargar la base de conocimientos (manual) en la base de datos
 *
 * Este script lee todos los archivos .md de la carpeta docs/
 * y los carga en la tabla KnowledgeDocument con sus embeddings
 *
 * Uso: npx tsx scripts/load-knowledge-base.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EmbeddingService } from '../src/lib/agent/rag/embeddings/embedding-service';

const prisma = new PrismaClient();
const embeddingService = new EmbeddingService();

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
  // Extraer título del primer H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');

  // Extraer categoría del nombre del archivo (prefijo numérico)
  const categoryMatch = fileName.match(/^(\d+)-(.+)\.md$/);
  const section = categoryMatch ? parseInt(categoryMatch[1]) : 0;
  const category = categoryMatch ? categoryMatch[2] : 'general';

  return {
    fileName,
    category,
    title,
    section,
  };
}

/**
 * Divide el contenido en chunks para embeddings más precisos
 */
function chunkDocument(content: string, metadata: DocumentMetadata): Array<{ content: string; metadata: any }> {
  const chunks: Array<{ content: string; metadata: any }> = [];

  // Dividir por secciones H2 (##)
  const sections = content.split(/^##\s+/m).filter(s => s.trim());

  // Si hay más de una sección, dividir
  if (sections.length > 1) {
    sections.forEach((section, index) => {
      const sectionTitle = section.split('\n')[0].trim();
      const sectionContent = section.substring(sectionTitle.length).trim();

      if (sectionContent.length > 100) { // Solo chunks significativos
        chunks.push({
          content: `## ${sectionTitle}\n\n${sectionContent}`,
          metadata: {
            ...metadata,
            subsection: sectionTitle,
            chunkIndex: index,
          },
        });
      }
    });
  } else {
    // Si es muy corto o no tiene subsecciones, usar todo el documento
    chunks.push({
      content: content,
      metadata: {
        ...metadata,
        chunkIndex: 0,
      },
    });
  }

  return chunks;
}

/**
 * Procesa un archivo markdown y lo guarda en la base de datos
 */
async function processDocument(filePath: string, userId: string): Promise<void> {
  console.log(`Procesando: ${path.basename(filePath)}`);

  // Leer contenido
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(content, fileName);

  // Generar embedding del documento completo
  console.log(`  Generando embedding del documento...`);
  const documentEmbedding = await embeddingService.embed(content);

  // Crear documento en la base de datos
  const document = await prisma.knowledgeDocument.create({
    data: {
      userId,
      title: metadata.title,
      content,
      category: metadata.category,
      tags: JSON.stringify([`section-${metadata.section}`, metadata.category]),
      language: 'es',
      isPublished: true,
      publishedAt: new Date(),
      source: `docs/${fileName}`,
      embedding: documentEmbedding as any,
    },
  });

  console.log(`  Documento creado: ${document.id}`);

  // Dividir en chunks y generar embeddings
  const chunks = chunkDocument(content, metadata);
  console.log(`  Procesando ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Generar embedding del chunk
    const chunkEmbedding = await embeddingService.embed(chunk.content);

    // Estimar tokens (aproximado: 1 token ≈ 4 caracteres)
    const tokenCount = Math.ceil(chunk.content.length / 4);

    // Crear chunk en la base de datos
    await prisma.knowledgeChunk.create({
      data: {
        documentId: document.id,
        content: chunk.content,
        chunkIndex: i,
        tokenCount,
        metadata: JSON.stringify(chunk.metadata),
        embedding: chunkEmbedding as any,
      },
    });

    console.log(`    Chunk ${i + 1}/${chunks.length} procesado`);
  }

  console.log(`✓ Documento completado: ${metadata.title}\n`);
}

/**
 * Función principal
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Cargador de Base de Conocimientos');
  console.log('='.repeat(60));
  console.log('');

  // Verificar que existe la carpeta docs/
  const docsPath = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsPath)) {
    console.error('❌ Error: La carpeta docs/ no existe');
    console.error('   Crea la carpeta docs/ y coloca tus archivos .md ahí');
    process.exit(1);
  }

  // Leer todos los archivos .md
  const files = fs.readdirSync(docsPath)
    .filter(file => file.endsWith('.md'))
    .sort(); // Ordenar por nombre (01-, 02-, etc.)

  if (files.length === 0) {
    console.error('❌ Error: No se encontraron archivos .md en docs/');
    process.exit(1);
  }

  console.log(`Encontrados ${files.length} documentos para procesar:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log('');

  // Obtener o crear usuario administrador para documentos del sistema
  let adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!adminUser) {
    console.log('⚠️  No se encontró usuario admin, creando usuario del sistema...');
    adminUser = await prisma.user.create({
      data: {
        email: 'system@polarisai.local',
        name: 'Sistema PolarisAI',
        role: 'admin',
      },
    });
  }

  console.log(`Usando usuario: ${adminUser.email} (${adminUser.id})`);
  console.log('');

  // Limpiar documentos existentes del sistema (opcional)
  const existingDocs = await prisma.knowledgeDocument.count({
    where: {
      userId: adminUser.id,
      source: { startsWith: 'docs/' },
    },
  });

  if (existingDocs > 0) {
    console.log(`⚠️  Se encontraron ${existingDocs} documentos existentes`);
    console.log('   Eliminando documentos antiguos...');

    // Eliminar chunks primero (relación ON DELETE CASCADE debería hacerlo automáticamente)
    await prisma.knowledgeDocument.deleteMany({
      where: {
        userId: adminUser.id,
        source: { startsWith: 'docs/' },
      },
    });

    console.log('   ✓ Documentos antiguos eliminados');
    console.log('');
  }

  // Procesar cada documento
  for (const file of files) {
    const filePath = path.join(docsPath, file);
    try {
      await processDocument(filePath, adminUser.id);
    } catch (error) {
      console.error(`❌ Error procesando ${file}:`, error);
      // Continuar con el siguiente archivo
    }
  }

  // Resumen final
  const totalDocs = await prisma.knowledgeDocument.count({
    where: {
      userId: adminUser.id,
      source: { startsWith: 'docs/' },
    },
  });

  const totalChunks = await prisma.knowledgeChunk.count({
    where: {
      document: {
        userId: adminUser.id,
        source: { startsWith: 'docs/' },
      },
    },
  });

  console.log('='.repeat(60));
  console.log('✓ Carga completada exitosamente');
  console.log('='.repeat(60));
  console.log(`Total documentos: ${totalDocs}`);
  console.log(`Total chunks: ${totalChunks}`);
  console.log('');
  console.log('Los documentos están ahora disponibles para el agente de IA');
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
