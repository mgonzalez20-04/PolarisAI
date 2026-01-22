import { prisma } from '@/lib/prisma';
import { BaseRetriever } from './base-retriever';
import { RetrievedDocument, SearchConfig } from '../types';
import { EmbeddingService } from '../embeddings/embedding-service';

export interface CaseSearchConfig extends SearchConfig {
  userId: string;
  status?: string;
}

export class HistoricalCasesRetriever extends BaseRetriever {
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    super();
    this.embeddingService = embeddingService;
  }

  async search(
    queryEmbedding: number[],
    config: CaseSearchConfig
  ): Promise<RetrievedDocument[]> {
    // Buscar casos resueltos con embedding
    const cases = await prisma.case.findMany({
      where: {
        userId: config.userId,
        status: config.status || 'resolved',
        embedding: { not: null },
      },
      include: {
        email: {
          select: {
            subject: true,
            bodyText: true,
            bodyPreview: true,
          },
        },
      },
      orderBy: {
        resolvedAt: 'desc',
      },
      take: 50, // Obtener más casos para calcular similitud
    });

    // Calcular similitud para cada caso
    const scored = cases
      .map((case_) => {
        if (!case_.embedding) return null;

        const embedding = JSON.parse(case_.embedding);
        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding,
          embedding
        );

        // Construir descripción del caso
        const tags = case_.tags ? JSON.parse(case_.tags) : [];
        const tagsStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';
        const resolvedDate = case_.resolvedAt
          ? case_.resolvedAt.toLocaleDateString()
          : 'Unknown';

        return {
          id: case_.id,
          title: case_.title,
          content: `Case resolved on ${resolvedDate}${tagsStr}\n\nProblem: ${case_.description || case_.email.subject}\n\nResolution: ${case_.resolution}\n\nResponse sent: ${case_.response}`,
          source: 'historical_cases' as const,
          score: similarity,
          metadata: {
            emailId: case_.emailId,
            category: case_.category,
            priority: case_.priority,
            tags,
            resolvedAt: case_.resolvedAt,
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
