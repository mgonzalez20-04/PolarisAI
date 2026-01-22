// Conversation Types
export interface Conversation {
  id: string;
  emailId: string;
  userId: string;
  messages: Message[];
  summary?: string;
  tokenCount: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  output?: any;
}

export interface ConversationContext {
  conversationId: string;
  recentMessages: Message[];
  summary?: string;
  totalTokens: number;
}
