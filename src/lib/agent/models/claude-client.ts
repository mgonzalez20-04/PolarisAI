import Anthropic from '@anthropic-ai/sdk';
import { Message, ToolCall } from '../types/conversation-types';
import { LangChainTool } from '../types/tool-types';

export interface ClaudeResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
}

export interface ChatConfig {
  model: 'claude-3-5-haiku-20241022' | 'claude-3-5-sonnet-20241022';
  messages: Message[];
  tools?: LangChainTool[];
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Chat completion con tools (function calling)
   */
  async chat(config: ChatConfig): Promise<ClaudeResponse> {
    const anthropicMessages = config.messages.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));

    const tools = config.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.schema,
    }));

    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      messages: anthropicMessages,
      tools: tools && tools.length > 0 ? tools : undefined,
      system: config.system,
    });

    return {
      text: this.extractText(response),
      toolCalls: this.extractToolCalls(response),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Streaming response
   */
  async *stream(config: ChatConfig): AsyncGenerator<string> {
    const anthropicMessages = config.messages.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));

    const tools = config.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.schema,
    }));

    const stream = await this.client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      messages: anthropicMessages,
      tools: tools && tools.length > 0 ? tools : undefined,
      system: config.system,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        const delta = chunk.delta;
        if (delta.type === 'text_delta') {
          yield delta.text;
        }
      }
    }
  }

  /**
   * Resumen de conversación
   */
  async summarize(config: {
    messages: any[];
    model: string;
    maxTokens: number;
  }): Promise<{ text: string }> {
    const prompt = this.buildSummaryPrompt(config.messages);

    const response = await this.client.messages.create({
      model: config.model as any,
      max_tokens: config.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return { text: this.extractText(response) };
  }

  private extractText(response: any): string {
    const textBlock = response.content.find(
      (block: any) => block.type === 'text'
    );
    return textBlock?.text || '';
  }

  private extractToolCalls(response: any): ToolCall[] {
    return response.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));
  }

  private buildSummaryPrompt(messages: any[]): string {
    let conversation = 'Conversation to summarize:\n\n';

    for (const msg of messages) {
      conversation += `${msg.role}: ${msg.content}\n`;
    }

    conversation += `\n\nProvide a concise summary of this conversation (max 500 tokens) including:
- Main issue/question
- Actions taken
- Current status
- Next steps (if any)`;

    return conversation;
  }
}
