import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export class EmbeddingCache {
  private memoryCache: Map<string, number[]>;
  private maxMemorySize: number;

  constructor(maxMemorySize: number = 1000) {
    this.memoryCache = new Map();
    this.maxMemorySize = maxMemorySize;
  }

  /**
   * Obtiene embedding del caché (memoria → BD)
   */
  async get(text: string): Promise<number[] | null> {
    const hash = this.hash(text);

    // 1. Intentar memoria
    if (this.memoryCache.has(hash)) {
      return this.memoryCache.get(hash)!;
    }

    // 2. Intentar BD
    try {
      const cached = await prisma.embeddingCache.findUnique({
        where: { textHash: hash },
      });

      if (cached) {
        const embedding = JSON.parse(cached.embedding);

        // Guardar en memoria para próximas consultas
        this.setMemory(hash, embedding);

        return embedding;
      }
    } catch (error) {
      console.error('Error reading from embedding cache:', error);
    }

    return null;
  }

  /**
   * Guarda embedding en caché (memoria + BD)
   */
  async set(text: string, embedding: number[], model: string): Promise<void> {
    const hash = this.hash(text);

    // Guardar en memoria
    this.setMemory(hash, embedding);

    // Guardar en BD
    try {
      await prisma.embeddingCache.upsert({
        where: { textHash: hash },
        create: {
          textHash: hash,
          embedding: JSON.stringify(embedding),
          model,
        },
        update: {
          embedding: JSON.stringify(embedding),
          model,
        },
      });
    } catch (error) {
      console.error('Error saving to embedding cache:', error);
    }
  }

  /**
   * Guarda en caché de memoria con límite de tamaño
   */
  private setMemory(hash: string, embedding: number[]): void {
    // Si el caché está lleno, eliminar el más antiguo (FIFO)
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(hash, embedding);
  }

  /**
   * Genera hash SHA256 del texto
   */
  private hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Limpia caché de memoria
   */
  clearMemory(): void {
    this.memoryCache.clear();
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): { memorySize: number; maxSize: number } {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.maxMemorySize,
    };
  }
}
