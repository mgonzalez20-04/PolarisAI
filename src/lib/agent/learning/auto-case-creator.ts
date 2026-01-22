/**
 * Servicio de creación automática de casos desde emails resueltos
 *
 * Este servicio se ejecuta cuando un email se marca como "Resolved" o "Closed"
 * y extrae automáticamente la solución para crear un caso en la base de conocimientos
 */

import { prisma } from '@/lib/prisma';
import { EmbeddingService } from '../rag/embeddings/embedding-service';

const embeddingService = new EmbeddingService();

export interface AutoCaseResult {
  caseId: string;
  created: boolean;
  reason?: string;
}

/**
 * Crea automáticamente un caso desde un email resuelto
 */
export async function createCaseFromResolvedEmail(
  emailId: string,
  userId: string
): Promise<AutoCaseResult> {
  try {
    // Verificar si ya existe un caso para este email
    const existingCase = await prisma.case.findUnique({
      where: { emailId },
    });

    if (existingCase) {
      return {
        caseId: existingCase.id,
        created: false,
        reason: 'Case already exists for this email',
      };
    }

    // Obtener el email con toda la información
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
      include: {
        tags: { include: { tag: true } },
      },
    });

    if (!email) {
      throw new Error('Email not found');
    }

    // Verificar que el email está resuelto y tiene notas de resolución
    if (email.status !== 'Resolved' && email.status !== 'Closed') {
      return {
        caseId: '',
        created: false,
        reason: 'Email is not resolved or closed',
      };
    }

    if (!email.resolutionNotes || email.resolutionNotes.trim().length < 50) {
      return {
        caseId: '',
        created: false,
        reason: 'Resolution notes are too short or missing (minimum 50 characters)',
      };
    }

    // Extraer tags
    const tags = email.tags.map((et) => et.tag.name);

    // Crear título del caso desde el subject
    const title = email.subject.length > 200 ? email.subject.substring(0, 197) + '...' : email.subject;

    // Crear descripción completa para el embedding
    const fullDescription = `
Subject: ${email.subject}
From: ${email.from} (${email.fromEmail})
Priority: ${email.priority || 'normal'}
Tags: ${tags.join(', ')}

Problem Description:
${email.bodyText || email.bodyPreview || 'No description available'}

Resolution Notes:
${email.resolutionNotes}
    `.trim();

    // Generar embedding del caso completo
    console.log(`Generating embedding for case from email ${emailId}...`);
    const embedding = await embeddingService.generateEmbedding(fullDescription);

    // Determinar categoría basada en tags o contenido
    let category = 'general';
    if (tags.includes('Bug') || tags.includes('bug')) category = 'bug';
    else if (tags.includes('Feature Request') || tags.includes('feature')) category = 'feature';
    else if (tags.includes('Consulta') || tags.includes('question')) category = 'question';
    else if (tags.includes('Configuración') || tags.includes('config')) category = 'configuration';

    // Crear el caso
    const newCase = await prisma.case.create({
      data: {
        userId,
        emailId,
        title,
        description: email.bodyText || email.bodyPreview || '',
        resolution: email.resolutionNotes,
        response: null, // La respuesta al cliente se puede agregar manualmente
        tags: JSON.stringify(tags),
        priority: email.priority || 'medium',
        status: 'resolved',
        category,
        embedding: embedding as any,
        resolvedAt: new Date(),
      },
    });

    console.log(`✓ Case created automatically: ${newCase.id} (${newCase.title})`);

    return {
      caseId: newCase.id,
      created: true,
    };
  } catch (error) {
    console.error('Error creating case from resolved email:', error);
    throw error;
  }
}

/**
 * Procesa todos los emails resueltos sin casos
 * (Útil para migración o procesamiento en batch)
 */
export async function processResolvedEmailsWithoutCases(userId: string): Promise<{
  processed: number;
  created: number;
  skipped: number;
  errors: number;
}> {
  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Buscar emails resueltos sin caso asociado
    const resolvedEmails = await prisma.email.findMany({
      where: {
        userId,
        OR: [
          { status: 'Resolved' },
          { status: 'Closed' },
        ],
        hasCase: false, // No tiene caso asociado
        resolutionNotes: {
          not: null,
        },
      },
      take: 100, // Procesar en batches de 100
    });

    console.log(`Found ${resolvedEmails.length} resolved emails without cases`);

    for (const email of resolvedEmails) {
      stats.processed++;

      try {
        const result = await createCaseFromResolvedEmail(email.id, userId);

        if (result.created) {
          stats.created++;

          // Marcar el email como que tiene caso
          await prisma.email.update({
            where: { id: email.id },
            data: { hasCase: true },
          });
        } else {
          stats.skipped++;
          console.log(`  Skipped ${email.id}: ${result.reason}`);
        }
      } catch (error) {
        stats.errors++;
        console.error(`  Error processing ${email.id}:`, error);
      }
    }

    console.log('Batch processing completed:', stats);
    return stats;
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}

/**
 * Actualiza el embedding de un caso existente
 * (Útil cuando se edita la resolución)
 */
export async function updateCaseEmbedding(caseId: string): Promise<void> {
  try {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    // Crear descripción completa
    const fullDescription = `
Title: ${caseRecord.title}
Category: ${caseRecord.category || 'general'}
Priority: ${caseRecord.priority}
Tags: ${caseRecord.tags || '[]'}

Description:
${caseRecord.description || 'No description'}

Resolution:
${caseRecord.resolution || 'No resolution'}
    `.trim();

    // Generar nuevo embedding
    console.log(`Updating embedding for case ${caseId}...`);
    const embedding = await embeddingService.generateEmbedding(fullDescription);

    // Actualizar caso
    await prisma.case.update({
      where: { id: caseId },
      data: { embedding: embedding as any },
    });

    console.log(`✓ Case embedding updated: ${caseId}`);
  } catch (error) {
    console.error('Error updating case embedding:', error);
    throw error;
  }
}
