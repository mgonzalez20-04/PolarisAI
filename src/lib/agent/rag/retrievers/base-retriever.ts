import { RetrievedDocument, SearchConfig } from '../types';

export abstract class BaseRetriever {
  abstract search(
    queryEmbedding: number[],
    config: SearchConfig
  ): Promise<RetrievedDocument[]>;

  /**
   * Filtra documentos por score mínimo
   */
  protected filterByScore(
    documents: RetrievedDocument[],
    minScore: number
  ): RetrievedDocument[] {
    return documents.filter((doc) => doc.score >= minScore);
  }

  /**
   * Limita resultados a topK
   */
  protected limitResults(
    documents: RetrievedDocument[],
    topK: number
  ): RetrievedDocument[] {
    return documents.slice(0, topK);
  }

  /**
   * Ordena por score descendente
   */
  protected sortByScore(documents: RetrievedDocument[]): RetrievedDocument[] {
    return documents.sort((a, b) => b.score - a.score);
  }
}
