import { SuggestionEngine, SuggestionResult } from "./types";
import { SimpleTextSimilarityEngine } from "./simple-text-similarity-engine";
import { EmbeddingEngine } from "./embedding-engine";

class SuggestionService {
  private engines: Map<string, SuggestionEngine> = new Map();
  private defaultEngine: string;

  constructor() {
    const simpleEngine = new SimpleTextSimilarityEngine();
    const embeddingEngine = new EmbeddingEngine();

    this.engines.set("simple", simpleEngine);
    this.engines.set("embedding", embeddingEngine);

    // Use embedding engine if OpenAI key is available and feature is enabled
    this.defaultEngine =
      process.env.ENABLE_EMBEDDING_ENGINE === "true" && process.env.OPENAI_API_KEY
        ? "embedding"
        : "simple";
  }

  async getSuggestions(
    emailSubject: string,
    emailBody: string,
    userId: string,
    engineName?: string
  ): Promise<SuggestionResult> {
    const engine = this.engines.get(engineName || this.defaultEngine);

    if (!engine) {
      throw new Error(`Engine ${engineName || this.defaultEngine} not found`);
    }

    return engine.generateSuggestions(emailSubject, emailBody, userId);
  }

  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  getDefaultEngine(): string {
    return this.defaultEngine;
  }
}

export const suggestionService = new SuggestionService();
