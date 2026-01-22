import { Message } from '../types/conversation-types';

export class TokenCounter {
  /**
   * Cuenta tokens aproximadamente (Claude usa ~4 chars = 1 token)
   */
  count(messages: Array<{ content: string }> | string): number {
    if (typeof messages === 'string') {
      return Math.ceil(messages.length / 4);
    }

    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estima costo según modelo y tokens
   */
  estimateCost(usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  }): number {
    const costs: Record<string, { input: number; output: number }> = {
      'claude-3-5-haiku-20241022': {
        input: parseFloat(process.env.CLAUDE_HAIKU_INPUT_COST || '0.00025') / 1000,
        output: parseFloat(process.env.CLAUDE_HAIKU_OUTPUT_COST || '0.00125') / 1000,
      },
      'claude-3-5-sonnet-20241022': {
        input: parseFloat(process.env.CLAUDE_SONNET_INPUT_COST || '0.003') / 1000,
        output: parseFloat(process.env.CLAUDE_SONNET_OUTPUT_COST || '0.015') / 1000,
      },
    };

    const modelCosts =
      costs[usage.model] || costs['claude-3-5-haiku-20241022'];

    return (
      usage.inputTokens * modelCosts.input +
      usage.outputTokens * modelCosts.output
    );
  }

  /**
   * Verifica si una conversación necesita resumen
   */
  needsSummary(tokenCount: number): boolean {
    const threshold = parseInt(
      process.env.CONVERSATION_SUMMARY_THRESHOLD || '8000'
    );
    return tokenCount > threshold;
  }
}
