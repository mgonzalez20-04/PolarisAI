import { EmbeddingService } from './embeddings/embedding-service';
import { KnowledgeBaseRetriever } from './retrievers/knowledge-base-retriever';
import { HistoricalCasesRetriever } from './retrievers/historical-cases-retriever';
import { ConversationRetriever } from './retrievers/conversation-retriever';
import { RAGContext, RAGResult, RetrievedDocument } from './types';

export interface RAGConfig {
  knowledgeBase: {
    enabled: boolean;
    topK: number;
    minSimilarity: number;
  };
  historicalCases: {
    enabled: boolean;
    topK: number;
    minConfidence: number;
  };
  conversations: {
    enabled: boolean;
    topK: number;
  };
  reranking: {
    enabled: boolean;
    topK: number;
  };
}

export class RAGPipeline {
  private embeddingService: EmbeddingService;
  private knowledgeBaseRetriever: KnowledgeBaseRetriever;
  private historicalCasesRetriever: HistoricalCasesRetriever;
  private conversationRetriever: ConversationRetriever;
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = config;
    this.embeddingService = new EmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-small',
      cacheEnabled: true,
    });

    this.knowledgeBaseRetriever = new KnowledgeBaseRetriever(
      this.embeddingService
    );
    this.historicalCasesRetriever = new HistoricalCasesRetriever(
      this.embeddingService
    );
    this.conversationRetriever = new ConversationRetriever(
      this.embeddingService
    );
  }

  /**
   * Ejecuta búsqueda paralela en todas las fuentes habilitadas
   * y combina resultados
   */
  async retrieve(context: RAGContext): Promise<RAGResult> {
    // 1. Generar embedding de la query (con caché)
    const queryEmbedding = await this.embeddingService.embed(context.query);

    // 2. Búsqueda paralela en todas las fuentes habilitadas
    const searchPromises: Promise<RetrievedDocument[]>[] = [];

    if (this.config.knowledgeBase.enabled) {
      searchPromises.push(
        this.knowledgeBaseRetriever.search(queryEmbedding, {
          topK: this.config.knowledgeBase.topK,
          minSimilarity: this.config.knowledgeBase.minSimilarity,
          category: context.category,
        })
      );
    }

    if (this.config.historicalCases.enabled) {
      searchPromises.push(
        this.historicalCasesRetriever.search(queryEmbedding, {
          topK: this.config.historicalCases.topK,
          minSimilarity: this.config.historicalCases.minConfidence,
          userId: context.userId,
          status: 'resolved',
        })
      );
    }

    if (this.config.conversations.enabled && context.emailId) {
      searchPromises.push(
        this.conversationRetriever.search(queryEmbedding, {
          topK: this.config.conversations.topK,
          minSimilarity: 0.7,
          userId: context.userId,
          emailId: context.emailId,
        })
      );
    }

    const results = await Promise.all(searchPromises);

    // 3. Combinar resultados de todas las fuentes
    const allResults = results.flat();

    // 4. Rerank si está habilitado (por ahora, simple ordenamiento por score)
    let finalResults = allResults;
    if (this.config.reranking.enabled) {
      finalResults = this.rerank(allResults, context.query);
      finalResults = finalResults.slice(0, this.config.reranking.topK);
    }

    // 5. Construir contexto estructurado
    const formattedContext = this.formatContext(finalResults);

    return {
      sources: finalResults,
      context: formattedContext,
      complexity: this.assessComplexity(finalResults),
      needsReasoning: this.needsReasoning(context.query, finalResults),
    };
  }

  /**
   * Rerank resultados (por ahora simple, se puede mejorar con cross-encoder)
   */
  private rerank(
    documents: RetrievedDocument[],
    query: string
  ): RetrievedDocument[] {
    // Simple reranking: priorizar documentos de knowledge base
    // y casos resueltos recientes
    return documents.sort((a, b) => {
      // Bonus para knowledge base
      let scoreA = a.score;
      let scoreB = b.score;

      if (a.source === 'knowledge_base') scoreA += 0.1;
      if (b.source === 'knowledge_base') scoreB += 0.1;

      // Bonus para casos muy recientes
      if (a.source === 'historical_cases' && a.metadata?.resolvedAt) {
        const daysAgo =
          (Date.now() - new Date(a.metadata.resolvedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysAgo < 30) scoreA += 0.05;
      }

      if (b.source === 'historical_cases' && b.metadata?.resolvedAt) {
        const daysAgo =
          (Date.now() - new Date(b.metadata.resolvedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysAgo < 30) scoreB += 0.05;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Formatea los resultados en contexto estructurado para el prompt
   */
  private formatContext(results: RetrievedDocument[]): string {
    if (results.length === 0) {
      return 'No relevant information found in the knowledge base or historical cases.';
    }

    const sections: Record<string, RetrievedDocument[]> = {
      knowledge_base: [],
      historical_cases: [],
      conversations: [],
    };

    results.forEach((doc) => {
      sections[doc.source].push(doc);
    });

    let context = '';

    // Knowledge Base
    if (sections.knowledge_base.length > 0) {
      context += '# Technical Documentation:\n\n';
      sections.knowledge_base.forEach((doc, i) => {
        context += `${i + 1}. ${doc.title} (relevance: ${(doc.score * 100).toFixed(1)}%)\n`;
        context += `${doc.content.substring(0, 500)}...\n\n`;
      });
    }

    // Historical Cases
    if (sections.historical_cases.length > 0) {
      context += '# Similar Resolved Cases:\n\n';
      sections.historical_cases.forEach((doc, i) => {
        context += `${i + 1}. ${doc.title} (relevance: ${(doc.score * 100).toFixed(1)}%)\n`;
        context += `${doc.content}\n\n`;
      });
    }

    // Previous Conversations
    if (sections.conversations.length > 0) {
      context += '# Previous Conversations:\n\n';
      sections.conversations.forEach((doc, i) => {
        context += `${i + 1}. ${doc.content.substring(0, 300)}...\n\n`;
      });
    }

    return context;
  }

  /**
   * Evalúa la complejidad del problema basándose en los resultados
   */
  private assessComplexity(results: RetrievedDocument[]): number {
    if (results.length === 0) return 0.8; // Sin contexto = complejo

    // Promedio de scores
    const avgScore =
      results.reduce((sum, doc) => sum + doc.score, 0) / results.length;

    // Si hay muchos resultados con score bajo, es complejo
    if (avgScore < 0.75) return 0.8;

    // Si hay resultados con score alto, es simple
    if (avgScore > 0.9) return 0.3;

    return 0.5;
  }

  /**
   * Determina si el problema requiere razonamiento complejo
   */
  private needsReasoning(query: string, results: RetrievedDocument[]): boolean {
    // Keywords que indican necesidad de razonamiento
    const reasoningKeywords = [
      'por qué',
      'why',
      'cómo',
      'how',
      'explicar',
      'explain',
      'comparar',
      'compare',
      'diferencia',
      'difference',
    ];

    const lowerQuery = query.toLowerCase();
    const hasReasoningKeyword = reasoningKeywords.some((kw) =>
      lowerQuery.includes(kw)
    );

    // Si no hay buenos resultados, necesita razonamiento
    const hasGoodResults = results.some((r) => r.score > 0.85);

    return hasReasoningKeyword || !hasGoodResults;
  }
}
