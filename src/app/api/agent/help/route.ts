import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ClaudeClient } from '@/lib/agent/models/claude-client';
import { RAGPipeline } from '@/lib/agent/rag/rag-pipeline';
import { AgentConfig } from '@/lib/agent/types/agent-types';

// Configuración para el agente de ayuda
const agentConfig: AgentConfig = {
  models: {
    haiku: process.env.DEFAULT_FAST_MODEL || 'claude-3-5-haiku-20241022',
    sonnet: process.env.DEFAULT_QUALITY_MODEL || 'claude-3-5-sonnet-20241022',
  },
  ragConfig: {
    knowledgeBase: {
      enabled: true,
      topK: 5,
      minSimilarity: 0.7,
    },
    historicalCases: {
      enabled: false, // No buscar casos en el chat de ayuda
      topK: 0,
      minConfidence: 0,
    },
    conversations: {
      enabled: false, // No buscar conversaciones en el chat de ayuda
      topK: 0,
    },
    reranking: {
      enabled: true,
      topK: 3,
    },
  },
};

const systemPrompt = `Eres el asistente de ayuda de PolarisAI Inbox Copilot, una aplicación de gestión de soporte por correo electrónico con IA.

Tu función es ayudar a los usuarios a entender y usar la aplicación respondiendo preguntas sobre:
- Cómo funciona la aplicación
- Cómo usar las diferentes funcionalidades
- Solución de problemas comunes
- Mejores prácticas para aprovechar al máximo el sistema
- Explicación de características y configuraciones

Tienes acceso a la documentación completa de la aplicación a través del sistema RAG. Usa esta información para dar respuestas precisas y útiles.

Pautas de respuesta:
- Sé conciso pero completo
- Usa ejemplos prácticos cuando sea útil
- Si no estás seguro, indica que el usuario puede consultar la documentación completa
- Sugiere funcionalidades relacionadas que puedan ser útiles
- Usa un tono amigable y profesional
- Responde en español a menos que el usuario escriba en otro idioma`;

/**
 * POST /api/agent/help
 * Chat de ayuda general sobre la aplicación
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const startTime = Date.now();

    // Buscar en la base de conocimientos (documentación)
    const ragPipeline = new RAGPipeline(agentConfig.ragConfig);

    let ragContext;
    try {
      ragContext = await ragPipeline.retrieve({
        query: message,
        emailId: null, // No hay email asociado
        userId: session.user.id,
        conversationHistory: [],
      });
      console.log(`Help RAG retrieved ${ragContext.sources.length} docs`);
    } catch (error) {
      console.error('Error in help RAG:', error);
      ragContext = {
        sources: [],
        context: '',
        complexity: 0.5,
        needsReasoning: false,
      };
    }

    // Construir prompt con RAG context
    const ragPrompt = ragContext.context
      ? `\n\nDocumentación relevante:\n${ragContext.context}`
      : '';

    const userMessage = `${message}${ragPrompt}`;

    // Llamar a Claude
    const claudeClient = new ClaudeClient();
    const response = await claudeClient.chat({
      model: agentConfig.models.sonnet as any, // Usar Sonnet para calidad en ayuda
      messages: [
        {
          role: 'user' as const,
          content: userMessage,
        },
      ],
      tools: [], // Sin herramientas en el chat de ayuda
      maxTokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
    });

    const responseTime = Date.now() - startTime;

    // Guardar métricas
    await prisma.agentMetrics.create({
      data: {
        conversationId: conversationId || null,
        userId: session.user.id,
        model: agentConfig.models.sonnet,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: (response.usage.inputTokens * 0.000003 + response.usage.outputTokens * 0.000015), // Sonnet pricing
        responseTimeMs: responseTime,
        toolsUsed: JSON.stringify([]),
        ragSources: JSON.stringify(
          ragContext.sources.map((s) => ({
            source: s.source,
            score: s.score,
          }))
        ),
      },
    });

    return NextResponse.json({
      text: response.text,
      model: agentConfig.models.sonnet,
      usage: response.usage,
      responseTimeMs: responseTime,
      ragSources: ragContext.sources,
    });
  } catch (error) {
    console.error('Error in help agent:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
