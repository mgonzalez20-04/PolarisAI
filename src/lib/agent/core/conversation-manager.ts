import { prisma } from '@/lib/prisma';
import { Conversation, Message } from '../types/conversation-types';
import { ClaudeClient } from '../models/claude-client';
import { TokenCounter } from './token-counter';
import { v4 as uuidv4 } from 'uuid';

export class ConversationManager {
  private tokenCounter: TokenCounter;
  private claudeClient: ClaudeClient;

  constructor() {
    this.tokenCounter = new TokenCounter();
    this.claudeClient = new ClaudeClient();
  }

  /**
   * Carga conversación existente o crea una nueva
   * AHORRO DE COSTOS: reutiliza conversaciones existentes
   */
  async loadOrCreate(emailId: string, userId: string): Promise<Conversation> {
    // Buscar conversación existente para este email
    const existing = await prisma.agentConversation.findFirst({
      where: { emailId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          where: {
            // No incluir mensajes archivados del resumen
            OR: [
              { metadata: null },
              { metadata: { not: { contains: '"archived":true' } } }
            ]
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });

    if (existing) {
      const messages: Message[] = existing.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
        metadata: m.metadata ? JSON.parse(m.metadata) : undefined,
      }));

      const tokenCount = this.tokenCounter.count(messages.map(m => ({ content: m.content })));

      return {
        id: existing.id,
        emailId: existing.emailId,
        userId: existing.userId,
        messages,
        summary: existing.summary || undefined,
        tokenCount,
      };
    }

    // Crear nueva conversación
    const sessionId = uuidv4();
    const conversation = await prisma.agentConversation.create({
      data: {
        emailId,
        userId,
        sessionId,
        tokenCount: 0,
      },
      include: { messages: true },
    });

    return {
      id: conversation.id,
      emailId,
      userId,
      messages: [],
      tokenCount: 0,
    };
  }

  /**
   * Resumen automático cuando >8K tokens
   * AHORRO DE COSTOS: reduce context window
   */
  async summarize(conversationId: string): Promise<void> {
    const conversation = await prisma.agentConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) return;

    // Obtener mensajes no archivados
    const activeMessages = conversation.messages.filter((m) => {
      if (!m.metadata) return true;
      const meta = JSON.parse(m.metadata);
      return !meta.archived;
    });

    if (activeMessages.length === 0) return;

    // Usar Claude Haiku para resumir (rápido y barato)
    const summary = await this.claudeClient.summarize({
      messages: activeMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      model: process.env.DEFAULT_FAST_MODEL || 'claude-3-5-haiku-20241022',
      maxTokens: 500,
    });

    // Guardar resumen y marcar mensajes antiguos como archivados
    await prisma.$transaction([
      prisma.agentConversation.update({
        where: { id: conversationId },
        data: {
          summary: summary.text,
          lastSummarizedAt: new Date(),
        },
      }),

      // Marcar todos los mensajes actuales como archivados excepto los últimos 5
      ...activeMessages.slice(0, -5).map((msg) =>
        prisma.agentMessage.update({
          where: { id: msg.id },
          data: {
            metadata: JSON.stringify({
              ...(msg.metadata ? JSON.parse(msg.metadata) : {}),
              archived: true,
            }),
          },
        })
      ),
    ]);

    console.log(`Conversation ${conversationId} summarized. Summary: ${summary.text.substring(0, 100)}...`);
  }

  /**
   * Agrega mensajes a una conversación
   */
  async addMessages(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    await prisma.agentMessage.createMany({
      data: messages.map((msg) => ({
        conversationId,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
        metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
        tokenCount: this.tokenCounter.count(msg.content),
      })),
    });

    // Actualizar token count de la conversación
    const allMessages = await prisma.agentMessage.findMany({
      where: {
        conversationId,
        OR: [
          { metadata: null },
          { metadata: { not: { contains: '"archived":true' } } }
        ]
      },
    });

    const tokenCount = this.tokenCounter.count(
      allMessages.map(m => ({ content: m.content }))
    );

    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: {
        tokenCount,
        updatedAt: new Date(),
      },
    });

    // Verificar si necesita resumen
    if (this.tokenCounter.needsSummary(tokenCount)) {
      await this.summarize(conversationId);
    }
  }

  /**
   * Obtiene el contexto de una conversación para el prompt
   */
  async getContext(conversationId: string): Promise<string> {
    const conversation = await prisma.agentConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          where: {
            OR: [
              { metadata: null },
              { metadata: { not: { contains: '"archived":true' } } }
            ]
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) return '';

    let context = '';

    // Incluir resumen si existe
    if (conversation.summary) {
      context += `Previous conversation summary:\n${conversation.summary}\n\n`;
    }

    // Incluir mensajes recientes
    if (conversation.messages.length > 0) {
      context += 'Recent messages:\n';
      conversation.messages.forEach((msg) => {
        context += `${msg.role}: ${msg.content}\n`;
      });
    }

    return context;
  }
}
