import { prisma } from '@/lib/prisma';
import { ConversationManager } from './conversation-manager';
import { TokenCounter } from './token-counter';
import { ModelRouter } from '../models/model-router';
import { ClaudeClient } from '../models/claude-client';
import { RAGPipeline } from '../rag/rag-pipeline';
import { ToolRegistry } from '../tools/tool-registry';
import { getSystemPrompt } from '../prompts/system-prompts';
import { AgentConfig, AgentInput, AgentResponse, TaskType } from '../types/agent-types';

export class AgentOrchestrator {
  private conversationManager: ConversationManager;
  private ragPipeline: RAGPipeline;
  private toolRegistry: ToolRegistry;
  private modelRouter: ModelRouter;
  private tokenCounter: TokenCounter;
  private claudeClient: ClaudeClient;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.conversationManager = new ConversationManager();
    this.ragPipeline = new RAGPipeline(config.ragConfig);
    this.toolRegistry = new ToolRegistry();
    this.modelRouter = new ModelRouter();
    this.tokenCounter = new TokenCounter();
    this.claudeClient = new ClaudeClient();
  }

  /**
   * Procesa un mensaje del usuario con contexto completo
   * - Carga historial de conversación si existe
   * - Ejecuta RAG multi-fuente
   * - Selecciona modelo apropiado (Haiku vs Sonnet)
   * - Ejecuta agent con tools
   * - Guarda conversación actualizada
   */
  async processMessage(input: AgentInput): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // 1. Obtener contexto del email
      const email = await prisma.email.findFirst({
        where: { id: input.emailId, userId: input.userId },
        include: {
          tags: {
            include: { tag: true },
          },
          case: true,
        },
      });

      if (!email) {
        throw new Error('Email not found');
      }

      // 2. Cargar o crear conversación (AHORRO DE COSTOS)
      const conversation = await this.conversationManager.loadOrCreate(
        input.emailId,
        input.userId
      );

      console.log(
        `Conversation ${conversation.id} loaded with ${conversation.messages.length} messages (${conversation.tokenCount} tokens)`
      );

      // 3. Verificar si necesita resumen
      if (this.tokenCounter.needsSummary(conversation.tokenCount)) {
        console.log('Conversation exceeds token threshold, summarizing...');
        await this.conversationManager.summarize(conversation.id);
        // Recargar conversación con resumen
        const updatedConversation = await this.conversationManager.loadOrCreate(
          input.emailId,
          input.userId
        );
        conversation.messages = updatedConversation.messages;
        conversation.summary = updatedConversation.summary;
      }

      // 4. Ejecutar RAG pipeline (búsqueda en múltiples fuentes)
      let ragContext;
      try {
        ragContext = await this.ragPipeline.retrieve({
          query: input.message,
          emailId: input.emailId,
          userId: input.userId,
          conversationHistory: conversation.messages,
        });
        console.log(
          `RAG retrieved ${ragContext.sources.length} sources (complexity: ${ragContext.complexity.toFixed(2)})`
        );
      } catch (error) {
        console.error('Error in RAG pipeline:', error);
        // Continuar sin RAG si falla
        ragContext = {
          sources: [],
          context: '',
          complexity: 0.5,
          needsReasoning: false,
        };
      }

      // 5. Seleccionar modelo según tipo de tarea y complejidad
      const modelConfig = this.modelRouter.selectModel({
        taskType: input.taskType || 'response_generation',
        complexity: ragContext.complexity,
        needsReasoning: ragContext.needsReasoning,
      });

      console.log(`Selected model: ${modelConfig.name}`);

      // 6. Construir contexto del email
      const emailContext = this.buildEmailContext(email);

      // 7. Construir prompt con RAG context
      const systemPrompt = getSystemPrompt(input.taskType || 'response_generation');
      const fullSystemPrompt = conversation.summary
        ? `${systemPrompt}\n\n## Previous Conversation Summary:\n${conversation.summary}`
        : systemPrompt;

      const ragPrompt = ragContext.context
        ? `\n\n## Relevant Information:\n${ragContext.context}`
        : '';

      const userMessage = `${emailContext}\n\nUser Question: ${input.message}${ragPrompt}`;

      // 8. Preparar mensajes para Claude
      const messages = [
        ...conversation.messages.slice(-5), // Solo últimos 5 mensajes para ahorrar tokens
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      // 9. Llamar a Claude con tools
      const response = await this.claudeClient.chat({
        model: modelConfig.name as any,
        messages,
        tools: this.toolRegistry.toClaudeTools(),
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        system: fullSystemPrompt,
      });

      const responseTime = Date.now() - startTime;

      // 10. Ejecutar tool calls si los hay
      const toolResults = [];
      if (response.toolCalls.length > 0) {
        console.log(`Executing ${response.toolCalls.length} tool calls...`);
        for (const toolCall of response.toolCalls) {
          try {
            const result = await this.toolRegistry.executeTool(
              toolCall.name,
              toolCall.input
            );
            toolResults.push({
              ...toolCall,
              output: result,
            });
            console.log(`Tool ${toolCall.name} executed successfully`);
          } catch (error) {
            console.error(`Error executing tool ${toolCall.name}:`, error);
            toolResults.push({
              ...toolCall,
              output: { success: false, error: String(error) },
            });
          }
        }
      }

      // 11. Guardar mensajes en la conversación
      await this.conversationManager.addMessages(conversation.id, [
        { role: 'user', content: input.message },
        {
          role: 'assistant',
          content: response.text,
          toolCalls: toolResults.length > 0 ? toolResults : undefined,
        },
      ]);

      // 12. Calcular costo
      const cost = this.tokenCounter.estimateCost({
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        model: modelConfig.name,
      });

      console.log(
        `Response generated in ${responseTime}ms. Cost: $${cost.toFixed(6)}, Tokens: ${response.usage.inputTokens + response.usage.outputTokens}`
      );

      return {
        text: response.text,
        conversationId: conversation.id,
        model: modelConfig.name,
        toolCalls: toolResults,
        usage: response.usage,
        cost,
        responseTimeMs: responseTime,
        ragSources: ragContext.sources,
      };
    } catch (error) {
      console.error('Error in agent orchestrator:', error);
      throw error;
    }
  }

  /**
   * Construye contexto estructurado del email
   */
  private buildEmailContext(email: any): string {
    const tags = email.tags.map((et: any) => et.tag.name).join(', ');

    let context = `## Email Information:\n`;
    context += `- Subject: ${email.subject}\n`;
    context += `- From: ${email.from} (${email.fromEmail})\n`;
    context += `- To: ${email.to}\n`;
    if (email.cc) context += `- CC: ${email.cc}\n`;
    context += `- Received: ${email.receivedAt.toLocaleString()}\n`;
    context += `- Status: ${email.status}\n`;
    if (email.priority) context += `- Priority: ${email.priority}\n`;
    if (tags) context += `- Tags: ${tags}\n`;

    if (email.case) {
      context += `\n## Existing Case:\n`;
      context += `- Title: ${email.case.title}\n`;
      context += `- Status: ${email.case.status}\n`;
      if (email.case.resolution) {
        context += `- Resolution: ${email.case.resolution}\n`;
      }
    }

    context += `\n## Email Content:\n${email.bodyText || email.bodyPreview || 'No content'}`;

    return context;
  }
}
