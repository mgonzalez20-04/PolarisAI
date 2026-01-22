import { prisma } from '@/lib/prisma';
import { BaseRetriever } from './base-retriever';
import { RetrievedDocument, SearchConfig } from '../types';
import { EmbeddingService } from '../embeddings/embedding-service';

export class KnowledgeBaseRetriever extends BaseRetriever {
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    super();
    this.embeddingService = embeddingService;
  }

  async search(
    queryEmbedding: number[],
    config: SearchConfig
  ): Promise<RetrievedDocument[]> {
    // Buscar en chunks de documentos publicados
    const chunks = await prisma.knowledgeChunk.findMany({
      where: {
        document: {
          isPublished: true,
          category: config.category || undefined,
        },
        embedding: { not: null },
      },
      include: {
        document: true,
      },
      take: 50, // Obtener más chunks para calcular similitud
    });

    // Calcular similitud para cada chunk
    const scored = chunks
      .map((chunk) => {
        if (!chunk.embedding) return null;

        const embedding = JSON.parse(chunk.embedding);
        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding,
          embedding
        );

        return {
          id: chunk.id,
          title: chunk.document.title,
          content: chunk.content,
          source: 'knowledge_base' as const,
          score: similarity,
          metadata: {
            documentId: chunk.document.id,
            category: chunk.document.category,
            chunkIndex: chunk.chunkIndex,
            language: chunk.document.language,
          },
        };
      })
      .filter((item): item is RetrievedDocument => item !== null);

    // Filtrar, ordenar y limitar
    const filtered = this.filterByScore(scored, config.minSimilarity);
    const sorted = this.sortByScore(filtered);
    return this.limitResults(sorted, config.topK);
  }
}
