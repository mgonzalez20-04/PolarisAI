// Agent AI Types
export interface AgentConfig {
  models: {
    haiku: string;
    sonnet: string;
  };
  ragConfig: RAGConfig;
}

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

export interface AgentInput {
  emailId: string;
  userId: string;
  message: string;
  taskType?: TaskType;
  conversationId?: string;
}

export type TaskType =
  | 'classification'
  | 'search'
  | 'summary'
  | 'response_generation'
  | 'search_and_analysis';

export interface AgentResponse {
  text: string;
  conversationId: string;
  model: string;
  toolCalls: ToolCall[];
  usage: TokenUsage;
  cost: number;
  responseTimeMs: number;
  ragSources: RAGSource[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  output?: any;
}

export interface RAGSource {
  id: string;
  title: string;
  content: string;
  source: 'knowledge_base' | 'historical_cases' | 'conversations';
  score: number;
  metadata?: any;
}

export interface AgentStreamChunk {
  type: 'text' | 'tool_call' | 'completion';
  content?: string;
  toolCall?: ToolCall;
}

export interface ModelConfig {
  name: string;
  provider: 'anthropic' | 'openai';
  maxTokens: number;
  temperature: number;
}
