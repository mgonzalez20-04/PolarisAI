import OpenAI from 'openai';
import { EmbeddingCache } from './embedding-cache';

export interface EmbeddingConfig {
  provider?: 'openai';
  model?: string;
  cacheEnabled?: boolean;
}

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private cache: EmbeddingCache;
  private model: string;

  constructor(config: EmbeddingConfig = {}) {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.model = config.model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.cache = new EmbeddingCache();
  }

  /**
   * Genera embedding para un texto (con caché)
   */
  async embed(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Intentar obtener del caché
    const cached = await this.cache.get(text);
    if (cached) {
      return cached;
    }

    // Generar nuevo embedding
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text,
    });

    const embedding = response.data[0].embedding;

    // Guardar en caché
    await this.cache.set(text, embedding, this.model);

    return embedding;
  }

  /**
   * Genera embeddings para múltiples textos en batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const embeddings: number[][] = [];

    // Verificar caché para cada texto
    for (const text of texts) {
      const cached = await this.cache.get(text);
      if (cached) {
        embeddings.push(cached);
      } else {
        embeddings.push([]); // Placeholder para textos no cacheados
      }
    }

    // Obtener índices de textos no cacheados
    const missingIndices: number[] = [];
    const missingTexts: string[] = [];

    embeddings.forEach((emb, idx) => {
      if (emb.length === 0) {
        missingIndices.push(idx);
        missingTexts.push(texts[idx]);
      }
    });

    // Generar embeddings faltantes
    if (missingTexts.length > 0) {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: missingTexts,
      });

      // Insertar embeddings generados y guardar en caché
      for (let i = 0; i < missingIndices.length; i++) {
        const idx = missingIndices[i];
        const embedding = response.data[i].embedding;
        embeddings[idx] = embedding;

        await this.cache.set(texts[idx], embedding, this.model);
      }
    }

    return embeddings;
  }

  /**
   * Calcula similitud coseno entre dos vectores
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Encuentra los N vectores más similares
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidates: Array<{ embedding: number[]; data: any }>,
    topK: number = 5,
    minSimilarity: number = 0.7
  ): Array<{ similarity: number; data: any }> {
    const scored = candidates
      .map((candidate) => ({
        similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
        data: candidate.data,
      }))
      .filter((item) => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return scored;
  }
}
