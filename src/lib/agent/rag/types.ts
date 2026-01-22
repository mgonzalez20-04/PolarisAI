// RAG Types
export interface RAGContext {
  query: string;
  emailId?: string;
  userId: string;
  conversationHistory?: any[];
  category?: string;
}

export interface RAGResult {
  sources: RetrievedDocument[];
  context: string;
  complexity: number;
  needsReasoning: boolean;
}

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  source: 'knowledge_base' | 'historical_cases' | 'conversations';
  score: number;
  metadata?: any;
}

export interface SearchConfig {
  topK: number;
  minSimilarity: number;
  category?: string;
}
