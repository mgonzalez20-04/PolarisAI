/**
 * Helper de búsqueda vectorial optimizada usando pgvector
 * Proporciona búsqueda semántica 10x-100x más rápida que JSON arrays
 */

import { prisma } from "@/lib/prisma";

/**
 * Busca emails similares usando embeddings vectoriales
 * @param userId - ID del usuario
 * @param queryEmbedding - Vector de embedding de la consulta (array de 1536 números)
 * @param limit - Número máximo de resultados (default: 10)
 * @returns Array de emails similares con score de similitud
 */
export async function searchSimilarEmails(
  userId: string,
  queryEmbedding: number[],
  limit: number = 10
) {
  // Validar que el embedding tenga 1536 dimensiones
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
    throw new Error(`Invalid embedding: expected 1536 dimensions, got ${queryEmbedding?.length || 0}`);
  }

  // Convertir array a formato pgvector: [1,2,3,...]
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Búsqueda usando distancia coseno (<=> operator)
  // 1 - distancia = similitud (0 = idéntico, 1 = opuesto)
  const results = await prisma.$queryRaw<Array<{
    id: string;
    subject: string;
    bodyPreview: string | null;
    from: string;
    fromEmail: string;
    receivedAt: Date;
    similarity: number;
  }>>`
    SELECT
      id,
      subject,
      "bodyPreview",
      "from",
      "fromEmail",
      "receivedAt",
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM "Email"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Busca en la base de conocimientos usando embeddings vectoriales
 * @param queryEmbedding - Vector de embedding de la consulta
 * @param limit - Número máximo de resultados (default: 5)
 * @param userId - Filtrar por usuario (opcional)
 * @returns Array de chunks de documentos con score de similitud
 */
export async function searchKnowledgeBase(
  queryEmbedding: number[],
  limit: number = 5,
  userId?: string
) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
    throw new Error(`Invalid embedding: expected 1536 dimensions, got ${queryEmbedding?.length || 0}`);
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Buscar en documentos completos (no en chunks)
  if (userId) {
    const results = await prisma.$queryRaw<Array<{
      documentId: string;
      documentTitle: string;
      content: string;
      category: string | null;
      similarity: number;
    }>>`
      SELECT
        kd.id as "documentId",
        kd.title as "documentTitle",
        kd.content,
        kd.category,
        1 - (kd.embedding <=> ${embeddingStr}::vector) as similarity
      FROM "KnowledgeDocument" kd
      WHERE kd.embedding IS NOT NULL
        AND kd."isPublished" = true
        AND kd."userId" = ${userId}
      ORDER BY kd.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
    return results;
  } else {
    const results = await prisma.$queryRaw<Array<{
      documentId: string;
      documentTitle: string;
      content: string;
      category: string | null;
      similarity: number;
    }>>`
      SELECT
        kd.id as "documentId",
        kd.title as "documentTitle",
        kd.content,
        kd.category,
        1 - (kd.embedding <=> ${embeddingStr}::vector) as similarity
      FROM "KnowledgeDocument" kd
      WHERE kd.embedding IS NOT NULL
        AND kd."isPublished" = true
      ORDER BY kd.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
    return results;
  }
}

/**
 * Busca casos similares resueltos usando embeddings
 * @param userId - ID del usuario
 * @param queryEmbedding - Vector de embedding de la consulta
 * @param limit - Número máximo de resultados (default: 5)
 * @returns Array de casos similares con score de similitud
 */
export async function searchSimilarCases(
  userId: string,
  queryEmbedding: number[],
  limit: number = 5
) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
    throw new Error(`Invalid embedding: expected 1536 dimensions, got ${queryEmbedding?.length || 0}`);
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    resolution: string | null;
    response: string | null;
    category: string | null;
    priority: string | null;
    status: string;
    resolvedAt: Date | null;
    similarity: number;
  }>>`
    SELECT
      id,
      title,
      description,
      resolution,
      response,
      category,
      priority,
      status,
      "resolvedAt",
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM "Case"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
      AND status IN ('resolved', 'closed')
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Busca mensajes similares en conversaciones del agente
 * @param userId - ID del usuario
 * @param queryEmbedding - Vector de embedding de la consulta
 * @param role - Filtrar por rol (user, assistant, system)
 * @param limit - Número máximo de resultados (default: 10)
 * @returns Array de mensajes similares con score de similitud
 */
export async function searchSimilarMessages(
  userId: string,
  queryEmbedding: number[],
  role?: 'user' | 'assistant' | 'system',
  limit: number = 10
) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
    throw new Error(`Invalid embedding: expected 1536 dimensions, got ${queryEmbedding?.length || 0}`);
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const roleFilter = role ? `AND am.role = '${role}'` : '';

  const results = await prisma.$queryRaw<Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: Date;
    similarity: number;
  }>>`
    SELECT
      am.id,
      am."conversationId",
      am.role,
      am.content,
      am."createdAt",
      1 - (am.embedding <=> ${embeddingStr}::vector) as similarity
    FROM "AgentMessage" am
    JOIN "AgentConversation" ac ON am."conversationId" = ac.id
    WHERE ac."userId" = ${userId}
      AND am.embedding IS NOT NULL
      ${roleFilter}
    ORDER BY am.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Encuentra emails duplicados o muy similares
 * @param userId - ID del usuario
 * @param threshold - Umbral de similitud (0-1, default: 0.95 = 95% similar)
 * @returns Array de pares de emails similares
 */
export async function findDuplicateEmails(
  userId: string,
  threshold: number = 0.95
) {
  // Esta query es más compleja: busca pares de emails con alta similitud
  const results = await prisma.$queryRaw<Array<{
    email1_id: string;
    email1_subject: string;
    email2_id: string;
    email2_subject: string;
    similarity: number;
  }>>`
    SELECT
      e1.id as email1_id,
      e1.subject as email1_subject,
      e2.id as email2_id,
      e2.subject as email2_subject,
      1 - (e1.embedding <=> e2.embedding) as similarity
    FROM "Email" e1
    CROSS JOIN "Email" e2
    WHERE e1."userId" = ${userId}
      AND e2."userId" = ${userId}
      AND e1.id < e2.id
      AND e1.embedding IS NOT NULL
      AND e2.embedding IS NOT NULL
      AND 1 - (e1.embedding <=> e2.embedding) > ${threshold}
    ORDER BY similarity DESC
    LIMIT 50
  `;

  return results;
}

/**
 * Busca en el caché de embeddings
 * @param textHash - Hash del texto
 * @returns Embedding cacheado o null
 */
export async function getCachedEmbedding(textHash: string) {
  const result = await prisma.embeddingCache.findUnique({
    where: { textHash },
    select: { embedding: true, model: true }
  });

  return result;
}

/**
 * Guarda un embedding en el caché (si no es muy grande)
 * @param textHash - Hash del texto
 * @param embedding - Vector de embedding
 * @param model - Modelo usado (ej: "text-embedding-ada-002")
 */
export async function cacheEmbedding(
  textHash: string,
  embedding: number[],
  model: string
) {
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    throw new Error(`Invalid embedding: expected 1536 dimensions, got ${embedding?.length || 0}`);
  }

  const embeddingStr = `[${embedding.join(',')}]`;

  await prisma.$executeRaw`
    INSERT INTO "EmbeddingCache" (id, "textHash", embedding, model, "createdAt")
    VALUES (gen_random_uuid()::text, ${textHash}, ${embeddingStr}::vector, ${model}, NOW())
    ON CONFLICT ("textHash") DO UPDATE SET
      embedding = ${embeddingStr}::vector,
      model = ${model}
  `;
}
