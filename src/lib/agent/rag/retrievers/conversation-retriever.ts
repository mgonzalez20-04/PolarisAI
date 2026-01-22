import { prisma } from '@/lib/prisma';
import { BaseRetriever } from './base-retriever';
import { RetrievedDocument, SearchConfig } from '../types';
import { EmbeddingService } from '../embeddings/embedding-service';

export interface ConversationSearchConfig extends SearchConfig {
  userId: string;
  emailId?: string;
}

export class ConversationRetriever extends BaseRetriever {
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    super();
    this.embeddingService = embeddingService;
  }

  async search(
    queryEmbedding: number[],
    config: ConversationSearchConfig
  ): Promise<RetrievedDocument[]> {
    // Buscar mensajes de conversaciones previas
    const messages = await prisma.agentMessage.findMany({
      where: {
        conversation: {
          userId: config.userId,
          emailId: config.emailId || undefined,
        },
        embedding: { not: null },
        role: 'assistant', // Solo respuestas del agente
      },
      include: {
        conversation: {
          include: {
            email: {
              select: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30, // Últimos 30 mensajes
    });

    // Calcular similitud para cada mensaje
    const scored = messages
      .map((message) => {
        if (!message.embedding) return null;

        const embedding = JSON.parse(message.embedding);
        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding,
          embedding
        );

        return {
          id: message.id,
          title: `Previous conversation about: ${message.conversation.email.subject}`,
          content: message.content,
          source: 'conversations' as const,
          score: similarity,
          metadata: {
            conversationId: message.conversationId,
            emailId: message.conversation.emailId,
            createdAt: message.createdAt,
            model: message.model,
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
